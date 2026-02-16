'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import styles from './page.module.css';
import type {
  Holding,
  PortfolioSummary,
  CategorySummary,
  ChartDataPoint
} from '@/types';
import { formatCurrency, formatPercent, formatChange } from '@/lib/exchangeRate';

// Sample data for demonstration (will be replaced with API data)
const SAMPLE_HOLDINGS: (Holding & { currentPrice: number; totalValue: number; unrealizedPL: number; unrealizedPLPercent: number })[] = [
  {
    id: '1',
    symbol: '7203.T',
    name: 'トヨタ自動車',
    category: 'domestic_stock',
    quantity: 100,
    avgCost: 2400,
    currentPrice: 2856,
    totalValue: 285600,
    unrealizedPL: 45600,
    unrealizedPLPercent: 19.0,
    currency: 'JPY',
    accountType: 'specific',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    category: 'us_stock',
    quantity: 50,
    avgCost: 150,
    currentPrice: 182.5,
    totalValue: 9125,
    unrealizedPL: 1625,
    unrealizedPLPercent: 21.7,
    currency: 'USD',
    accountType: 'nisa',
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    symbol: '9984.T',
    name: 'ソフトバンクグループ',
    category: 'domestic_stock',
    quantity: 200,
    avgCost: 6500,
    currentPrice: 7890,
    totalValue: 1578000,
    unrealizedPL: 278000,
    unrealizedPLPercent: 21.4,
    currency: 'JPY',
    accountType: 'specific',
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    category: 'us_stock',
    quantity: 30,
    avgCost: 320,
    currentPrice: 425.5,
    totalValue: 12765,
    unrealizedPL: 3165,
    unrealizedPLPercent: 33.0,
    currency: 'USD',
    accountType: 'nisa',
    createdAt: '2024-01-20',
  },
  {
    id: '5',
    symbol: 'eMAXIS Slim 全世界株式',
    name: 'eMAXIS Slim 全世界株式（オール・カントリー）',
    category: 'mutual_fund',
    quantity: 50000,
    avgCost: 18500,
    currentPrice: 21234,
    totalValue: 1061700,
    unrealizedPL: 136700,
    unrealizedPLPercent: 14.8,
    currency: 'JPY',
    accountType: 'nisa',
    createdAt: '2024-01-01',
  },
];

const SAMPLE_SUMMARY: PortfolioSummary = {
  totalValue: 12345678,
  totalValueJPY: 12345678,
  previousDayValue: 12322222,
  dayChange: 23456,
  dayChangePercent: 0.19,
  totalUnrealizedPL: 1234567,
  totalUnrealizedPLPercent: 11.2,
  yearRealizedPL: 456789,
  yearDividends: 89012,
};

const SAMPLE_CATEGORIES: CategorySummary[] = [
  { category: 'domestic_stock', label: '国内株式', value: 5234567, valueJPY: 5234567, percentage: 42.4, color: '#6366f1' },
  { category: 'us_stock', label: '米国株式', value: 4123456, valueJPY: 4123456, percentage: 33.4, color: '#22c55e' },
  { category: 'mutual_fund', label: '投資信託', value: 2987655, valueJPY: 2987655, percentage: 24.2, color: '#f59e0b' },
];

const SAMPLE_CHART_DATA: ChartDataPoint[] = [
  { date: '01/01', value: 11500000 },
  { date: '01/15', value: 11800000 },
  { date: '02/01', value: 11650000 },
  { date: '02/15', value: 12100000 },
  { date: '03/01', value: 12000000 },
  { date: '03/15', value: 12250000 },
  { date: '04/01', value: 12345678 },
];

type ChartPeriod = '1W' | '1M' | '3M' | '1Y' | 'ALL';
type TableTab = 'all' | 'domestic' | 'us' | 'fund';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<PortfolioSummary>(SAMPLE_SUMMARY);
  const [categories, setCategories] = useState<CategorySummary[]>(SAMPLE_CATEGORIES);
  const [holdings, setHoldings] = useState(SAMPLE_HOLDINGS);
  const [chartData, setChartData] = useState<ChartDataPoint[]>(SAMPLE_CHART_DATA);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1M');
  const [tableTab, setTableTab] = useState<TableTab>('all');
  const [usdJpyRate, setUsdJpyRate] = useState(150.5);

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const response = await fetch('/api/portfolio');
        const data = await response.json();

        if (data.holdings && data.holdings.length > 0) {
          // Set enriched holdings with real price data
          setHoldings(data.holdings);
        }

        if (data.summary) {
          setSummary(data.summary);
        }

        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
        }

        if (data.exchangeRate) {
          setUsdJpyRate(data.exchangeRate);
        }

        console.log(`Portfolio loaded: source=${data.source}, priceSource=${data.priceSource}, exchangeRate=${data.exchangeRate}`);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
        // Keep sample data on error
      } finally {
        setIsLoading(false);
      }
    }

    fetchPortfolio();
  }, []);

  const filteredHoldings = holdings.filter(h => {
    if (tableTab === 'all') return true;
    if (tableTab === 'domestic') return h.category === 'domestic_stock';
    if (tableTab === 'us') return h.category === 'us_stock';
    if (tableTab === 'fund') return h.category === 'mutual_fund';
    return true;
  });

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span>💎</span>
          <h1>資産管理ダッシュボード</h1>
        </div>
        <div className={styles.updateTime}>
          <span className={styles.updateDot}></span>
          <span>最終更新: {formatDate()}</span>
        </div>
      </header>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCardPrimary}>
          <p className={styles.cardLabel}>総資産額</p>
          <p className={styles.cardValue}>{formatCurrency(summary.totalValue)}</p>
          <div className={`${styles.cardChange} ${summary.dayChange >= 0 ? styles.positive : styles.negative}`}>
            <span>{formatChange(summary.dayChange)}</span>
            <span>({formatPercent(summary.dayChangePercent)})</span>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.cardLabel}>含み損益</p>
          <p className={styles.cardValue}>
            <span className={summary.totalUnrealizedPL >= 0 ? styles.positive : styles.negative}>
              {formatChange(summary.totalUnrealizedPL)}
            </span>
          </p>
          <div className={`${styles.cardChange} ${summary.totalUnrealizedPL >= 0 ? styles.positive : styles.negative}`}>
            <span>{formatPercent(summary.totalUnrealizedPLPercent)}</span>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.cardLabel}>年間実現損益</p>
          <p className={styles.cardValue}>
            <span className={summary.yearRealizedPL >= 0 ? styles.positive : styles.negative}>
              {formatChange(summary.yearRealizedPL)}
            </span>
          </p>
          <p className={styles.cardLabel} style={{ marginTop: '0.5rem' }}>
            2024年
          </p>
        </div>

        <div className={styles.summaryCard}>
          <p className={styles.cardLabel}>USD/JPY</p>
          <p className={styles.cardValue}>¥{usdJpyRate.toFixed(2)}</p>
          <div className={`${styles.cardChange} ${styles.positive}`}>
            <span>+0.35%</span>
          </div>
        </div>
      </div>

      {/* Chart and Allocation */}
      <div className={styles.contentGrid}>
        {/* Asset Chart */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>📈 資産推移</h2>
            <div className={styles.chartTabs}>
              {(['1W', '1M', '3M', '1Y', 'ALL'] as ChartPeriod[]).map(period => (
                <button
                  key={period}
                  className={chartPeriod === period ? styles.chartTabActive : styles.chartTab}
                  onClick={() => setChartPeriod(period)}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `¥${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(26, 26, 37, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                  formatter={(value) => [formatCurrency(Number(value) || 0), '評価額']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="url(#gradient)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#6366f1' }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation */}
        <div className={styles.allocationSection}>
          <h2 className={styles.allocationTitle}>📊 資産配分</h2>
          <div className={styles.allocationList}>
            {categories.map(cat => (
              <div key={cat.category} className={styles.allocationItem}>
                <div className={styles.allocationLabel}>
                  <span
                    className={styles.allocationDot}
                    style={{ backgroundColor: cat.color }}
                  ></span>
                  <span className={styles.allocationName}>{cat.label}</span>
                </div>
                <div className={styles.allocationValue}>
                  <p className={styles.allocationAmount}>{formatCurrency(cat.value)}</p>
                  <p className={styles.allocationPercent}>{cat.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>💼 保有銘柄</h2>
          <div className={styles.tableTabs}>
            {[
              { key: 'all', label: 'すべて' },
              { key: 'domestic', label: '国内株' },
              { key: 'us', label: '米国株' },
              { key: 'fund', label: '投信' },
            ].map(tab => (
              <button
                key={tab.key}
                className={tableTab === tab.key ? styles.tableTabActive : styles.tableTab}
                onClick={() => setTableTab(tab.key as TableTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>銘柄</th>
                <th>現在値</th>
                <th>保有数</th>
                <th>評価額</th>
                <th>損益</th>
                <th>損益率</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map(holding => (
                <tr key={holding.id}>
                  <td>
                    <div className={styles.symbolCell}>
                      <span className={styles.symbolCode}>{holding.symbol}</span>
                      <span className={styles.symbolName}>{holding.name}</span>
                    </div>
                  </td>
                  <td className={styles.priceCell}>
                    {formatCurrency(holding.currentPrice, holding.currency)}
                  </td>
                  <td>
                    {holding.quantity.toLocaleString()}
                    {holding.category === 'mutual_fund' ? '口' : '株'}
                  </td>
                  <td className={styles.priceCell}>
                    {formatCurrency(holding.totalValue, holding.currency)}
                  </td>
                  <td className={`${styles.changeCell} ${holding.unrealizedPL >= 0 ? styles.positive : styles.negative}`}>
                    {formatChange(holding.unrealizedPL, holding.currency)}
                  </td>
                  <td className={`${styles.changeCell} ${holding.unrealizedPLPercent >= 0 ? styles.positive : styles.negative}`}>
                    {formatPercent(holding.unrealizedPLPercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
