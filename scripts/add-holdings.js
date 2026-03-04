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

    // Get the sheetId for 'holdings'
    const sp = await sheets.spreadsheets.get({ spreadsheetId });
    const holdingsSheet = sp.data.sheets.find(s => s.properties.title === 'holdings');
    const sheetId = holdingsSheet.properties.sheetId;

    // Delete row 55 (0-indexed row 54) - the newly added ブシロード
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId,
                        dimension: 'ROWS',
                        startIndex: 54, // 0-indexed, so row 55 in sheet
                        endIndex: 55,
                    },
                },
            }],
        },
    });
    console.log('Deleted row 55 (ブシロード 1000株 @250)');

    // Verify
    const verify = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'holdings!A50:H55',
    });
    console.log('\nRemaining rows (50-end):');
    (verify.data.values || []).forEach((row, i) => console.log(`  ${50 + i}: ${row.join(', ')}`));
}

main().catch(console.error);
