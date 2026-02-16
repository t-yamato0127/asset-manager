// Create transactions sheet and record the セガサミー sell
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
            value = value.slice(1, -1);
        }
        envVars[key] = value;
    }
});

const SPREADSHEET_ID = envVars['GOOGLE_SPREADSHEET_ID'];

async function main() {
    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(envVars['GOOGLE_CREDENTIALS']),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Check if transactions sheet exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existing = spreadsheet.data.sheets?.find(s => s.properties?.title === 'transactions');

    if (!existing) {
        console.log('Creating transactions sheet...');
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    addSheet: {
                        properties: { title: 'transactions' },
                    },
                }],
            },
        });
    } else {
        console.log('transactions sheet already exists');
    }

    // 2. Add header row
    // date, symbol, name, type, quantity, price, fees, realizedPL, currency, accountType, broker
    const header = ['date', 'symbol', 'name', 'type', 'quantity', 'price', 'fees', 'realizedPL', 'currency', 'accountType', 'broker'];
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'transactions!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [header] },
    });
    console.log('Header written');

    // 3. Record セガサミーHD sell
    // Bought at 2452, sold at 2630, 200 shares, NISA, SBI証券
    // Realized P&L = (2630 - 2452) × 200 = 35600
    const transaction = [
        '2026-02-16',    // date
        '6460.T',        // symbol
        'セガサミーHD',   // name
        'sell',          // type
        '200',           // quantity
        '2630',          // price
        '0',             // fees (NISA = no tax)
        '35600',         // realizedPL
        'JPY',           // currency
        'nisa',          // accountType
        'SBI証券',        // broker
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'transactions!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [transaction] },
    });
    console.log('Transaction recorded');

    // 4. Verify
    const verify = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'transactions!A1:K10',
    });
    const rows = verify.data.values || [];
    console.log(`\nTransactions sheet (${rows.length} rows):`);
    rows.forEach((row, i) => console.log(`  ${i}. ${row.join(', ')}`));
    console.log('\nDone!');
}

main().catch(console.error);
