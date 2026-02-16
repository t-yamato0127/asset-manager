// Stock and Mutual Fund price fetching utilities
// Using Yahoo Finance for price data

interface YahooQuoteResult {
    regularMarketPrice?: number;
    regularMarketPreviousClose?: number;
    currency?: string;
    shortName?: string;
    longName?: string;
}

interface StockQuote {
    symbol: string;
    name: string;
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    currency: 'JPY' | 'USD';
}

// Fetch stock price from Yahoo Finance
export async function fetchStockPrice(symbol: string): Promise<StockQuote | null> {
    try {
        // Yahoo Finance API endpoint (using query2 for reliability)
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            next: { revalidate: 300 }, // Cache for 5 minutes
        });

        if (!response.ok) {
            console.error(`Failed to fetch ${symbol}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const priceData = data.quoteSummary?.result?.[0]?.price;

        if (!priceData) {
            return null;
        }

        const price = priceData.regularMarketPrice?.raw || 0;
        const previousClose = priceData.regularMarketPreviousClose?.raw || price;
        const change = price - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        return {
            symbol,
            name: priceData.longName || priceData.shortName || symbol,
            price,
            previousClose,
            change,
            changePercent,
            currency: priceData.currency === 'JPY' ? 'JPY' : 'USD',
        };
    } catch (error) {
        console.error(`Error fetching stock price for ${symbol}:`, error);
        return null;
    }
}

// Batch fetch multiple stock prices
export async function fetchMultipleStockPrices(
    symbols: string[]
): Promise<Map<string, StockQuote>> {
    const results = new Map<string, StockQuote>();

    // Process in batches of 5 to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);

        const promises = batch.map(symbol => fetchStockPriceV8(symbol));
        const batchResults = await Promise.all(promises);

        batchResults.forEach(result => {
            if (result) {
                results.set(result.symbol, result);
            }
        });

        // Small delay between batches to respect rate limits
        if (i + batchSize < symbols.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    return results;
}

// Alternative: Use Yahoo Finance v8 chart API for more reliable data
export async function fetchStockPriceV8(symbol: string): Promise<StockQuote | null> {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            next: { revalidate: 300 },
        });

        if (!response.ok) {
            console.error(`Failed to fetch ${symbol}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) {
            return null;
        }

        const meta = result.meta;
        const quotes = result.indicators?.quote?.[0];

        // Get today's close or current price
        const closes = quotes?.close || [];
        const price = meta.regularMarketPrice || closes[closes.length - 1] || 0;
        const previousClose = meta.previousClose || closes[closes.length - 2] || price;
        const change = price - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        return {
            symbol,
            name: meta.shortName || meta.longName || symbol,
            price,
            previousClose,
            change,
            changePercent,
            currency: meta.currency === 'JPY' ? 'JPY' : 'USD',
        };
    } catch (error) {
        console.error(`Error fetching stock price for ${symbol}:`, error);
        return null;
    }
}

// Symbol formatting helpers
export function formatJapaneseStockSymbol(code: string): string {
    // Add .T suffix for Tokyo Stock Exchange if not present
    if (/^\d{4}$/.test(code)) {
        return `${code}.T`;
    }
    return code;
}

export function formatUSStockSymbol(code: string): string {
    // US stocks typically don't need modification
    return code.toUpperCase();
}

// Mutual fund handling (Japanese investment trusts)
export function formatMutualFundSymbol(code: string): string {
    // Japanese mutual funds often need specific formatting
    // Format varies by fund company
    return code;
}

export type { StockQuote };
