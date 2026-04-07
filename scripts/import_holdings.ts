// @ts-nocheck
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function uploadHoldings() {
    const credsJson = process.env.GOOGLE_CREDENTIALS;
    if (!credsJson) throw new Error('GOOGLE_CREDENTIALS is not defined');
    const credentials = JSON.parse(credsJson);

    const auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID!, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['Holdings'];
    if (!sheet) throw new Error('Holdings sheet not found');

    // Clear existing rows
    await sheet.clearRows();

    const rawData = [
      { symbol: "capital-world", name: "キャピタル世界株式", category: "mutual_fund", quantity: 123.9348, avgCost: 24207, currency: "JPY", accountType: "specific", broker: "みずほ銀行" },
      { symbol: "ghq-dist", name: "グローバル・ハイクオリティ(受取)", category: "mutual_fund", quantity: 57.2261, avgCost: 52424, currency: "JPY", accountType: "specific", broker: "みずほ銀行" },
      { symbol: "ghq-reinv", name: "グローバル・ハイクオリティ(再投資)", category: "mutual_fund", quantity: 192.9925, avgCost: 36271, currency: "JPY", accountType: "specific", broker: "みずほ銀行" },
      { symbol: "trowe-allcap", name: "ティ・ロウ・プライス米国", category: "mutual_fund", quantity: 471.6602, avgCost: 16962, currency: "JPY", accountType: "specific", broker: "みずほ銀行" },
      { symbol: "capital-ica", name: "キャピタルICA", category: "mutual_fund", quantity: 169.6258, avgCost: 29477, currency: "JPY", accountType: "specific", broker: "みずほ銀行" },
      { symbol: "pictet-gold", name: "ピクテ・ゴールド", category: "mutual_fund", quantity: 24.5783, avgCost: 40687, currency: "JPY", accountType: "specific", broker: "みずほ銀行" },
      { symbol: "AVGO", name: "ブロードコム", category: "us_stock", quantity: 20, avgCost: 315.28, currency: "USD", accountType: "specific", broker: "SBI証券" },
      { symbol: "ONON", name: "オン ホールディング", category: "us_stock", quantity: 100, avgCost: 44.95, currency: "USD", accountType: "specific", broker: "SBI証券" },
      { symbol: "PANW", name: "パロアルト", category: "us_stock", quantity: 20, avgCost: 163.37, currency: "USD", accountType: "specific", broker: "SBI証券" },
      { symbol: "QCOM", name: "クアルコム", category: "us_stock", quantity: 44, avgCost: 160.89, currency: "USD", accountType: "specific", broker: "SBI証券" },
      { symbol: "GOLD", name: "バリック ゴールド", category: "us_stock", quantity: 280, avgCost: 21.20, currency: "USD", accountType: "nisa", broker: "SBI証券" },
      { symbol: "DUOL", name: "デュオリンゴ", category: "us_stock", quantity: 30, avgCost: 100.55, currency: "USD", accountType: "nisa", broker: "SBI証券" },
      { symbol: "IBM", name: "IBM", category: "us_stock", quantity: 10, avgCost: 235.00, currency: "USD", accountType: "nisa", broker: "SBI証券" },
      { symbol: "NOW", name: "サービスナウ", category: "us_stock", quantity: 90, avgCost: 118.12, currency: "USD", accountType: "nisa", broker: "SBI証券" },
      { symbol: "9984.T", name: "ソフトバンクG", category: "domestic_stock", quantity: 400, avgCost: 1391.00, currency: "JPY", accountType: "specific", broker: "楽天証券" },
      { symbol: "MRVL", name: "マーベル", category: "us_stock", quantity: 30, avgCost: 85.2946, currency: "USD", accountType: "specific", broker: "楽天証券" },
      { symbol: "emaxis-ac-general", name: "楽天VTI", category: "mutual_fund", quantity: 15.2433, avgCost: 19680.78, currency: "JPY", accountType: "specific", broker: "楽天証券" },
      { symbol: "emaxis-ac-nisa", name: "eMAXIS Slim SP500", category: "mutual_fund", quantity: 176.1286, avgCost: 22171.30, currency: "JPY", accountType: "specific", broker: "楽天証券" },
      { symbol: "3401.T", name: "帝人", category: "domestic_stock", quantity: 200, avgCost: 1448.00, currency: "JPY", accountType: "nisa", broker: "マネックス証券" },
      { symbol: "3405.T", name: "クラレ", category: "domestic_stock", quantity: 200, avgCost: 1587.00, currency: "JPY", accountType: "specific", broker: "マネックス証券" },
      { symbol: "4168.T", name: "ヤプリ", category: "domestic_stock", quantity: 100, avgCost: 839.00, currency: "JPY", accountType: "specific", broker: "マネックス証券" },
      { symbol: "4172.T", name: "東和ハイシステム", category: "domestic_stock", quantity: 100, avgCost: 2356.00, currency: "JPY", accountType: "specific", broker: "マネックス証券" },
      { symbol: "4689.T", name: "LINEヤフー", category: "domestic_stock", quantity: 500, avgCost: 385.00, currency: "JPY", accountType: "nisa", broker: "マネックス証券" },
      { symbol: "4751.T", name: "サイバーエージェント", category: "domestic_stock", quantity: 500, avgCost: 900.00, currency: "JPY", accountType: "nisa", broker: "マネックス証券" },
      { symbol: "4912.T", name: "ライオン", category: "domestic_stock", quantity: 100, avgCost: 1370.00, currency: "JPY", accountType: "nisa", broker: "マネックス証券" },
      { symbol: "543A.T", name: "新興銘柄", category: "domestic_stock", quantity: 500, avgCost: 489.00, currency: "JPY", accountType: "nisa", broker: "マネックス証券" },
      { symbol: "5706.T", name: "三井金属", category: "domestic_stock", quantity: 100, avgCost: 3085.00, currency: "JPY", accountType: "specific", broker: "マネックス証券" },
      { symbol: "7034.T", name: "プロレドP", category: "domestic_stock", quantity: 100, avgCost: 587.00, currency: "JPY", accountType: "specific", broker: "マネックス証券" },
      { symbol: "7201.T", name: "日産自", category: "domestic_stock", quantity: 300, avgCost: 555.00, currency: "JPY", accountType: "specific", broker: "マネックス証券" },
      { symbol: "7242.T", name: "カヤバ", category: "domestic_stock", quantity: 200, avgCost: 1703.00, currency: "JPY", accountType: "specific", broker: "マネックス証券" },
      { symbol: "8802.T", name: "三菱地所", category: "domestic_stock", quantity: 200, avgCost: 1746.00, currency: "JPY", accountType: "nisa", broker: "マネックス証券" },
      { symbol: "9434.T", name: "ソフトバンク", category: "domestic_stock", quantity: 1000, avgCost: 149.00, currency: "JPY", accountType: "specific", broker: "マネックス証券" },
      { symbol: "147A.T", name: "ソラコム", category: "domestic_stock", quantity: 600, avgCost: 963, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "3159.T", name: "丸善CHI", category: "domestic_stock", quantity: 200, avgCost: 328, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "3774.T", name: "IIJ", category: "domestic_stock", quantity: 200, avgCost: 2251, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "4307.T", name: "NRI", category: "domestic_stock", quantity: 200, avgCost: 3915, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "4568.T", name: "第一三共", category: "domestic_stock", quantity: 200, avgCost: 2983, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "4704.T", name: "トレンド", category: "domestic_stock", quantity: 100, avgCost: 5470, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "4733.T", name: "OBC", category: "domestic_stock", quantity: 100, avgCost: 5672, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "5137.T", name: "スマートD", category: "domestic_stock", quantity: 500, avgCost: 335, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "6200.T", name: "インソース", category: "domestic_stock", quantity: 1000, avgCost: 916, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "6501.T", name: "日立", category: "domestic_stock", quantity: 200, avgCost: 4738, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "6506.T", name: "安川電", category: "domestic_stock", quantity: 200, avgCost: 3045, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "6532.T", name: "ベイカレント", category: "domestic_stock", quantity: 200, avgCost: 4491, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "6645.T", name: "オムロン", category: "domestic_stock", quantity: 300, avgCost: 3887, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "6701.T", name: "NEC", category: "domestic_stock", quantity: 200, avgCost: 4190, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "6954.T", name: "ファナック", category: "domestic_stock", quantity: 100, avgCost: 4520, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "7011.T", name: "三菱重", category: "domestic_stock", quantity: 200, avgCost: 4715, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "7203.T", name: "トヨタ", category: "domestic_stock", quantity: 200, avgCost: 2740, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "7267.T", name: "ホンダ", category: "domestic_stock", quantity: 200, avgCost: 1460, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "7733.T", name: "オリンパス", category: "domestic_stock", quantity: 200, avgCost: 1755, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "7803.T", name: "ブシロード", category: "domestic_stock", quantity: 2000, avgCost: 275, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "7832.T", name: "バンダイナムコ", category: "domestic_stock", quantity: 200, avgCost: 4005, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "7867.T", name: "タカラトミー", category: "domestic_stock", quantity: 200, avgCost: 2586, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "7911.T", name: "TOPPAN", category: "domestic_stock", quantity: 100, avgCost: 4740, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "8056.T", name: "BIPROGY", category: "domestic_stock", quantity: 100, avgCost: 4493, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "8306.T", name: "三菱UFJ", category: "domestic_stock", quantity: 200, avgCost: 2705, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "8725.T", name: "MS&AD", category: "domestic_stock", quantity: 100, avgCost: 4150, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "8729.T", name: "ソニーFG", category: "domestic_stock", quantity: 3000, avgCost: 150, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "9433.T", name: "KDDI", category: "domestic_stock", quantity: 100, avgCost: 2555, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "9503.T", name: "関西電力", category: "domestic_stock", quantity: 100, avgCost: 2610, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "9887.T", name: "松屋フーズ", category: "domestic_stock", quantity: 100, avgCost: 5490, currency: "JPY", accountType: "specific", broker: "SBI証券" },
      { symbol: "4743.T", name: "アイティフォー", category: "domestic_stock", quantity: 200, avgCost: 1545, currency: "JPY", accountType: "nisa", broker: "SBI証券" },
      { symbol: "8058.T", name: "三菱商事", category: "domestic_stock", quantity: 200, avgCost: 2594, currency: "JPY", accountType: "nisa", broker: "SBI証券" },
      { symbol: "2193.T", name: "COOKPAD", category: "domestic_stock", quantity: 100, avgCost: 1020, currency: "JPY", accountType: "general", broker: "SBI証券" },
      { symbol: "4755.T", name: "楽天グループ", category: "domestic_stock", quantity: 400, avgCost: 957, currency: "JPY", accountType: "general", broker: "SBI証券" },
      { symbol: "7034.T", name: "プロレドP", category: "domestic_stock", quantity: 100, avgCost: 1772, currency: "JPY", accountType: "general", broker: "SBI証券" },
      { symbol: "7238.T", name: "曙ブレーキ", category: "domestic_stock", quantity: 400, avgCost: 567, currency: "JPY", accountType: "general", broker: "SBI証券" },
      { symbol: "7844.T", name: "マーベラス", category: "domestic_stock", quantity: 400, avgCost: 876, currency: "JPY", accountType: "general", broker: "SBI証券" }
    ];

    // Combine duplicates
    const finalMap = new Map();
    for (const h of rawData) {
        const key = `${h.symbol}-${h.broker}-${h.accountType}`;
        if (finalMap.has(key)) {
            const ext = finalMap.get(key);
            // weighted average cost
            const totalCost = (ext.quantity * ext.avgCost) + (h.quantity * h.avgCost);
            ext.quantity += h.quantity;
            ext.avgCost = totalCost / ext.quantity;
        } else {
            finalMap.set(key, h);
        }
    }
    const mergedData = Array.from(finalMap.values());

    const dateStr = new Date().toISOString();
    const rowsToAdd = mergedData.map((h, i) => [
        (i + 1).toString(), // id
        h.symbol || '',
        h.name || '',
        h.category || 'domestic_stock',
        h.quantity.toString(),
        h.avgCost.toString(),
        h.currency || 'JPY',
        h.accountType || 'specific',
        h.broker || 'SBI証券',
        dateStr
    ]);

    await sheet.addRows(rowsToAdd);
    console.log(`Added ${rowsToAdd.length} rows to Holdings successfully!`);
}

uploadHoldings().catch(console.error);
