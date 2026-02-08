// Google Sheets API wrapper for asset management data
import { google, sheets_v4 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Initialize Google Sheets API client
function getAuth() {
    const credentials = process.env.GOOGLE_CREDENTIALS;
    if (!credentials) {
        throw new Error('GOOGLE_CREDENTIALS environment variable is not set');
    }

    const parsed = JSON.parse(credentials);
    return new google.auth.GoogleAuth({
        credentials: parsed,
        scopes: SCOPES,
    });
}

function getSheets(): sheets_v4.Sheets {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// Sheet names
const SHEETS = {
    HOLDINGS: 'holdings',
    PRICE_HISTORY: 'price_history',
    TRANSACTIONS: 'transactions',
    EXCHANGE_RATES: 'exchange_rates',
    OTHER_ASSETS: 'other_assets',
    DIVIDENDS: 'dividends',
} as const;

// Generic read function
export async function readSheet(sheetName: string, range?: string): Promise<string[][]> {
    if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SPREADSHEET_ID environment variable is not set');
    }

    const sheets = getSheets();
    const fullRange = range ? `${sheetName}!${range}` : sheetName;

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: fullRange,
    });

    return response.data.values || [];
}

// Generic write function
export async function writeSheet(
    sheetName: string,
    values: (string | number)[][],
    range?: string
): Promise<void> {
    if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SPREADSHEET_ID environment variable is not set');
    }

    const sheets = getSheets();
    const fullRange = range ? `${sheetName}!${range}` : sheetName;

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: fullRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values,
        },
    });
}

// Append row function
export async function appendToSheet(
    sheetName: string,
    values: (string | number)[][]
): Promise<void> {
    if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SPREADSHEET_ID environment variable is not set');
    }

    const sheets = getSheets();

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values,
        },
    });
}

// Holdings specific functions
export async function getHoldings() {
    const data = await readSheet(SHEETS.HOLDINGS);
    if (data.length <= 1) return []; // No data or only header

    const [, ...rows] = data; // Skip header
    return rows.map(row => ({
        id: row[0] || '',
        symbol: row[1] || '',
        name: row[2] || '',
        category: row[3] as 'domestic_stock' | 'us_stock' | 'mutual_fund',
        quantity: parseFloat(row[4]) || 0,
        avgCost: parseFloat(row[5]) || 0,
        currency: (row[6] || 'JPY') as 'JPY' | 'USD',
        accountType: (row[7] || 'specific') as 'nisa' | 'specific' | 'general',
        createdAt: row[8] || new Date().toISOString(),
    }));
}

// Price history functions
export async function getPriceHistory(symbol?: string, days: number = 30) {
    const data = await readSheet(SHEETS.PRICE_HISTORY);
    if (data.length <= 1) return [];

    const [, ...rows] = data;
    let prices = rows.map(row => ({
        date: row[0] || '',
        symbol: row[1] || '',
        price: parseFloat(row[2]) || 0,
        currency: (row[3] || 'JPY') as 'JPY' | 'USD',
    }));

    if (symbol) {
        prices = prices.filter(p => p.symbol === symbol);
    }

    // Sort by date descending and limit
    prices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return prices.slice(0, days);
}

// Get latest prices for all symbols
export async function getLatestPrices(): Promise<Map<string, { price: number; currency: string }>> {
    const data = await readSheet(SHEETS.PRICE_HISTORY);
    if (data.length <= 1) return new Map();

    const [, ...rows] = data;
    const priceMap = new Map<string, { price: number; currency: string; date: string }>();

    rows.forEach(row => {
        const symbol = row[1];
        const date = row[0];
        const existing = priceMap.get(symbol);

        if (!existing || new Date(date) > new Date(existing.date)) {
            priceMap.set(symbol, {
                price: parseFloat(row[2]) || 0,
                currency: row[3] || 'JPY',
                date,
            });
        }
    });

    return new Map(
        Array.from(priceMap.entries()).map(([symbol, data]) => [
            symbol,
            { price: data.price, currency: data.currency }
        ])
    );
}

// Transactions functions
export async function getTransactions(year?: number) {
    const data = await readSheet(SHEETS.TRANSACTIONS);
    if (data.length <= 1) return [];

    const [, ...rows] = data;
    let transactions = rows.map(row => ({
        id: row[0] || '',
        date: row[1] || '',
        symbol: row[2] || '',
        name: row[3] || '',
        type: row[4] as 'buy' | 'sell',
        quantity: parseFloat(row[5]) || 0,
        price: parseFloat(row[6]) || 0,
        fees: parseFloat(row[7]) || 0,
        realizedPL: row[8] ? parseFloat(row[8]) : undefined,
        currency: (row[9] || 'JPY') as 'JPY' | 'USD',
    }));

    if (year) {
        transactions = transactions.filter(t =>
            new Date(t.date).getFullYear() === year
        );
    }

    return transactions;
}

// Exchange rates functions
export async function getExchangeRates(days: number = 30) {
    const data = await readSheet(SHEETS.EXCHANGE_RATES);
    if (data.length <= 1) return [];

    const [, ...rows] = data;
    const rates = rows.map(row => ({
        date: row[0] || '',
        usdJpy: parseFloat(row[1]) || 0,
    }));

    rates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rates.slice(0, days);
}

export async function getLatestExchangeRate(): Promise<number> {
    const rates = await getExchangeRates(1);
    return rates.length > 0 ? rates[0].usdJpy : 150; // Default fallback
}

// Other assets functions
export async function getOtherAssets() {
    const data = await readSheet(SHEETS.OTHER_ASSETS);
    if (data.length <= 1) return [];

    const [, ...rows] = data;
    return rows.map(row => ({
        id: row[0] || '',
        type: row[1] as 'cash' | 'bond' | 'real_estate' | 'crypto' | 'insurance' | 'pension',
        name: row[2] || '',
        value: parseFloat(row[3]) || 0,
        currency: (row[4] || 'JPY') as 'JPY' | 'USD',
        updatedAt: row[5] || new Date().toISOString(),
    }));
}

// Dividends functions
export async function getDividends(year?: number) {
    const data = await readSheet(SHEETS.DIVIDENDS);
    if (data.length <= 1) return [];

    const [, ...rows] = data;
    let dividends = rows.map(row => ({
        id: row[0] || '',
        date: row[1] || '',
        symbol: row[2] || '',
        name: row[3] || '',
        amount: parseFloat(row[4]) || 0,
        currency: (row[5] || 'JPY') as 'JPY' | 'USD',
    }));

    if (year) {
        dividends = dividends.filter(d =>
            new Date(d.date).getFullYear() === year
        );
    }

    return dividends;
}

// Save new price data
export async function savePriceData(
    symbol: string,
    price: number,
    currency: 'JPY' | 'USD',
    date?: string
) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    await appendToSheet(SHEETS.PRICE_HISTORY, [[dateStr, symbol, price, currency]]);
}

// Save exchange rate
export async function saveExchangeRate(rate: number, date?: string) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    await appendToSheet(SHEETS.EXCHANGE_RATES, [[dateStr, rate]]);
}

export { SHEETS };
