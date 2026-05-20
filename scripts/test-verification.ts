import { getHoldings } from '../src/lib/googleSheets';
import { fetchMultipleStockPrices, fetchMutualFundNAV } from '../src/lib/stockApi';

// Mapping copy from portfolio route
const FUND_CODE_MAP: Record<string, string> = {
    'capital-world': '9331107A',     // キャピタル世界株式ファンド
    'ghq-dist': '47316169',          // グロハイクオリティ成長(受取)
    'ghq-reinv': '47316169',         // グロハイクオリティ成長(再投資) - same NAV
    'trowe-allcap': 'AW31122B',      // T.ロウ・プライス米国オールキャップ
    'capital-ica': '93311181',        // キャピタルICA
    'pictet-gold': '42312199',       // ピクテ・ゴールド(為替ヘッジなし)
    'ifree-fang': '04311181',        // iFreeNEXT FANG+インデックス
    'emaxis-ac-general': '9I312179', // 楽天・全米株式(楽天・VTI)
    'emaxis-ac-nisa': '03311187',    // eMAXIS Slim 米国株式(S&P500)
};

function normalizeSymbolForPriceLookup(symbol: string): string {
    const match = symbol.match(/^(\d{4}[A-Za-z]?\.T)/);
    return match ? match[1] : symbol;
}

async function main() {
    console.log('=== START VERIFICATION ===');
    try {
        console.log('1. Fetching holdings from Google Sheets...');
        const holdings = await getHoldings();
        console.log(`Successfully fetched ${holdings.length} holdings from Google Sheets.`);
        
        // Count by broker
        const brokerCounts: Record<string, number> = {};
        holdings.forEach(h => {
            const b = h.broker || 'Unknown';
            brokerCounts[b] = (brokerCounts[b] || 0) + 1;
        });
        console.log('Holdings by broker:', brokerCounts);

        // Separate categories
        const mutualFunds = holdings.filter(h => h.category === 'mutual_fund');
        const stocks = holdings.filter(h => h.category !== 'mutual_fund');
        console.log(`Mutual Funds: ${mutualFunds.length}, Stocks: ${stocks.length}`);

        console.log('\n2. Testing Stock Price Fetching...');
        const symbolToNormalized = new Map<string, string>();
        stocks.forEach(h => {
            symbolToNormalized.set(h.symbol, normalizeSymbolForPriceLookup(h.symbol));
        });
        const uniqueNormalizedSymbols = [...new Set(symbolToNormalized.values())];
        console.log(`Unique normalized stock symbols to fetch: ${uniqueNormalizedSymbols.length}`);

        const stockQuotes = await fetchMultipleStockPrices(uniqueNormalizedSymbols);
        console.log(`Fetched ${stockQuotes.size} stock quotes.`);

        // Check if any stocks failed
        const failedStocks: string[] = [];
        uniqueNormalizedSymbols.forEach(sym => {
            if (!stockQuotes.has(sym)) {
                failedStocks.push(sym);
            }
        });
        if (failedStocks.length > 0) {
            console.log('⚠️ Failed to fetch prices for the following stocks:', failedStocks);
        } else {
            console.log('✅ All stock prices fetched successfully!');
        }

        console.log('\n3. Testing Mutual Fund NAV Fetching (Yahoo Finance Japan scraping)...');
        for (const fund of mutualFunds) {
            console.log(`\nTesting Fund: "${fund.name}" (Symbol: ${fund.symbol}, Broker: ${fund.broker})`);
            
            let fundCode = '';
            const match = fund.symbol.match(/^(\d{8}|[0-9A-Z]{8})/);
            if (match) {
                fundCode = match[1];
            } else if (FUND_CODE_MAP[fund.id] || FUND_CODE_MAP[fund.symbol]) {
                fundCode = FUND_CODE_MAP[fund.id] || FUND_CODE_MAP[fund.symbol];
            }

            if (!fundCode) {
                console.log(`❌ No fund code mapped for Symbol: ${fund.symbol}, ID: ${fund.id}`);
                continue;
            }

            console.log(`  -> Mapped Fund Code: ${fundCode}`);
            try {
                const navData = await fetchMutualFundNAV(fundCode);
                if (navData) {
                    console.log(`  ✅ Mapped Fund Code: ${fundCode} -> Price: ${navData.price} 円, PrevClose: ${navData.previousClose} 円, Name: "${navData.name}"`);
                    const diff = navData.price - fund.avgCost;
                    const pl = diff * fund.quantity;
                    console.log(`     Calculated P&L: AvgCost=${fund.avgCost}, Qty=${fund.quantity} -> CurrentValue=${navData.price * fund.quantity} 円, P&L=${pl} 円 (${((diff/fund.avgCost)*100).toFixed(2)}%)`);
                } else {
                    console.log(`  ❌ Failed to fetch/parse NAV for Fund Code: ${fundCode}`);
                }
            } catch (e: any) {
                console.error(`  ❌ Error fetching fund ${fundCode}:`, e.message);
            }
        }

    } catch (error: any) {
        console.error('Fatal error during verification:', error);
    }
}

main();
