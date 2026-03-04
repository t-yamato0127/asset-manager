---
description: ポートフォリオを分析してAI投資アドバイスを生成し、Google Sheetsに記録する
---

# ポートフォリオ分析ワークフロー

このワークフローは、ユーザーのポートフォリオをリアルタイムで分析し、投資アドバイスをGoogle Sheetsの `ai_advice` シートに記録します。

## 手順

### 1. ポートフォリオデータの取得

// turbo
```
node scripts/portfolio-advisor.js fetch
```

プロジェクトディレクトリ: `c:\Users\pochi\OneDrive\デスクトップ\Antigravity_Test\asset-manager`

このコマンドでGoogle Sheetsから保有銘柄・取引履歴を取得し、一覧表示します。

### 2. リアルタイム評価額の取得

ダッシュボードAPI（ローカルまたは本番）からリアルタイムのポートフォリオデータを取得します：

// turbo
```
Invoke-WebRequest -Uri "http://localhost:3000/api/portfolio" -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

※ ローカルが起動していない場合は本番URL `https://asset-manager-xxx.vercel.app/api/portfolio` を使用

### 3. AI分析の実行

取得したデータを基に、以下の観点で分析を行ってください：

#### 分析観点
- **ポートフォリオ構成**: セクター分散、地域分散、口座種別のバランス
- **損益状況**: 含み損益の大きい銘柄、損切り候補
- **リスク評価**: 集中リスク、通貨リスク、セクターリスク
- **改善提案**: リバランス案、追加投資候補、利確候補

#### 出力フォーマット
分析結果を以下の形式で整理：
1. **市場環境**: 現在の市場の概況（1-2行）
2. **アドバイス**: 具体的な投資アドバイス（箇条書き5-10項目）
3. **キーポイント**: 最も重要な3つのポイント

### 4. 結果をGoogle Sheetsに記録

分析結果をJSON形式でスクリプトに渡して記録します：

```
echo '{"totalValue": 66604681, "unrealizedPL": 1234567, "marketContext": "市場環境の要約", "advice": "アドバイス全文", "keyPoints": "重要ポイント3つ"}' | node scripts/portfolio-advisor.js write
```

※ 値は実際の分析結果に置き換えてください。

### 5. 記録の確認

Google Sheets の `ai_advice` シートを確認して記録が正しく保存されたことを確認します。

## 注意事項
- このワークフローで提供される情報は投資助言ではなく、参考情報です
- 最終的な投資判断はユーザー自身の責任で行ってください
- 市場データはリアルタイムではない場合があります（15分遅延の可能性）
