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

// Fetch Japanese mutual fund NAV from Yahoo Finance Japan
export async function fetchMutualFundNAV(fundCode: string): Promise<StockQuote | null> {
    try {
        const url = `https://finance.yahoo.co.jp/quote/${encodeURIComponent(fundCode)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'ja,en;q=0.9',
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch mutual fund ${fundCode}: ${response.status}`);
            return null;
        }

        const html = await response.text();

        // Extract NAV (基準価額) from the HTML
        // Yahoo Finance Japan uses specific patterns for displaying fund NAV
        // Pattern 1: Look for the main price display
        const priceMatch = html.match(/class="[^"]*StyledNumber[^"]*"[^>]*>([0-9,]+)<\/span>/);
        // Pattern 2: Alternative price pattern
        const priceMatch2 = html.match(/<span[^>]*>([0-9,]+)<\/span>\s*円/);
        // Pattern 3: Look for data in meta tags or structured data
        const priceMatch3 = html.match(/基準価額[^0-9]*([0-9,]+)\s*円/);
        // Pattern 4: og:description often contains the price
        const ogMatch = html.match(/content="[^"]*基準価額\s*([0-9,]+)/);
        // Pattern 5: JSON-LD or data attributes
        const dataMatch = html.match(/data-(?:price|value)="([0-9,]+)"/);

        let price = 0;
        for (const match of [priceMatch, priceMatch2, priceMatch3, ogMatch, dataMatch]) {
            if (match && match[1]) {
                const extracted = parseFloat(match[1].replace(/,/g, ''));
                if (extracted > 0) {
                    price = extracted;
                    break;
                }
            }
        }

        if (price === 0) {
            console.error(`Could not parse NAV for ${fundCode} from HTML`);
            return null;
        }

        // Extract fund name
        const nameMatch = html.match(/<title>([^【]+)/);
        const name = nameMatch ? nameMatch[1].trim() : fundCode;

        // Try to extract previous close / change
        const changeMatch = html.match(/前日比[^0-9+-]*([+-]?[0-9,]+)/);
        const change = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0;
        const previousClose = price - change;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        return {
            symbol: fundCode,
            name,
            price,
            previousClose,
            change,
            changePercent,
            currency: 'JPY',
        };
    } catch (error) {
        console.error(`Error fetching mutual fund NAV for ${fundCode}:`, error);
        return null;
    }
}

// Check if a symbol is a Japanese mutual fund code
function isMutualFundCode(symbol: string): boolean {
    // Japanese mutual fund codes: alphanumeric, 8+ chars, contain letters
    // Examples: 9331107A, 47316169, AW31122B
    return /^[A-Za-z0-9]{8,}$/.test(symbol) && /[A-Za-z]/.test(symbol);
}

// Batch fetch multiple stock prices (handles both stocks and mutual funds)
export async function fetchMultipleStockPrices(
    symbols: string[]
): Promise<Map<string, StockQuote>> {
    const results = new Map<string, StockQuote>();

    // Separate mutual funds from stocks
    const mutualFunds = symbols.filter(s => isMutualFundCode(s));
    const stocks = symbols.filter(s => !isMutualFundCode(s));

    // Fetch stocks via Yahoo Finance v8 API
    const batchSize = 5;
    for (let i = 0; i < stocks.length; i += batchSize) {
        const batch = stocks.slice(i, i + batchSize);

        const promises = batch.map(symbol => fetchStockPriceV8(symbol));
        const batchResults = await Promise.all(promises);

        batchResults.forEach(result => {
            if (result) {
                results.set(result.symbol, result);
            }
        });

        // Small delay between batches to respect rate limits
        if (i + batchSize < stocks.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    // Fetch mutual fund NAVs from Yahoo Finance Japan
    for (let i = 0; i < mutualFunds.length; i += batchSize) {
        const batch = mutualFunds.slice(i, i + batchSize);

        const promises = batch.map(code => fetchMutualFundNAV(code));
        const batchResults = await Promise.all(promises);

        batchResults.forEach(result => {
            if (result) {
                results.set(result.symbol, result);
            }
        });

        if (i + batchSize < mutualFunds.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return results;
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
