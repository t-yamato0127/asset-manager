// API route for fetching stock prices
import { NextRequest, NextResponse } from 'next/server';
import { fetchStockPriceV8, fetchMultipleStockPrices } from '@/lib/stockApi';
import { savePriceData } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const symbols = searchParams.get('symbols');

    try {
        if (symbol) {
            // Single symbol
            const price = await fetchStockPriceV8(symbol);
            if (!price) {
                return NextResponse.json(
                    { error: `Price not found for ${symbol}` },
                    { status: 404 }
                );
            }
            return NextResponse.json(price);
        }

        if (symbols) {
            // Multiple symbols
            const symbolList = symbols.split(',').map(s => s.trim());
            const prices = await fetchMultipleStockPrices(symbolList);
            return NextResponse.json({
                prices: Object.fromEntries(prices),
                updatedAt: new Date().toISOString(),
            });
        }

        return NextResponse.json(
            { error: 'Please provide symbol or symbols parameter' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error fetching prices:', error);
        return NextResponse.json(
            { error: 'Failed to fetch prices' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { symbol, price, currency, date } = body;

        if (!symbol || price === undefined || !currency || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await savePriceData(symbol, Number(price), currency as 'JPY' | 'USD', date);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving manual price:', error);
        return NextResponse.json({ error: 'Failed to save price' }, { status: 500 });
    }
}
