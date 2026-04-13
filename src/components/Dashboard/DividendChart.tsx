import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from '@/app/page.module.css';
import { Dividend } from '@/types';
import { formatCurrency, convertUsdToJpy } from '@/lib/exchangeRate';

interface Props {
  dividends: Dividend[];
  usdJpyRate: number;
}

export default function DividendChart({ dividends, usdJpyRate }: Props) {
  const chartData = useMemo(() => {
    if (!dividends || dividends.length === 0) return [];
    
    // Group by YYYY-MM
    const monthlyTotals = new Map<string, number>();
    
    dividends.forEach(d => {
      const monthStr = d.date.substring(0, 7); // YYYY-MM
      const amountJPY = d.currency === 'USD' ? convertUsdToJpy(d.amount, usdJpyRate) : d.amount;
      monthlyTotals.set(monthStr, (monthlyTotals.get(monthStr) || 0) + amountJPY);
    });

    const data = Array.from(monthlyTotals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => {
        // Format to M/YYYY for display if preferred, or maintain YYYY-MM
        const [yyyy, mm] = month.split('-');
        return {
          month: `${mm}月`,
          sortKey: month,
          amount: Math.round(total)
        };
      });
      
    // Display last 12 months if possible
    return data.slice(-12);
  }, [dividends, usdJpyRate]);

  if (chartData.length === 0) return null;

  return (
    <div className={styles.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className={styles.allocationTitle} style={{ marginBottom: '1rem' }}>💰 配当金受取推移</h2>
      <div style={{ flex: 1, minHeight: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ background: 'rgba(26, 26, 37, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }}
              formatter={(value: any) => [formatCurrency(Number(value)), '受取配当額']}
            />
            <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
