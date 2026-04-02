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
  Legend,
} from 'recharts';
import styles from './page.module.css';
import type {
  Holding,
  PortfolioSummary,
  CategorySummary,
  ChartDataPoint,
  Transaction
} from '@/types';
import { formatCurrency, formatPercent, formatChange } from '@/lib/exchangeRate';

interface PortfolioData {
  holdings: Holding[];
  transactions: Transaction[];
  summary: PortfolioSummary;
  categories: CategorySummary[];
  exchangeRate: number;
  exchangeRateSource: string;
  priceSource: string;
  totalValueJPY: number;
  source: string;
  updatedAt: string;
}

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


type ChartPeriod = '1W' | '1M' | '3M' | '1Y' | 'ALL';
type TableTab = 'all' | 'domestic' | 'us' | 'fund';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<PortfolioSummary>(SAMPLE_SUMMARY);
  const [categories, setCategories] = useState<CategorySummary[]>(SAMPLE_CATEGORIES);
  const [holdings, setHoldings] = useState(SAMPLE_HOLDINGS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allHistory, setAllHistory] = useState<ChartDataPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1M');
  const [tableTab, setTableTab] = useState<TableTab>('all');
  const [usdJpyRate, setUsdJpyRate] = useState(150.5);

  // Transaction registration modal
  const [showModal, setShowModal] = useState(false);
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txForm, setTxForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    name: '',
    quantity: '',
    price: '',
    fees: '0',
    realizedPL: '0',
    currency: 'JPY' as 'JPY' | 'USD',
    accountType: 'specific',
    broker: 'SBI証券',
  });

  const resetForm = () => {
    setTxForm({
      type: 'buy',
      date: new Date().toISOString().split('T')[0],
      symbol: '', name: '', quantity: '', price: '',
      fees: '0', realizedPL: '0',
      currency: 'JPY', accountType: 'specific', broker: 'SBI証券',
    });
    setTxSuccess(false);
  };

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [priceSuccess, setPriceSuccess] = useState(false);
  const [priceForm, setPriceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    price: '',
    currency: 'JPY' as 'JPY' | 'USD',
  });

  const resetPriceForm = () => {
    setPriceForm({
      date: new Date().toISOString().split('T')[0],
      symbol: '', price: '', currency: 'JPY'
    });
    setPriceSuccess(false);
  };

  const handleTxSubmit = async () => {
    setTxSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txForm),
      });
      if (!res.ok) throw new Error('Failed');
      setTxSuccess(true);
      // Refresh portfolio data
      const portfolioRes = await fetch('/api/portfolio');
      const data = await portfolioRes.json();
      if (data.holdings?.length > 0) setHoldings(data.holdings);
      if (data.transactions) setTransactions(data.transactions);
      if (data.summary) setSummary(data.summary);
      if (data.categories?.length > 0) setCategories(data.categories);
      setTimeout(() => { setShowModal(false); resetForm(); }, 1200);
    } catch (e) {
      console.error('Error submitting transaction:', e);
      alert('取引の登録に失敗しました');
    } finally {
      setTxSubmitting(false);
    }
  };

  const handlePriceSubmit = async () => {
    setPriceSubmitting(true);
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priceForm),
      });
      if (!res.ok) throw new Error('Failed');
      setPriceSuccess(true);
      // Refresh portfolio graph
      const historyRes = await fetch('/api/portfolio/history?days=365');
      const historyData = await historyRes.json();
      if (historyData.history && historyData.history.length > 0) {
        setAllHistory(historyData.history);
      }
      setTimeout(() => { setShowPriceModal(false); resetPriceForm(); }, 1200);
    } catch (e) {
      console.error('Error submitting price:', e);
      alert('価格の登録に失敗しました');
    } finally {
      setPriceSubmitting(false);
    }
  };

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const response = await fetch('/api/portfolio');
        const data = await response.json();

        if (data.holdings && data.holdings.length > 0) {
          // Set enriched holdings with real price data
          setHoldings(data.holdings);
        }

        if (data.transactions) {
          setTransactions(data.transactions);
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

  // Fetch portfolio history for chart
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/portfolio/history?days=365');
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          setAllHistory(data.history);
        }
      } catch (e) {
        console.error('Error fetching history:', e);
      }
    }
    fetchHistory();
  }, []);

  // Compute filtered chart data based on selected period
  const chartData: ChartDataPoint[] = (() => {
    if (allHistory.length === 0) return [];
    const now = new Date();
    let daysBack = 30;
    if (chartPeriod === '1W') daysBack = 7;
    else if (chartPeriod === '1M') daysBack = 30;
    else if (chartPeriod === '3M') daysBack = 90;
    else if (chartPeriod === '1Y') daysBack = 365;
    else daysBack = 99999; // ALL

    const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const filtered = allHistory.filter(h => new Date(h.date) >= cutoff);
    const data = filtered.length > 0 ? filtered : allHistory;

    return data.map(h => {
      const d = new Date(h.date);
      const label = daysBack <= 90
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `${String(d.getFullYear()).slice(2)}/${d.getMonth() + 1}`;
      return { date: label, value: h.value, nikkei: h.nikkei, dow: h.dow };
    });
  })();

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

  const downloadHoldingsCSV = () => {
    if (filteredHoldings.length === 0) return;
    const headers = ['銘柄コード', '銘柄名', '証券会社', '口座種別', '現在値', '取得単価', '保有数', '評価額', '日次損益', '評価損益', '損益率', '通貨'];
    
    const rows = filteredHoldings.map(h => [
      h.symbol,
      h.name,
      h.broker || '',
      h.accountType === 'nisa' ? 'NISA' : h.accountType === 'specific' ? '特定' : '一般',
      h.currentPrice,
      h.avgCost,
      h.quantity,
      h.totalValue,
      h.dayChange || 0,
      h.unrealizedPL,
      h.unrealizedPLPercent,
      h.currency
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `holdings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTransactionsCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['日付', '種別', '銘柄コード', '銘柄名', '証券会社', '口座種別', '数量', '約定単価', '手数料', '実現損益', '支払額/受取額', '通貨'];
    
    const rows = transactions.map(t => {
      const anyT: any = t;
      const amount = t.type === 'buy' ? -(t.price * t.quantity + (parseFloat(String(anyT.fees || '0')))) : (t.price * t.quantity - (parseFloat(String(anyT.fees || '0'))));
      return [
        t.date,
        t.type === 'buy' ? '購入' : '売却',
        t.symbol,
        t.name,
        anyT.broker || '',
        anyT.accountType === 'nisa' ? 'NISA' : anyT.accountType === 'specific' ? '特定' : '一般',
        t.quantity,
        t.price,
        anyT.fees || 0,
        t.realizedPL || 0,
        amount,
        t.currency
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            {new Date().getFullYear()}年
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
                  yAxisId="left"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `¥${(value / 1000000).toFixed(1)}M`}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(26, 26, 37, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any, name: any, props: any) => {
                    if (props.dataKey === 'value') return [formatCurrency(Number(value) || 0), '総資産額'];
                    if (props.dataKey === 'nikkei') return [Number(value).toLocaleString() + '円', '日経平均'];
                    if (props.dataKey === 'dow') return ['$' + Number(value).toLocaleString(), 'NYダウ'];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  yAxisId="left"
                  name="総資産額"
                  type="monotone"
                  dataKey="value"
                  stroke="url(#gradient)"
                  strokeWidth={3}
                  dot={chartData.length <= 1}
                  activeDot={{ r: 6, fill: '#6366f1' }}
                />
                <Line
                  yAxisId="right"
                  name="日経平均 (^N225)"
                  type="monotone"
                  dataKey="nikkei"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  name="NYダウ (^DJI)"
                  type="monotone"
                  dataKey="dow"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4 }}
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
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={downloadHoldingsCSV} className={styles.downloadBtn}>
              📥 CSVダウンロード
            </button>
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
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>銘柄</th>
                <th>証券会社</th>
                <th>現在値</th>
                <th>取得単価</th>
                <th>保有数</th>
                <th>評価額</th>
                <th>損益</th>
                <th>損益率</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map((holding, idx) => (
                <tr key={`${holding.id}-${idx}`}>
                  <td>
                    <div className={styles.symbolCell}>
                      <span className={styles.symbolCode}>{holding.symbol}</span>
                      <span className={styles.symbolName}>{holding.name}</span>
                      <span className={`${styles.accountTag} ${styles[`account_${holding.accountType}`]}`}>
                        {holding.accountType === 'nisa' ? 'NISA' : holding.accountType === 'specific' ? '特定' : '一般'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.brokerTag}>{holding.broker || '-'}</span>
                  </td>
                  <td className={styles.priceCell}>
                    {formatCurrency(holding.currentPrice, holding.currency)}
                  </td>
                  <td className={styles.priceCell}>
                    {formatCurrency(holding.avgCost, holding.currency)}
                  </td>
                  <td>
                    {holding.quantity.toLocaleString()}
                    {holding.category === 'mutual_fund' ? '口' : '株'}
                  </td>
                  <td className={styles.priceCell}>
                    <div>{formatCurrency(holding.totalValue, holding.currency)}</div>
                    <div className={`${styles.dayChangeTag} ${(holding.dayChange || 0) >= 0 ? styles.positive : styles.negative}`}>
                      {(holding.dayChange || 0) >= 0 ? '+' : ''}{formatCurrency(Math.abs(holding.dayChange || 0), holding.currency)}
                      <span className={styles.dayChangePercent}>
                        ({(holding.dayChangePercent || 0) >= 0 ? '+' : ''}{(holding.dayChangePercent || 0).toFixed(2)}%)
                      </span>
                    </div>
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
      {/* Transaction History Section */}
      <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
        <h2 className={styles.sectionTitle}>📅 今年の取引履歴 ({new Date().getFullYear()}年)</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={downloadTransactionsCSV} className={styles.downloadBtn}>
            📥 CSVダウンロード
          </button>
          <button className={styles.addButton} onClick={() => { resetPriceForm(); setShowPriceModal(true); }}>📝 価格履歴を手動登録</button>
          <button className={styles.addButton} onClick={() => { resetForm(); setShowModal(true); }}>＋ 取引を登録</button>
        </div>
      </div>

      <div className={styles.gridContainer}>
        {/* Sell History */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle} style={{ marginBottom: '1rem', color: '#ef4444' }}>🔴 売却履歴</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>銘柄</th>
                  <th>数量</th>
                  <th>売却単価</th>
                  <th>実現損益</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .filter(t => new Date(t.date).getFullYear() === new Date().getFullYear() && t.type === 'sell')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString('ja-JP')}</td>
                      <td>
                        <div className={styles.symbolCell}>
                          <span className={styles.symbolCode}>{t.symbol}</span>
                          <span className={styles.symbolName}>{t.name}</span>
                        </div>
                      </td>
                      <td>{t.quantity.toLocaleString()}</td>
                      <td>{formatCurrency(t.price, t.currency)}</td>
                      <td className={(t.realizedPL || 0) >= 0 ? styles.positive : styles.negative}>
                        {(t.realizedPL || 0) >= 0 ? '+' : ''}{formatCurrency(t.realizedPL || 0, t.currency)}
                      </td>
                    </tr>
                  ))}
                {transactions.filter(t => new Date(t.date).getFullYear() === new Date().getFullYear() && t.type === 'sell').length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                      取引なし
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buy History */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle} style={{ marginBottom: '1rem', color: '#22c55e' }}>🔵 購入履歴</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>銘柄</th>
                  <th>数量</th>
                  <th>購入単価</th>
                  <th>支払額</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .filter(t => new Date(t.date).getFullYear() === new Date().getFullYear() && t.type === 'buy')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString('ja-JP')}</td>
                      <td>
                        <div className={styles.symbolCell}>
                          <span className={styles.symbolCode}>{t.symbol}</span>
                          <span className={styles.symbolName}>{t.name}</span>
                        </div>
                      </td>
                      <td>{t.quantity.toLocaleString()}</td>
                      <td>{formatCurrency(t.price, t.currency)}</td>
                      <td>{formatCurrency(t.price * t.quantity, t.currency)}</td>
                    </tr>
                  ))}
                {transactions.filter(t => new Date(t.date).getFullYear() === new Date().getFullYear() && t.type === 'buy').length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                      取引なし
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transaction Registration Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowModal(false); resetForm(); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>📝 取引を登録</h3>
              <button className={styles.modalClose} onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>

            {txSuccess ? (
              <div className={styles.successMessage}>✅ 取引を登録しました</div>
            ) : (
              <>
                {/* Buy / Sell Toggle */}
                <div className={styles.typeToggle}>
                  <button
                    className={txForm.type === 'buy' ? styles.typeToggleBuy : styles.typeToggleBtn}
                    onClick={() => setTxForm(f => ({ ...f, type: 'buy' }))}
                  >🔵 購入</button>
                  <button
                    className={txForm.type === 'sell' ? styles.typeToggleSell : styles.typeToggleBtn}
                    onClick={() => setTxForm(f => ({ ...f, type: 'sell' }))}
                  >🔴 売却</button>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>日付</label>
                    <input type="date" className={styles.formInput} value={txForm.date}
                      onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>通貨</label>
                    <select className={styles.formSelect} value={txForm.currency}
                      onChange={e => setTxForm(f => ({ ...f, currency: e.target.value as 'JPY' | 'USD' }))}>
                      <option value="JPY">JPY (円)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>銘柄コード</label>
                    <input type="text" className={styles.formInput} placeholder="例: 7203.T" value={txForm.symbol}
                      onChange={e => setTxForm(f => ({ ...f, symbol: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>銘柄名</label>
                    <input type="text" className={styles.formInput} placeholder="例: トヨタ自動車" value={txForm.name}
                      onChange={e => setTxForm(f => ({ ...f, name: e.target.value }))} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>数量</label>
                    <input type="number" className={styles.formInput} placeholder="100" value={txForm.quantity}
                      onChange={e => setTxForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>約定単価</label>
                    <input type="number" className={styles.formInput} placeholder="2500" value={txForm.price}
                      onChange={e => setTxForm(f => ({ ...f, price: e.target.value }))} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>手数料</label>
                    <input type="number" className={styles.formInput} value={txForm.fees}
                      onChange={e => setTxForm(f => ({ ...f, fees: e.target.value }))} />
                  </div>
                  {txForm.type === 'sell' && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>実現損益</label>
                      <input type="number" className={styles.formInput} value={txForm.realizedPL}
                        onChange={e => setTxForm(f => ({ ...f, realizedPL: e.target.value }))} />
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>口座種別</label>
                    <select className={styles.formSelect} value={txForm.accountType}
                      onChange={e => setTxForm(f => ({ ...f, accountType: e.target.value }))}>
                      <option value="specific">特定口座</option>
                      <option value="nisa">NISA</option>
                      <option value="general">一般口座</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>証券会社</label>
                    <select className={styles.formSelect} value={txForm.broker}
                      onChange={e => setTxForm(f => ({ ...f, broker: e.target.value }))}>
                      <option value="SBI証券">SBI証券</option>
                      <option value="マネックス証券">マネックス証券</option>
                      <option value="みずほ銀行">みずほ銀行</option>
                    </select>
                  </div>
                </div>

                <button
                  className={styles.submitButton}
                  disabled={txSubmitting || !txForm.symbol || !txForm.name || !txForm.quantity || !txForm.price}
                  onClick={handleTxSubmit}
                >
                  {txSubmitting ? '登録中...' : `${txForm.type === 'buy' ? '購入' : '売却'}を登録`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Manual Price Registration Modal */}
      {showPriceModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowPriceModal(false); resetPriceForm(); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>📝 価格履歴を手動登録</h3>
              <button className={styles.modalClose} onClick={() => { setShowPriceModal(false); resetPriceForm(); }}>×</button>
            </div>

            {priceSuccess ? (
              <div className={styles.successMessage}>✅ 価格を登録しました。グラフに反映されます！</div>
            ) : (
              <>
                <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  投資信託などの過去の基準価額を手動で追加することで、過去の資産推移グラフをより正確にすることができます。
                </p>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.formLabel}>日付</label>
                    <input type="date" className={styles.formInput} value={priceForm.date}
                      onChange={e => setPriceForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>銘柄コード / ティッカー</label>
                    <input type="text" className={styles.formInput} placeholder="例: eMAXIS Slim 全世界株式" value={priceForm.symbol}
                      onChange={e => setPriceForm(f => ({ ...f, symbol: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>価格 (基準価額)</label>
                    <input type="number" className={styles.formInput} placeholder="例: 21234" value={priceForm.price}
                      onChange={e => setPriceForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.formLabel}>通貨</label>
                    <select className={styles.formSelect} value={priceForm.currency}
                      onChange={e => setPriceForm(f => ({ ...f, currency: e.target.value as 'JPY' | 'USD' }))}>
                      <option value="JPY">JPY (円)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                <button
                  className={styles.submitButton}
                  disabled={priceSubmitting || !priceForm.symbol || !priceForm.price}
                  onClick={handlePriceSubmit}
                >
                  {priceSubmitting ? '登録中...' : '価格を登録'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
