const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

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

async function main() {
    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(envVars['GOOGLE_CREDENTIALS']),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = envVars['GOOGLE_SPREADSHEET_ID'];

    const newRows = [
        ['DUOL', 'デュオリンゴ', 'us_stock', '30', '100.55', 'USD', 'nisa', 'SBI証券'],
        ['IBM', 'IBM', 'us_stock', '10', '235', 'USD', 'nisa', 'SBI証券'],
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'holdings!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: newRows },
    });
    console.log('Added: DUOL デュオリンゴ, IBM');

    // Verify all US stocks
    const data = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'holdings!A:H' });
    const rows = data.data.values || [];
    console.log('\n=== SBI証券 米国株式 ===');
    rows.forEach((row, i) => {
        if (i === 0) return;
        if (row[2] === 'us_stock' && row[7] === 'SBI証券') {
            console.log(`  [${row[6]}] ${row[0]} ${row[1]}: ${row[3]}株 @$${row[4]}`);
        }
    });
}

main().catch(console.error);
