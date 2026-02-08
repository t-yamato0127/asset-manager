// Portfolio calculation utilities

import type {
    Holding,
    Transaction,
    Dividend,
    OtherAsset,
    PortfolioSummary,
    CategorySummary
} from '@/types';
import { convertUsdToJpy } from './exchangeRate';

// Category labels and colors
export const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
    domestic_stock: { label: '国内株式', color: '#6366f1' },
    us_stock: { label: '米国株式', color: '#22c55e' },
    mutual_fund: { label: '投資信託', color: '#f59e0b' },
    cash: { label: '預金・現金', color: '#3b82f6' },
    bond: { label: '債券', color: '#8b5cf6' },
    real_estate: { label: '不動産', color: '#ec4899' },
    crypto: { label: '暗号資産', color: '#f97316' },
    insurance: { label: '保険', color: '#14b8a6' },
    pension: { label: '年金', color: '#64748b' },
};

// Calculate total value of holdings in JPY
export function calculateHoldingsValue(
    holdings: Holding[],
    prices: Map<string, { price: number; currency: string }>,
    usdJpyRate: number
): { holdings: Holding[]; totalJPY: number } {
    let totalJPY = 0;

    const enrichedHoldings = holdings.map(holding => {
        const priceData = prices.get(holding.symbol);
        const currentPrice = priceData?.price || holding.avgCost;
        const totalValue = currentPrice * holding.quantity;
        const costBasis = holding.avgCost * holding.quantity;
        const unrealizedPL = totalValue - costBasis;
        const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

        // Convert to JPY if needed
        const valueJPY = holding.currency === 'USD'
            ? convertUsdToJpy(totalValue, usdJpyRate)
            : totalValue;

        totalJPY += valueJPY;

        return {
            ...holding,
            currentPrice,
            totalValue,
            unrealizedPL,
            unrealizedPLPercent,
        };
    });

    return { holdings: enrichedHoldings, totalJPY };
}

// Calculate other assets total in JPY
export function calculateOtherAssetsValue(
    assets: OtherAsset[],
    usdJpyRate: number
): number {
    return assets.reduce((total, asset) => {
        const valueJPY = asset.currency === 'USD'
            ? convertUsdToJpy(asset.value, usdJpyRate)
            : asset.value;
        return total + valueJPY;
    }, 0);
}

// Calculate year's realized P&L
export function calculateYearRealizedPL(
    transactions: Transaction[],
    year: number,
    usdJpyRate: number
): number {
    const yearTransactions = transactions.filter(
        t => new Date(t.date).getFullYear() === year && t.type === 'sell'
    );

    return yearTransactions.reduce((total, t) => {
        const plJPY = t.currency === 'USD'
            ? convertUsdToJpy(t.realizedPL || 0, usdJpyRate)
            : (t.realizedPL || 0);
        return total + plJPY;
    }, 0);
}

// Calculate year's dividends
export function calculateYearDividends(
    dividends: Dividend[],
    year: number,
    usdJpyRate: number
): number {
    const yearDividends = dividends.filter(
        d => new Date(d.date).getFullYear() === year
    );

    return yearDividends.reduce((total, d) => {
        const amountJPY = d.currency === 'USD'
            ? convertUsdToJpy(d.amount, usdJpyRate)
            : d.amount;
        return total + amountJPY;
    }, 0);
}

// Generate category summary for pie chart
export function generateCategorySummary(
    holdings: Holding[],
    otherAssets: OtherAsset[],
    prices: Map<string, { price: number; currency: string }>,
    usdJpyRate: number
): CategorySummary[] {
    const categoryTotals = new Map<string, number>();

    // Sum holdings by category
    holdings.forEach(holding => {
        const priceData = prices.get(holding.symbol);
        const currentPrice = priceData?.price || holding.avgCost;
        const totalValue = currentPrice * holding.quantity;
        const valueJPY = holding.currency === 'USD'
            ? convertUsdToJpy(totalValue, usdJpyRate)
            : totalValue;

        const existing = categoryTotals.get(holding.category) || 0;
        categoryTotals.set(holding.category, existing + valueJPY);
    });

    // Sum other assets by type
    otherAssets.forEach(asset => {
        const valueJPY = asset.currency === 'USD'
            ? convertUsdToJpy(asset.value, usdJpyRate)
            : asset.value;

        const existing = categoryTotals.get(asset.type) || 0;
        categoryTotals.set(asset.type, existing + valueJPY);
    });

    // Calculate total for percentages
    const grandTotal = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0);

    // Convert to CategorySummary array
    const summaries: CategorySummary[] = [];
    categoryTotals.forEach((value, category) => {
        const config = CATEGORY_CONFIG[category] || { label: category, color: '#888' };
        summaries.push({
            category: category as Holding['category'],
            label: config.label,
            value,
            valueJPY: value,
            percentage: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
            color: config.color,
        });
    });

    // Sort by value descending
    return summaries.sort((a, b) => b.value - a.value);
}

// Generate portfolio summary
export function generatePortfolioSummary(
    holdings: Holding[],
    otherAssets: OtherAsset[],
    transactions: Transaction[],
    dividends: Dividend[],
    prices: Map<string, { price: number; currency: string }>,
    previousPrices: Map<string, { price: number; currency: string }>,
    usdJpyRate: number
): PortfolioSummary {
    const currentYear = new Date().getFullYear();

    // Calculate current holdings value
    const { holdings: enrichedHoldings, totalJPY: holdingsTotal } =
        calculateHoldingsValue(holdings, prices, usdJpyRate);

    // Calculate other assets
    const otherAssetsTotal = calculateOtherAssetsValue(otherAssets, usdJpyRate);

    // Total portfolio value
    const totalValue = holdingsTotal + otherAssetsTotal;

    // Calculate previous day value
    const { totalJPY: previousHoldingsTotal } =
        calculateHoldingsValue(holdings, previousPrices, usdJpyRate);
    const previousDayValue = previousHoldingsTotal + otherAssetsTotal;

    // Day change
    const dayChange = totalValue - previousDayValue;
    const dayChangePercent = previousDayValue > 0
        ? (dayChange / previousDayValue) * 100
        : 0;

    // Calculate total unrealized P&L
    const totalCostBasis = enrichedHoldings.reduce((sum, h) => {
        const costJPY = h.currency === 'USD'
            ? convertUsdToJpy(h.avgCost * h.quantity, usdJpyRate)
            : h.avgCost * h.quantity;
        return sum + costJPY;
    }, 0);

    const totalUnrealizedPL = holdingsTotal - totalCostBasis;
    const totalUnrealizedPLPercent = totalCostBasis > 0
        ? (totalUnrealizedPL / totalCostBasis) * 100
        : 0;

    // Year's realized P&L and dividends
    const yearRealizedPL = calculateYearRealizedPL(transactions, currentYear, usdJpyRate);
    const yearDividends = calculateYearDividends(dividends, currentYear, usdJpyRate);

    return {
        totalValue,
        totalValueJPY: totalValue,
        previousDayValue,
        dayChange,
        dayChangePercent,
        totalUnrealizedPL,
        totalUnrealizedPLPercent,
        yearRealizedPL,
        yearDividends,
    };
}
