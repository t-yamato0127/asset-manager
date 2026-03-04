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

    const sp = await sheets.spreadsheets.get({ spreadsheetId });
    const sh = sp.data.sheets.find(x => x.properties.title === 'transactions');
    const sheetId = sh.properties.sheetId;

    const d = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'transactions!A:B' });
    const rows = d.data.values || [];

    let delIdx = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i][1] === 'TEST.T') { delIdx = i; break; }
    }

    if (delIdx >= 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: delIdx, endIndex: delIdx + 1 } } }],
            },
        });
        console.log('Deleted TEST.T row at index', delIdx);
    } else {
        console.log('TEST.T not found');
    }

    // Show remaining
    const v = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'transactions!A:K' });
    (v.data.values || []).forEach((row, i) => console.log(`  ${i}: ${row.join(', ')}`));
}

main().catch(console.error);
