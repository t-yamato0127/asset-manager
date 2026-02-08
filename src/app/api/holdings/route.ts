// API route for fetching portfolio data
import { NextResponse } from 'next/server';
import { getHoldings } from '@/lib/googleSheets';

// Sample data - fallback if Google Sheets fails
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
];

export async function GET() {
    try {
        // Try to fetch from Google Sheets
        const holdings = await getHoldings();

        // If we have data from Google Sheets, use it
        if (holdings && holdings.length > 0) {
            return NextResponse.json({
                holdings,
                source: 'google_sheets',
                updatedAt: new Date().toISOString(),
            });
        }

        // Fallback to sample data if no data in sheets
        return NextResponse.json({
            holdings: sampleHoldings,
            source: 'sample',
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching holdings:', error);

        // Return sample data on error
        return NextResponse.json({
            holdings: sampleHoldings,
            source: 'sample_fallback',
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date().toISOString(),
        });
    }
}
