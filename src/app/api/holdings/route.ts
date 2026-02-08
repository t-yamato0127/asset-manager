// API route for fetching portfolio data
import { NextResponse } from 'next/server';

// Sample data - in production, this would come from Google Sheets
const sampleHoldings = [
    {
        id: '1',
        symbol: '7203.T',
        name: 'トヨタ自動車',
        category: 'domestic_stock',
        quantity: 100,
        avgCost: 2400,
        currency: 'JPY',
        accountType: 'specific',
        createdAt: '2024-01-15',
    },
    {
        id: '2',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        category: 'us_stock',
        quantity: 50,
        avgCost: 150,
        currency: 'USD',
        accountType: 'nisa',
        createdAt: '2024-02-01',
    },
    {
        id: '3',
        symbol: '9984.T',
        name: 'ソフトバンクグループ',
        category: 'domestic_stock',
        quantity: 200,
        avgCost: 6500,
        currency: 'JPY',
        accountType: 'specific',
        createdAt: '2024-03-10',
    },
];

export async function GET() {
    try {
        // In production:
        // import { getHoldings, getLatestPrices, getLatestExchangeRate } from '@/lib/googleSheets';
        // const holdings = await getHoldings();
        // const prices = await getLatestPrices();
        // const exchangeRate = await getLatestExchangeRate();

        return NextResponse.json({
            holdings: sampleHoldings,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching holdings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch holdings' },
            { status: 500 }
        );
    }
}
