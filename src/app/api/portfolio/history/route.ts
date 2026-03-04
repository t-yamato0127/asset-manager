// API route for portfolio value history chart data
import { NextRequest, NextResponse } from 'next/server';
import { getPriceHistory, getHoldings, getExchangeRates } from '@/lib/googleSheets';
import { fetchMultipleStockPrices, fetchMutualFundNAV } from '@/lib/stockApi';
import { fetchUsdJpyRate } from '@/lib/exchangeRate';

// Fund code map (same as portfolio route)
const FUND_CODE_MAP: Record<string, string> = {
    'capital-world': '9331107A',
    'ghq-dist': '47316169',
    'ghq-reinv': '47316169',
    'trowe-allcap': 'AW31122B',
    'capital-ica': '93311181',
    'pictet-gold': '42312199',
    'ifree-fang': '04311181',
    'emaxis-ac-general': '0331418A',
    'emaxis-ac-nisa': '0331418A',
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '365');

    try {
        const holdings = await getHoldings();
        if (holdings.length === 0) {
            return NextResponse.json({ history: [] });
        }

        // Get price history and exchange rates from Sheets
        const priceHistory = await getPriceHistory(undefined, days * holdings.length);
        const exchangeRates = await getExchangeRates(days);

        // Build exchange rate lookup by date
        const rateByDate = new Map<string, number>();
        for (const r of exchangeRates) {
            rateByDate.set(r.date, r.usdJpy);
        }

        // Build price lookup: date -> symbol -> price
        const priceByDateSymbol = new Map<string, Map<string, number>>();
        for (const p of priceHistory) {
            if (!priceByDateSymbol.has(p.date)) {
                priceByDateSymbol.set(p.date, new Map());
            }
            priceByDateSymbol.get(p.date)!.set(p.symbol, p.price);
        }

        // Get all unique dates, sorted ascending
        const allDates = Array.from(priceByDateSymbol.keys()).sort();

        // Calculate historical portfolio values
        const lastKnownPrice = new Map<string, number>();
        const history: { date: string; value: number }[] = [];
        let lastRate = exchangeRates.length > 0 ? exchangeRates[0].usdJpy : 150;

        for (const date of allDates) {
            const dayPrices = priceByDateSymbol.get(date)!;
            for (const [symbol, price] of dayPrices) {
                lastKnownPrice.set(symbol, price);
            }
            const rate = rateByDate.get(date) || lastRate;
            lastRate = rate;

            let totalJPY = 0;
            for (const h of holdings) {
                const price = lastKnownPrice.get(h.symbol);
                if (price !== undefined) {
                    const value = price * h.quantity;
                    totalJPY += h.currency === 'USD' ? value * rate : value;
                } else {
                    const value = h.avgCost * h.quantity;
                    totalJPY += h.currency === 'USD' ? value * rate : value;
                }
            }

            history.push({ date, value: Math.round(totalJPY) });
        }

        // Always add today's live value as the latest data point
        const today = new Date().toISOString().split('T')[0];
        const lastEntry = history.length > 0 ? history[history.length - 1] : null;

        if (!lastEntry || lastEntry.date !== today) {
            try {
                // Fetch current prices for today's value
                const stockSymbols = holdings
                    .filter(h => h.category !== 'mutual_fund')
                    .map(h => h.symbol);

                const currentPrices = new Map<string, number>();

                if (stockSymbols.length > 0) {
                    const stockPrices = await fetchMultipleStockPrices(stockSymbols);
                    for (const [sym, data] of stockPrices) {
                        currentPrices.set(sym, data.price);
                    }
                }

                // Fetch mutual fund NAVs
                const mutualFunds = holdings.filter(h => h.category === 'mutual_fund');
                for (const fund of mutualFunds) {
                    const fundCode = FUND_CODE_MAP[fund.id] || FUND_CODE_MAP[fund.symbol];
                    if (fundCode) {
                        try {
                            const nav = await fetchMutualFundNAV(fundCode);
                            if (nav?.price) currentPrices.set(fund.symbol, nav.price);
                        } catch { /* skip */ }
                    }
                }

                // Get current exchange rate
                const rateData = await fetchUsdJpyRate();
                const currentRate = rateData?.rate || lastRate;

                let todayTotal = 0;
                for (const h of holdings) {
                    const price = currentPrices.get(h.symbol) || h.avgCost;
                    const value = price * h.quantity;
                    todayTotal += h.currency === 'USD' ? value * currentRate : value;
                }

                history.push({ date: today, value: Math.round(todayTotal) });
            } catch (e) {
                console.error('Error fetching today\'s prices for history:', e);
            }
        }

        return NextResponse.json({
            history,
            totalDates: history.length,
        });
    } catch (error) {
        console.error('Error fetching portfolio history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch portfolio history' },
            { status: 500 }
        );
    }
}
