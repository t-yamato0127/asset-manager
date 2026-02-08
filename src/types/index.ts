// Type definitions for Asset Management App

export type AssetCategory =
    | 'domestic_stock'
    | 'us_stock'
    | 'mutual_fund'
    | 'cash'
    | 'bond'
    | 'real_estate'
    | 'crypto'
    | 'insurance'
    | 'pension';

export type AccountType = 'nisa' | 'specific' | 'general';

export type Currency = 'JPY' | 'USD';

export type TransactionType = 'buy' | 'sell';

export interface Holding {
    id: string;
    symbol: string;
    name: string;
    category: AssetCategory;
    quantity: number;
    avgCost: number;
    currency: Currency;
    accountType: AccountType;
    createdAt: string;
    // Calculated fields (populated at runtime)
    currentPrice?: number;
    totalValue?: number;
    unrealizedPL?: number;
    unrealizedPLPercent?: number;
}

export interface PriceHistory {
    date: string;
    symbol: string;
    price: number;
    currency: Currency;
}

export interface Transaction {
    id: string;
    date: string;
    symbol: string;
    name: string;
    type: TransactionType;
    quantity: number;
    price: number;
    fees: number;
    realizedPL?: number; // Only for sell transactions
    currency: Currency;
}

export interface ExchangeRate {
    date: string;
    usdJpy: number;
}

export interface OtherAsset {
    id: string;
    type: Exclude<AssetCategory, 'domestic_stock' | 'us_stock' | 'mutual_fund'>;
    name: string;
    value: number;
    currency: Currency;
    updatedAt: string;
}

export interface Dividend {
    id: string;
    date: string;
    symbol: string;
    name: string;
    amount: number;
    currency: Currency;
}

// Dashboard summary types
export interface PortfolioSummary {
    totalValue: number;
    totalValueJPY: number;
    previousDayValue: number;
    dayChange: number;
    dayChangePercent: number;
    totalUnrealizedPL: number;
    totalUnrealizedPLPercent: number;
    yearRealizedPL: number;
    yearDividends: number;
}

export interface CategorySummary {
    category: AssetCategory;
    label: string;
    value: number;
    valueJPY: number;
    percentage: number;
    color: string;
}

export interface ChartDataPoint {
    date: string;
    value: number;
    label?: string;
}
