// Cron API route for automatic price updates
import { NextRequest, NextResponse } from 'next/server';
import { getHoldings, savePriceData, saveExchangeRate } from '@/lib/googleSheets';
import { fetchMultipleStockPrices } from '@/lib/stockApi';
import { fetchUsdJpyRate } from '@/lib/exchangeRate';

export async function GET(request: NextRequest) {
    // Verify cron secret (for Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        // 1. Get all holdings
        const holdings = await getHoldings();
        const symbols = holdings.map(h => h.symbol);

        // 2. Fetch current prices
        const prices = await fetchMultipleStockPrices(symbols);

        // 3. Save to Google Sheets
        const today = new Date().toISOString().split('T')[0];
        let savedCount = 0;
        for (const [symbol, data] of prices) {
            await savePriceData(symbol, data.price, data.currency as 'JPY' | 'USD', today);
            savedCount++;
        }

        // 4. Fetch and save exchange rate
        let exchangeRate: number | null = null;
        const rateData = await fetchUsdJpyRate();
        if (rateData) {
            await saveExchangeRate(rateData.rate, today);
            exchangeRate = rateData.rate;
        }

        return NextResponse.json({
            success: true,
            updatedSymbols: savedCount,
            totalSymbols: symbols.length,
            exchangeRate,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update prices' },
            { status: 500 }
        );
    }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
    return GET(request);
}
