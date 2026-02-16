// Unified portfolio API - combines holdings, real-time prices, exchange rates, and calculations
import { NextResponse } from 'next/server';
import { getHoldings, getTransactions, getLatestPrices } from '@/lib/googleSheets';
import { fetchMultipleStockPrices, fetchMutualFundNAV } from '@/lib/stockApi';
import { fetchUsdJpyRate } from '@/lib/exchangeRate';
import {
    calculateHoldingsValue,
    generateCategorySummary,
    generatePortfolioSummary,
} from '@/lib/calculations';
import type { Holding, Transaction } from '@/types';

// Mapping: holding symbol -> Yahoo Finance Japan fund code
// Mutual funds share the same NAV regardless of distribution/reinvestment course
const FUND_CODE_MAP: Record<string, string> = {
    'capital-world': '9331107A',     // キャピタル世界株式ファンド
    'ghq-dist': '47316169',          // グロハイクオリティ成長(受取)
    'ghq-reinv': '47316169',         // グロハイクオリティ成長(再投資) - same NAV
    'trowe-allcap': 'AW31122B',      // T.ロウ・プライス米国オールキャップ
    'capital-ica': '93311181',        // キャピタルICA
    'pictet-gold': '42312199',       // ピクテ・ゴールド(為替ヘッジなし)
    'ifree-fang': '04311181',        // iFreeNEXT FANG+インデックス
    'emaxis-ac-general': '0331418A', // eMAXIS Slim 全世界株式(オールカントリー)
    'emaxis-ac-nisa': '0331418A',    // eMAXIS Slim 全世界株式(NISA) - same NAV
};

// Normalize symbol for Yahoo Finance API lookups
// e.g., '7034.T-sbi' → '7034.T' (remove broker suffix)
function normalizeSymbolForPriceLookup(symbol: string): string {
    const match = symbol.match(/^(\d{4}[A-Za-z]?\.T)/);
    return match ? match[1] : symbol;
}

export async function GET() {
    try {
        // 1. Fetch holdings and transactions from Google Sheets
        const [rawHoldings, rawTransactions] = await Promise.all([
            getHoldings(),
            getTransactions(),
        ]);

        if (!rawHoldings || rawHoldings.length === 0) {
            return NextResponse.json({
                holdings: [],
                transactions: [],
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
            broker: h.broker,
            createdAt: h.createdAt,
        }));

        // Convert raw transactions to Transaction type (ensure type safety)
        const transactions: Transaction[] = rawTransactions.map(t => ({
            ...t,
            // Ensure any optional fields are handled if needed
        }));

        // 2. Fetch real-time prices
        // Separate mutual funds from stocks
        const mutualFundHoldings = holdings.filter(h => h.category === 'mutual_fund');
        const stockHoldings = holdings.filter(h => h.category !== 'mutual_fund');

        let prices = new Map<string, { price: number; currency: string }>();
        let priceSource = 'yahoo_finance';
        const previousCloseMap = new Map<string, number>();

        try {
            // 2a. Fetch stock prices via Yahoo Finance v8 API
            if (stockHoldings.length > 0) {
                // Deduplicate symbols (e.g., 7203.T from both brokers, 7034.T-sbi → 7034.T)
                const symbolToNormalized = new Map<string, string>();
                stockHoldings.forEach(h => {
                    symbolToNormalized.set(h.symbol, normalizeSymbolForPriceLookup(h.symbol));
                });
                const uniqueNormalizedSymbols = [...new Set(symbolToNormalized.values())];

                const stockQuotes = await fetchMultipleStockPrices(uniqueNormalizedSymbols);

                // Map results back to all holding symbols (including suffixed ones)
                stockHoldings.forEach(h => {
                    const normalized = symbolToNormalized.get(h.symbol)!;
                    const quote = stockQuotes.get(normalized);
                    if (quote) {
                        prices.set(h.symbol, {
                            price: quote.price,
                            currency: quote.currency,
                        });
                        previousCloseMap.set(h.symbol, quote.previousClose);
                    }
                });
            }

            // 2b. Fetch mutual fund NAVs via Yahoo Finance Japan scraping
            if (mutualFundHoldings.length > 0) {
                const results = await Promise.all(mutualFundHoldings.map(async (fund) => {
                    // Check if we have a mapped code for this fund
                    // Handle duplicate funds (e.g. general/nisa same fund) by unique key? No, logic is per holding.
                    // But we can optimize to fetch unique codes only?
                    // For now, let's just fetch per fund. 
                    // Actually, fetchMutualFundNAV handles caching? No. 
                    // But duplicates are handled if we use map?
                    // Let's use basic loop for now.
                    let fundCode = '';
                    const match = fund.symbol.match(/^(\d{8}|[0-9A-Z]{8})/);
                    if (match) {
                        fundCode = match[1];
                    } else if (FUND_CODE_MAP[fund.id] || FUND_CODE_MAP[fund.symbol]) {
                        fundCode = FUND_CODE_MAP[fund.id] || FUND_CODE_MAP[fund.symbol];
                    }

                    if (fundCode) {
                        try {
                            const navData = await fetchMutualFundNAV(fundCode);
                            return { symbol: fund.symbol, ...navData };
                        } catch (e) {
                            console.error(`Failed to fetch NAV for ${fund.symbol}:`, e);
                            return null;
                        }
                    }
                    return null;
                }));

                results.forEach(res => {
                    if (res) {
                        prices.set(res.symbol, { price: res.price, currency: 'JPY' });
                        previousCloseMap.set(res.symbol, res.previousClose || 0);
                    }
                });
            }

            // If no prices at all, fall back
            if (prices.size === 0) {
                throw new Error('No price data obtained from any source');
            }

            // For any holdings that didn't get a price, use avgCost as fallback
            for (const h of holdings) {
                if (!prices.has(h.symbol)) {
                    prices.set(h.symbol, { price: h.avgCost, currency: h.currency });
                    console.warn(`No price for ${h.symbol}, using avgCost = ${h.avgCost} `);
                }
            }
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

        // 6. Build previous prices using real previousClose from Yahoo Finance
        const previousPrices = new Map<string, { price: number; currency: string }>();
        prices.forEach((priceData, symbol) => {
            const prevClose = previousCloseMap.get(symbol);
            previousPrices.set(symbol, {
                price: prevClose || priceData.price, // Use real previousClose if available
                currency: priceData.currency,
            });
        });

        // 7. Generate portfolio summary
        const summary = generatePortfolioSummary(
            holdings,
            [], // No other assets
            transactions, // Pass transactions
            [], // No dividends yet
            prices,
            previousPrices,
            usdJpyRate
        );

        // 8. Build enriched holdings for frontend
        const holdingsWithPrices = enrichedHoldings.map(h => {
            const priceData = prices.get(h.symbol);
            const currentPrice = priceData?.price || h.avgCost;
            const prevClose = previousCloseMap.get(h.symbol) || currentPrice;
            const dayChange = (currentPrice - prevClose) * h.quantity;
            const dayChangePercent = prevClose > 0
                ? ((currentPrice - prevClose) / prevClose) * 100
                : 0;
            return {
                ...h,
                currentPrice,
                totalValue: currentPrice * h.quantity,
                unrealizedPL: (currentPrice - h.avgCost) * h.quantity,
                unrealizedPLPercent: h.avgCost > 0
                    ? ((currentPrice - h.avgCost) / h.avgCost) * 100
                    : 0,
                dayChange,
                dayChangePercent,
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
