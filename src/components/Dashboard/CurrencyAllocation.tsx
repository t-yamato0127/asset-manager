import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import styles from '@/app/page.module.css';
import { CurrencySummary } from '@/types';
import { formatCurrency } from '@/lib/exchangeRate';

interface Props {
  currencySummaries: CurrencySummary[];
}

export default function CurrencyAllocation({ currencySummaries }: Props) {
  if (!currencySummaries || currencySummaries.length === 0) return null;

  return (
    <div className={styles.allocationSection}>
      <h2 className={styles.allocationTitle}>💱 通貨別アロケーション</h2>
      
      <div style={{ width: '100%', height: '220px', marginTop: '0.5rem' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={currencySummaries}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
              activeShape={false}
              style={{ outline: 'none' }}
            >
              {currencySummaries.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => formatCurrency(Number(value))}
              itemStyle={{ color: '#f8fafc' }}
              contentStyle={{
                background: 'rgba(26, 26, 37, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#f8fafc',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.allocationList} style={{ marginTop: '0.5rem' }}>
        {currencySummaries.map(cat => (
          <div key={cat.currency} className={styles.allocationItem}>
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
  );
}
