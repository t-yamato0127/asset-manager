// Exchange rate fetching utilities

interface ExchangeRateData {
    rate: number;
    date: string;
    source: string;
}

// Fetch USD/JPY exchange rate from a free API
export async function fetchUsdJpyRate(): Promise<ExchangeRateData | null> {
    try {
        // Using exchangerate.host (free, no API key required)
        const response = await fetch(
            'https://api.exchangerate.host/latest?base=USD&symbols=JPY',
            { next: { revalidate: 3600 } } // Cache for 1 hour
        );

        if (!response.ok) {
            // Fallback to alternative API
            return await fetchFromAlternativeApi();
        }

        const data = await response.json();

        if (data.success && data.rates?.JPY) {
            return {
                rate: data.rates.JPY,
                date: data.date,
                source: 'exchangerate.host',
            };
        }

        return await fetchFromAlternativeApi();
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return await fetchFromAlternativeApi();
    }
}

// Alternative API (Frankfurt Exchange Data)
async function fetchFromAlternativeApi(): Promise<ExchangeRateData | null> {
    try {
        const response = await fetch(
            'https://api.frankfurter.app/latest?from=USD&to=JPY',
            { next: { revalidate: 3600 } }
        );

        if (!response.ok) {
            console.error('Alternative API also failed');
            return null;
        }

        const data = await response.json();

        if (data.rates?.JPY) {
            return {
                rate: data.rates.JPY,
                date: data.date,
                source: 'frankfurter.app',
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching from alternative API:', error);
        return null;
    }
}

// Convert USD to JPY
export function convertUsdToJpy(usdAmount: number, rate: number): number {
    return usdAmount * rate;
}

// Convert JPY to USD
export function convertJpyToUsd(jpyAmount: number, rate: number): number {
    return jpyAmount / rate;
}

// Format currency for display
export function formatCurrency(
    amount: number,
    currency: 'JPY' | 'USD' = 'JPY'
): string {
    const formatter = new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency,
        minimumFractionDigits: currency === 'JPY' ? 0 : 2,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    });

    return formatter.format(amount);
}

// Format number with commas
export function formatNumber(num: number, decimals: number = 0): string {
    return new Intl.NumberFormat('ja-JP', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
}

// Format percentage
export function formatPercent(value: number, decimals: number = 2): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
}

// Format change with sign
export function formatChange(value: number, currency: 'JPY' | 'USD' = 'JPY'): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${formatCurrency(value, currency)}`;
}

export type { ExchangeRateData };
