const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
        let key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
            value = value.slice(1, -1);
        }
        envVars[key] = value;
    }
});

async function main() {
    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(envVars['GOOGLE_CREDENTIALS']),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = envVars['GOOGLE_SPREADSHEET_ID'];

    const date = '2026-03-05';
    const totalValue = '約6,660万円（前日比+1,500万円程度見込み）';
    const unrealizedPL = '要リアルタイム確認';

    const marketContext = [
        '【市場環境 2026/3/5】',
        '日経平均: 55,713円（前日比+1,467円、4営業日ぶり反発）',
        'S&P500: +0.78%、半導体株が牽引',
        '為替: 1ドル=156円台',
        '中東情勢: イランが停戦協議を米側に打診、地政学リスク後退で市場回復',
        '米国経済: ISM非製造業景況指数が2022年以来の高水準、ADP雇用統計も堅調',
    ].join('\n');

    const advice = [
        '【ポートフォリオ分析・投資アドバイス】',
        '',
        '■ ポートフォリオ構成（52銘柄）',
        '国内株式37銘柄、米国株6銘柄、投資信託9本',
        '証券会社: SBI証券・マネックス証券・みずほ銀行の3社分散',
        '口座: 特定口座中心、NISA・一般口座も活用',
        '',
        '■ 強み',
        '1. 銘柄数52と十分に分散されている',
        '2. 三菱重工(7011)・AVGO・NOW等の成長株を保有',
        '3. 投資信託でグローバル分散（オルカン・FANG+・キャピタル世界等）',
        '4. ピクテ・ゴールドでヘッジポジションあり',
        '5. NISA口座を活用し非課税メリットを享受',
        '',
        '■ リスク・懸念点',
        '1. 国内小型株の比率が高い（ヤプリ・Hiクラテス・プロレド・スマートドライブ等）→流動性リスク',
        '2. 日産自動車(7201)@555円: 経営再建の不透明感、含み損の可能性大',
        '3. COOKPAD(2193)@1,020円: 業績低迷中、一般口座での保有→損益通算に注意',
        '4. プロレドパートナーズをSBI(一般)とマネックス(特定)で2口座保有→管理が煩雑',
        '5. 米国株が6銘柄のみ→円安(156円台)メリットを活かした追加投資余地あり',
        '6. ブシロード(7803) 2,000株@275円: エンタメ関連は景気感応度が高い',
        '',
        '■ 直近の取引評価',
        '・ニデック売却(3/4, +293,200円): FA・ロボット関連の利確は好判断。半導体回復で再エントリー検討可',
        '・セガサミーHD売却(2/16, +35,600円): NISA口座でのプラス確定は適切',
        '・ソニーFG新規購入(3/4, 3,000株@150円): 金融セクターへの分散。金利上昇局面で妥当',
        '・BIPROGY新規購入(3/2, 100株@4,493円): DX関連の成長期待。中長期保有向き',
        '',
        '■ 提案アクション',
        '1. 【損切り検討】日産自動車・COOKPAD: 含み損が大きい場合、特定口座の利益と損益通算を検討',
        '2. 【利確検討】ソフトバンク(9434) 1,000株@149円: 大幅含み益の可能性。一部利確で利益確定を',
        '3. 【追加投資】米国株比率の引き上げ: 円安基調だが、ドルコスト平均法で定期購入を推奨',
        '4. 【リバランス】投資信託のオルカン(NISA)比率を高め、長期コア運用を強化',
        '5. 【新規検討】半導体関連(東京エレクトロン等): 本日の反発で割安水準あれば検討',
        '6. 【管理整理】プロレドPの2口座保有を一元化検討',
    ].join('\n');

    const keyPoints = [
        '1. 国内小型株への偏重を是正し、米国株・投資信託の比率を段階的に引き上げる',
        '2. 日産・COOKPAD等の含み損銘柄の損切りを年度内に実行し、実現利益（32.9万円）と損益通算する',
        '3. 中東情勢改善による反発局面で、含み益の大きい銘柄の一部利確を検討する',
    ].join('\n');

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'ai_advice!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[date, totalValue, unrealizedPL, marketContext, advice, keyPoints]],
        },
    });

    console.log('Advice written successfully for', date);

    // Verify
    const v = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'ai_advice!A:A',
    });
    console.log('Total rows in ai_advice:', (v.data.values || []).length);
}

main().catch(console.error);
