# 資産管理ダッシュボード — セットアップガイド

個人向け株式・投資信託の資産管理ダッシュボード。Google Sheets をデータベースとして利用し、リアルタイムの株価・基準価額を取得して表示する Next.js アプリケーション。

---

## 目次

1. [システム構成](#1-システム構成)
2. [前提条件](#2-前提条件)
3. [Google Cloud の設定](#3-google-cloud-の設定)
4. [Google スプレッドシートの準備](#4-google-スプレッドシートの準備)
5. [ローカル環境構築](#5-ローカル環境構築)
6. [本番デプロイ（Vercel）](#6-本番デプロイvercel)
7. [投資信託の設定](#7-投資信託の設定)
8. [アーキテクチャ詳細](#8-アーキテクチャ詳細)
9. [トラブルシューティング](#9-トラブルシューティング)
10. [コスト・制限事項](#10-コスト制限事項)

---

## 1. システム構成

```
┌──────────────────────────────────────────────────┐
│                    Vercel                         │
│  ┌────────────────────────────────────────────┐   │
│  │  Next.js 16.1.6 (App Router)               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ page.tsx  │  │ /api/    │  │ /api/cron│  │  │
│  │  │ Dashboard │  │ portfolio│  │ update-  │  │  │
│  │  │ (React)   │  │ holdings │  │ prices   │  │  │
│  │  └──────────┘  └────┬─────┘  └────┬─────┘  │  │
│  └──────────────────────┼────────────┼────────┘   │
└─────────────────────────┼────────────┼────────────┘
                          │            │
          ┌───────────────┼────────────┼──────────┐
          ▼               ▼            ▼          ▼
   ┌──────────┐  ┌──────────────┐  ┌───────────────┐
   │ Google   │  │ Yahoo Finance│  │ Frankfurter   │
   │ Sheets   │  │ (株価/NAV)    │  │ (為替レート)    │
   │ API      │  │              │  │               │
   └──────────┘  └──────────────┘  └───────────────┘
```

### 技術スタック

| 項目 | 技術 | バージョン |
|------|------|-----------|
| フレームワーク | Next.js (App Router, Turbopack) | 16.1.6 |
| UI ライブラリ | React | 19.2.3 |
| チャート | Recharts | 3.7.0 |
| データベース | Google Sheets API | googleapis v171 |
| 株価取得 | Yahoo Finance v8 API (株式) / Yahoo Finance Japan スクレイピング (投信) | — |
| 為替レート | exchangerate.host / frankfurter.app | — |
| ホスティング | Vercel (Hobby プラン) | — |
| フォント | Inter (Google Fonts) | — |

---

## 2. 前提条件

- **Node.js** 18.x 以上
- **npm** 9.x 以上
- **Git**
- **Google アカウント** (Google Cloud Console / Google Sheets 用)
- **Vercel アカウント** (本番デプロイ用、GitHub連携)
- **GitHub アカウント** (リポジトリ管理)

---

## 3. Google Cloud の設定

### 3.1 プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（例: `asset-manager`）
3. プロジェクトを選択

### 3.2 Google Sheets API の有効化

1. サイドメニュー → **「APIとサービス」** → **「APIとサービスを有効にする」**
2. 「Google Sheets API」を検索 → **有効にする**

### 3.3 サービスアカウントの作成

1. **「APIとサービス」** → **「認証情報」** → **「認証情報を作成」** → **「サービスアカウント」**
2. サービスアカウント名を入力（例: `asset-manager-sheets`）
3. 作成完了後、サービスアカウントの詳細画面へ
4. **「キー」** タブ → **「鍵を追加」** → **「新しい鍵を作成」** → **JSON** 形式
5. ダウンロードされた JSON ファイルの中身を環境変数 `GOOGLE_CREDENTIALS` に設定する

> **⚠️ 重要**: JSON キーファイルは秘密情報です。Git にコミットしないでください。

### 3.4 サービスアカウントのメールアドレスを控える

JSON ファイル内の `client_email`（例: `asset-manager-sheets@xxx.iam.gserviceaccount.com`）を控えておく。次のステップで使用します。

---

## 4. Google スプレッドシートの準備

### 4.1 スプレッドシート作成

1. [Google Sheets](https://sheets.google.com/) で新しいスプレッドシートを作成
2. URL からスプレッドシート ID を控える:
   ```
   https://docs.google.com/spreadsheets/d/{ここがSPREADSHEET_ID}/edit
   ```

### 4.2 サービスアカウントに共有

1. スプレッドシートの **「共有」** ボタンをクリック
2. 手順 3.4 で控えたサービスアカウントのメールアドレスを追加
3. 権限: **「編集者」** に設定

### 4.3 シートの作成

以下の **6つのシート** を作成し、それぞれの1行目にヘッダーを入力します。

#### ① `holdings` シート（保有銘柄）

| 列 | ヘッダー名 | 説明 | 入力例 |
|----|-----------|------|--------|
| A | symbol | 銘柄コード | `7203.T`（株式）/ `ifree-fang`（投信） |
| B | name | 銘柄名 | `トヨタ自動車` |
| C | category | 資産カテゴリ | `domestic_stock` / `us_stock` / `mutual_fund` |
| D | quantity | 保有数量 | `100`（株） / `50.939`（万口） |
| E | averageCost | 取得単価 | `2740` |
| F | currency | 通貨 | `JPY` / `USD` |
| G | accountType | 口座種別 | `nisa` / `specific` / `general` |
| H | broker | 証券会社 | `SBI証券` / `みずほ銀行` |

**symbol の命名規則:**
- 国内株式: `{証券コード}.T`（例: `7203.T`）
- 米国株式: ティッカーシンボル（例: `AAPL`, `MSFT`）
- 投資信託: 任意のキー名（例: `ifree-fang`）→ [投資信託の設定](#7-投資信託の設定) で詳細説明
- 同一銘柄を複数証券会社で保有する場合: `-` + サフィックス（例: `7034.T-sbi`）

**quantity の注意点（投資信託）:**
- 投資信託の quantity は **万口単位** で入力してください
- 例: 509,390口 → `50.939`

#### ② `transactions` シート（取引履歴）

| 列 | ヘッダー名 | 説明 | 入力例 |
|----|-----------|------|--------|
| A | date | 取引日 | `2026-02-16` |
| B | symbol | 銘柄コード | `6460.T` |
| C | name | 銘柄名 | `セガサミーHD` |
| D | type | 取引種別 | `buy` / `sell` |
| E | quantity | 数量 | `200` |
| F | price | 約定単価 | `2630` |
| G | fees | 手数料 | `0` |
| H | realizedPL | 実現損益（売却時のみ） | `35600` |
| I | currency | 通貨 | `JPY` / `USD` |

#### ③ `price_history` シート（価格履歴）

| 列 | ヘッダー名 | 説明 | 入力例 |
|----|-----------|------|--------|
| A | date | 日付 | `2026-02-16` |
| B | symbol | 銘柄コード | `7203.T` |
| C | price | 終値 | `3681` |
| D | currency | 通貨 | `JPY` |

> ℹ️ このシートは cron ジョブで自動更新されます。

#### ④ `exchange_rates` シート（為替レート）

| 列 | ヘッダー名 | 説明 | 入力例 |
|----|-----------|------|--------|
| A | date | 日付 | `2026-02-16` |
| B | usdJpy | USD/JPYレート | `153.29` |

> ℹ️ このシートは cron ジョブで自動更新されます。

#### ⑤ `other_assets` シート（その他資産）

| 列 | ヘッダー名 | 説明 | 入力例 |
|----|-----------|------|--------|
| A | id | ID | `cash-1` |
| B | type | 種別 | `cash` / `bond` / `real_estate` / `crypto` / `insurance` / `pension` |
| C | name | 資産名 | `普通預金` |
| D | value | 金額 | `5000000` |
| E | currency | 通貨 | `JPY` |
| F | updatedAt | 更新日 | `2026-01-01` |

#### ⑥ `dividends` シート（配当金）

| 列 | ヘッダー名 | 説明 | 入力例 |
|----|-----------|------|--------|
| A | id | ID | `div-1` |
| B | date | 入金日 | `2026-03-25` |
| C | symbol | 銘柄コード | `7203.T` |
| D | name | 銘柄名 | `トヨタ自動車` |
| E | amount | 配当金額 | `8000` |
| F | currency | 通貨 | `JPY` |

---

## 5. ローカル環境構築

### 5.1 リポジトリのクローン

```bash
git clone https://github.com/{your-username}/asset-manager.git
cd asset-manager
```

### 5.2 依存パッケージのインストール

```bash
npm install
```

### 5.3 環境変数の設定

`.env.example` をコピーして `.env.local` を作成:

```bash
cp .env.example .env.local
```

`.env.local` を編集し、以下の3つの環境変数を設定:

```env
# Google Cloud サービスアカウントのJSON全体を1行で記述
GOOGLE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com",...}'

# Google SpreadsheetのID
GOOGLE_SPREADSHEET_ID=1234567890abcdef...

# Cronジョブ認証用シークレット（任意の文字列）
CRON_SECRET=your-random-secret-string
```

> **⚠️ 注意**: `GOOGLE_CREDENTIALS` は JSON を **1行** にして、シングルクォートで囲んでください。改行は `\n` にエスケープされた状態で入力します。

### 5.4 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開き、ダッシュボードが表示されることを確認。

### 5.5 ビルド確認

```bash
npm run build
```

エラーなくビルドが完了すれば OK。

---

## 6. 本番デプロイ（Vercel）

### 6.1 Vercel プロジェクトの作成

1. [Vercel](https://vercel.com/) にGitHubアカウントでログイン
2. **「New Project」** → GitHub リポジトリをインポート
3. フレームワーク: **Next.js** が自動検出される

### 6.2 環境変数の設定

Vercel のプロジェクト設定 → **「Environment Variables」** で以下を追加:

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `GOOGLE_CREDENTIALS` | サービスアカウント JSON 全体 | Production, Preview, Development |
| `GOOGLE_SPREADSHEET_ID` | スプレッドシート ID | Production, Preview, Development |
| `CRON_SECRET` | 任意のランダム文字列 | Production |

> **⚠️ Vercel の環境変数に設定する `GOOGLE_CREDENTIALS` はシングルクォートで囲む必要はありません。**

### 6.3 デプロイ

```bash
git push origin main
```

Vercel が自動的にビルド・デプロイを実行します。

### 6.4 Cron ジョブ

`vercel.json` で平日15:30（JST）に価格自動更新ジョブが設定されています:

```json
{
    "crons": [
        {
            "path": "/api/cron/update-prices",
            "schedule": "30 6 * * 1-5"
        }
    ]
}
```

- `30 6 * * 1-5` = UTC 6:30（= JST 15:30）、月〜金
- Vercel Hobby プラン: 1日1回まで実行可能

---

## 7. 投資信託の設定

投資信託はYahoo Finance Japan からスクレイピングで基準価額(NAV)を取得します。新しい投資信託を追加する際は以下の手順が必要です。

### 7.1 Yahoo Finance Japan のファンドコードを確認

1. [Yahoo Finance Japan](https://finance.yahoo.co.jp/) で該当ファンドを検索
2. URL からファンドコードを控える:
   ```
   https://finance.yahoo.co.jp/quote/{ファンドコード}
   ```
   例: `https://finance.yahoo.co.jp/quote/04311181` → コード: `04311181`

### 7.2 FUND_CODE_MAP に追加

`src/app/api/portfolio/route.ts` 内の `FUND_CODE_MAP` に、holdings シートの symbol とファンドコードのマッピングを追加:

```typescript
const FUND_CODE_MAP: Record<string, string> = {
    'ifree-fang': '04311181',        // iFreeNEXT FANG+インデックス
    'emaxis-ac-general': '0331418A', // eMAXIS Slim 全世界株式
    // ↓ 新規追加
    'your-fund-key': 'XXXXXXXX',     // ファンド名
};
```

### 7.3 holdings シートにデータ追加

| symbol | name | category | quantity | averageCost | currency | accountType | broker |
|--------|------|----------|----------|-------------|----------|-------------|--------|
| your-fund-key | ファンド名 | mutual_fund | 50.000 | 20000 | JPY | nisa | SBI証券 |

### 現在登録済みのファンドコードマップ

| holdings の symbol | ファンドコード | ファンド名 |
|------------------|-------------|-----------|
| `capital-world` | `9331107A` | キャピタル世界株式ファンド |
| `ghq-dist` | `47316169` | グロハイクオリティ成長（受取コース） |
| `ghq-reinv` | `47316169` | グロハイクオリティ成長（再投資コース） |
| `trowe-allcap` | `AW31122B` | T.ロウ・プライス米国オールキャップ |
| `capital-ica` | `93311181` | キャピタルICA |
| `pictet-gold` | `42312199` | ピクテ・ゴールド（為替ヘッジなし） |
| `ifree-fang` | `04311181` | iFreeNEXT FANG+インデックス |
| `emaxis-ac-general` | `0331418A` | eMAXIS Slim 全世界株式（一般口座） |
| `emaxis-ac-nisa` | `0331418A` | eMAXIS Slim 全世界株式（NISA口座） |

> ℹ️ 同じファンドの分配金受取コースと再投資コースは同一の基準価額 (NAV) を共有するため、同じファンドコードを設定します。

---

## 8. アーキテクチャ詳細

### ディレクトリ構成

```
asset-manager/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── portfolio/route.ts  ← 統合API（株価取得+計算+レスポンス）
│   │   │   ├── holdings/route.ts   ← 保有銘柄API（Sheets直接読み込み）
│   │   │   ├── transactions/route.ts ← 取引履歴API
│   │   │   ├── prices/route.ts     ← 価格取得API
│   │   │   └── cron/
│   │   │       └── update-prices/route.ts ← 価格自動更新cron
│   │   ├── page.tsx                ← ダッシュボード画面
│   │   ├── page.module.css         ← スタイル
│   │   ├── globals.css             ← グローバルCSS
│   │   └── layout.tsx              ← レイアウト
│   ├── lib/
│   │   ├── googleSheets.ts         ← Google Sheets API ラッパー
│   │   ├── stockApi.ts             ← 株価・投信NAV取得
│   │   ├── exchangeRate.ts         ← 為替レート取得
│   │   └── calculations.ts         ← ポートフォリオ計算ロジック
│   └── types/
│       └── index.ts                ← TypeScript型定義
├── scripts/
│   └── create-transactions.ts      ← 取引シート作成スクリプト
├── vercel.json                     ← Vercel設定（cronジョブ）
├── .env.example                    ← 環境変数テンプレート
├── .env.local                      ← 環境変数（※git管理外）
└── package.json
```

### API エンドポイント

| エンドポイント | メソッド | 説明 |
|-------------|---------|------|
| `/api/portfolio` | GET | 統合API: 保有銘柄+リアルタイム株価+計算結果+取引履歴 |
| `/api/holdings` | GET | Google Sheets から保有銘柄を取得 |
| `/api/transactions` | GET | 取引履歴（`?year=2026&type=sell` でフィルタ可） |
| `/api/cron/update-prices` | GET | 価格自動更新（Vercel Cron / `Bearer {CRON_SECRET}` 認証） |

### データフロー

```
[ダッシュボード表示時]
page.tsx → GET /api/portfolio
              ├→ Google Sheets: holdings, transactions 読み込み
              ├→ Yahoo Finance v8 API: 株式の現在値取得
              ├→ Yahoo Finance Japan: 投資信託の基準価額(NAV)スクレイピング
              ├→ frankfurter.app: USD/JPY 為替レート取得
              ├→ calculations.ts: 評価額・損益・カテゴリ別集計を計算
              └→ JSON レスポンス返却

[Cronジョブ実行時（平日15:30 JST）]
Vercel Cron → GET /api/cron/update-prices
              ├→ Google Sheets: holdings 読み込み
              ├→ Yahoo Finance: 全銘柄の株価取得
              ├→ frankfurter.app: 為替レート取得
              └→ Google Sheets: price_history, exchange_rates に書き込み
```

### 外部 API の詳細

| API | 用途 | 認証 | レート制限 | 備考 |
|-----|------|------|----------|------|
| Yahoo Finance v8 (`query1.finance.yahoo.com`) | 国内株・米国株の現在値 | 不要 | 非公式（暗黙的制限あり） | 5銘柄ずつバッチ取得、200ms間隔 |
| Yahoo Finance Japan (`finance.yahoo.co.jp`) | 投資信託の基準価額 | 不要 | 非公式 | HTMLスクレイピング、5ファンドずつ、500ms間隔 |
| exchangerate.host | USD/JPY為替レート | 不要 | — | プライマリ。1時間キャッシュ |
| frankfurter.app | USD/JPY為替レート | 不要 | — | フォールバック。1時間キャッシュ |
| Google Sheets API | データ読み書き | サービスアカウント | 60 req/min | — |

---

## 9. トラブルシューティング

### 投資信託の損益が0と表示される

**原因**: Yahoo Finance Japan の HTML 構造が変更され、スクレイピング用の正規表現がマッチしなくなったケース。

**対処**:
1. Yahoo Finance Japan のファンドページ（例: `https://finance.yahoo.co.jp/quote/04311181`）を開き、基準価額が表示されることを確認
2. ブラウザの開発者ツールで基準価額を含む HTML 要素のクラス名を確認
3. `src/lib/stockApi.ts` の `fetchMutualFundNAV` 関数内の正規表現パターンを更新

### Google Sheets からデータが取得できない

- サービスアカウントにスプレッドシートの **編集権限** が付与されているか確認
- `GOOGLE_SPREADSHEET_ID` が正しいか確認
- `GOOGLE_CREDENTIALS` の JSON が正しい形式か確認
- Google Sheets API が Google Cloud Console で有効になっているか確認

### Vercel デプロイ後に API がエラーを返す

- Vercel の **Environment Variables** に 3 つの環境変数が設定されているか確認
- `GOOGLE_CREDENTIALS` の JSON がエスケープの問題で壊れていないか確認
- Vercel の **Functions** ログでエラー内容を確認

### Cron ジョブが実行されない

- Vercel Hobby プランでは **1日1回** が上限
- `CRON_SECRET` が Vercel の環境変数に設定されているか確認
- Vercel ダッシュボード → **Cron Jobs** タブで実行状況を確認

---

## 10. コスト・制限事項

### 無料で利用可能なサービス

| サービス | プラン | 月額 | 主な制限 |
|---------|-------|------|---------|
| Vercel | Hobby (無料) | ¥0 | Serverless CPU 4h/月、帯域100GB/月、Cron 1回/日 |
| Google Sheets API | 無料 | ¥0 | 60 req/分 |
| Yahoo Finance | 非公式 (無料) | ¥0 | レート制限不明、HTML構造変更リスクあり |
| frankfurter.app | 無料 | ¥0 | 制限なし |

### 注意事項

- **Yahoo Finance は非公式 API / スクレイピング** のため、予告なく利用不可になる可能性があります。HTML構造の変更で正規表現の修正が必要になることがあります。
- **Vercel Hobby プランは個人・非商用利用のみ** 許可されています。商用利用には Pro プラン（$20/月）が必要です。
- **Vercel Hobby の Cron ジョブは 1日1回** が上限です。現在は平日15:30(JST)に1回実行する設定です。

---

*最終更新: 2026-02-16*
