const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Load environment variables from .env.local
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
        let key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
            value = value.slice(1, -1);
        }
        envVars[key] = value;
    }
});

async function getSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(envVars['GOOGLE_CREDENTIALS']),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
}

const SPREADSHEET_ID = envVars['GOOGLE_SPREADSHEET_ID'];

// ──────────────────────────────────
// 1. Setup: Create ai_advice sheet
// ──────────────────────────────────
async function setupSheet() {
    const sheets = await getSheets();

    // Check if sheet already exists
    const sp = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const exists = sp.data.sheets.some(s => s.properties.title === 'ai_advice');

    if (!exists) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{ addSheet: { properties: { title: 'ai_advice' } } }],
            },
        });
        console.log('Created ai_advice sheet');
    }

    // Write header row
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'ai_advice!A1:F1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [['date', 'totalValue', 'unrealizedPL', 'marketContext', 'advice', 'keyPoints']],
        },
    });
    console.log('Header row set');
}

// ──────────────────────────────────
// 2. Fetch portfolio summary
// ──────────────────────────────────
async function fetchPortfolioSummary() {
    const sheets = await getSheets();

    // Get holdings
    const holdingsData = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'holdings!A:H',
    });
    const rows = holdingsData.data.values || [];
    if (rows.length <= 1) return null;

    const [header, ...dataRows] = rows;
    const holdings = dataRows.map(row => ({
        symbol: row[0] || '',
        name: row[1] || '',
        category: row[2] || '',
        quantity: parseFloat(row[3]) || 0,
        avgCost: parseFloat(row[4]) || 0,
        currency: row[5] || 'JPY',
        accountType: row[6] || '',
        broker: row[7] || '',
    }));

    // Get transactions
    const txData = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'transactions!A:K',
    });
    const txRows = txData.data.values || [];
    const transactions = txRows.length > 1 ? txRows.slice(1) : [];

    // Categorize
    const domestic = holdings.filter(h => h.category === 'domestic_stock');
    const us = holdings.filter(h => h.category === 'us_stock');
    const funds = holdings.filter(h => h.category === 'mutual_fund');

    return { holdings, domestic, us, funds, transactions, totalCount: holdings.length };
}

// ──────────────────────────────────
// 3. Write advice to Sheets
// ──────────────────────────────────
async function writeAdvice({ totalValue, unrealizedPL, marketContext, advice, keyPoints }) {
    const sheets = await getSheets();
    const date = new Date().toISOString().split('T')[0];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'ai_advice!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[date, totalValue, unrealizedPL, marketContext, advice, keyPoints]],
        },
    });
    console.log(`Advice written for ${date}`);
}

// ──────────────────────────────────
// CLI
// ──────────────────────────────────
const command = process.argv[2] || 'help';

(async () => {
    switch (command) {
        case 'setup':
            await setupSheet();
            break;

        case 'fetch':
            const data = await fetchPortfolioSummary();
            if (!data) {
                console.log('No holdings data found');
                return;
            }
            console.log(`\n=== Portfolio Summary ===`);
            console.log(`Total holdings: ${data.totalCount}`);
            console.log(`  Domestic stocks: ${data.domestic.length}`);
            console.log(`  US stocks: ${data.us.length}`);
            console.log(`  Mutual funds: ${data.funds.length}`);
            console.log(`  Recent transactions: ${data.transactions.length}`);

            console.log(`\n--- Domestic Stocks ---`);
            data.domestic.forEach(h => console.log(`  ${h.symbol} ${h.name}: ${h.quantity}株 @${h.avgCost}円 [${h.accountType}] ${h.broker}`));

            console.log(`\n--- US Stocks ---`);
            data.us.forEach(h => console.log(`  ${h.symbol} ${h.name}: ${h.quantity}株 @$${h.avgCost} [${h.accountType}] ${h.broker}`));

            console.log(`\n--- Mutual Funds ---`);
            data.funds.forEach(h => console.log(`  ${h.symbol} ${h.name}: ${h.quantity}口 @${h.avgCost}円 [${h.accountType}] ${h.broker}`));

            if (data.transactions.length > 0) {
                console.log(`\n--- Recent Transactions ---`);
                data.transactions.forEach(t => console.log(`  ${t.join(', ')}`));
            }
            break;

        case 'write':
            // Used by the workflow to write advice
            // Reads from stdin as JSON
            let input = '';
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', chunk => input += chunk);
            process.stdin.on('end', async () => {
                try {
                    const advice = JSON.parse(input);
                    await writeAdvice(advice);
                } catch (e) {
                    console.error('Invalid JSON input:', e.message);
                }
            });
            break;

        default:
            console.log('Usage:');
            console.log('  node portfolio-advisor.js setup  - Create ai_advice sheet');
            console.log('  node portfolio-advisor.js fetch  - Fetch portfolio summary');
            console.log('  node portfolio-advisor.js write  - Write advice (JSON from stdin)');
    }
})().catch(console.error);
