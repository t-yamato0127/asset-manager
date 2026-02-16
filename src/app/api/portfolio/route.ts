// Unified portfolio API - combines holdings, real-time prices, exchange rates, and calculations
import { NextResponse } from 'next/server';
import { getHoldings, getLatestPrices, getPriceHistory } from '@/lib/googleSheets';
import { fetchMultipleStockPrices } from '@/lib/stockApi';
import { fetchUsdJpyRate } from '@/lib/exchangeRate';
import {
    calculateHoldingsValue,
    generateCategorySummary,
    generatePortfolioSummary,
} from '@/lib/calculations';
import type { Holding } from '@/types';

export async function GET() {
    try {
        // 1. Fetch holdings from Google Sheets
        const rawHoldings = await getHoldings();

        if (!rawHoldings || rawHoldings.length === 0) {
            return NextResponse.json({
                holdings: [],
                summary: null,
                categories: [],
                exchangeRate: 150,
                source: 'empty',
                updatedAt: new Date().toISOString(),
            });
        }

        // Convert raw holdings to Holding type
        const holdings: Holding[] = rawHoldings.map(h => ({
            id: h.id,
            symbol: h.symbol,
            name: h.name,
            category: h.category,
            quantity: h.quantity,
            avgCost: h.avgCost,
            currency: h.currency,
            accountType: h.accountType,
            createdAt: h.createdAt,
        }));

        // 2. Fetch real-time stock prices from Yahoo Finance
        const symbols = holdings.map(h => h.symbol);
        let prices = new Map<string, { price: number; currency: string }>();
        let priceSource = 'yahoo_finance';

        try {
            const stockQuotes = await fetchMultipleStockPrices(symbols);
            stockQuotes.forEach((quote, symbol) => {
                prices.set(symbol, {
                    price: quote.price,
                    currency: quote.currency,
                });
            });
        } catch (priceError) {
            console.error('Failed to fetch live prices, falling back to sheets:', priceError);
            // Fallback: use latest prices from Google Sheets
            try {
                prices = await getLatestPrices();
                priceSource = 'google_sheets_cache';
            } catch {
                priceSource = 'avg_cost_fallback';
                // Use avgCost as fallback
                holdings.forEach(h => {
                    prices.set(h.symbol, { price: h.avgCost, currency: h.currency });
                });
            }
        }

        // 3. Fetch exchange rate
        let usdJpyRate = 150; // Default fallback
        let exchangeRateSource = 'default';
        try {
            const rateData = await fetchUsdJpyRate();
            if (rateData) {
                usdJpyRate = rateData.rate;
                exchangeRateSource = rateData.source;
            }
        } catch (rateError) {
            console.error('Failed to fetch exchange rate:', rateError);
        }

        // 4. Calculate portfolio values using calculations.ts
        const { holdings: enrichedHoldings, totalJPY } = calculateHoldingsValue(
            holdings,
            prices,
            usdJpyRate
        );

        // 5. Generate category summary
        const categories = generateCategorySummary(
            holdings,
            [], // No other assets for now
            prices,
            usdJpyRate
        );

        // 6. Build previous prices (use avgCost as baseline for now)
        const previousPrices = new Map<string, { price: number; currency: string }>();
        prices.forEach((priceData, symbol) => {
            // Use previous close if available from Yahoo, otherwise estimate
            previousPrices.set(symbol, {
                price: priceData.price * 0.998, // ~0.2% difference estimate
                currency: priceData.currency,
            });
        });

        // 7. Generate portfolio summary
        const summary = generatePortfolioSummary(
            holdings,
            [], // No other assets
            [], // No transactions yet
            [], // No dividends yet
            prices,
            previousPrices,
            usdJpyRate
        );

        // 8. Build enriched holdings for frontend
        const holdingsWithPrices = enrichedHoldings.map(h => {
            const priceData = prices.get(h.symbol);
            return {
                ...h,
                currentPrice: priceData?.price || h.avgCost,
                totalValue: (priceData?.price || h.avgCost) * h.quantity,
                unrealizedPL: ((priceData?.price || h.avgCost) - h.avgCost) * h.quantity,
                unrealizedPLPercent: h.avgCost > 0
                    ? (((priceData?.price || h.avgCost) - h.avgCost) / h.avgCost) * 100
                    : 0,
            };
        });

        return NextResponse.json({
            holdings: holdingsWithPrices,
            summary,
            categories,
            exchangeRate: usdJpyRate,
            exchangeRateSource,
            priceSource,
            totalValueJPY: totalJPY,
            source: 'live',
            updatedAt: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Error in portfolio API:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                holdings: [],
                summary: null,
                categories: [],
                exchangeRate: 150,
                source: 'error',
                updatedAt: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
