import React, { useMemo } from 'react';
import styles from '@/app/page.module.css';
import { ChartDataPoint } from '@/types';

interface Props {
  history: ChartDataPoint[];
}

export default function BenchmarkComparison({ history }: Props) {
  const returns = useMemo(() => {
    if (!history || history.length < 2) return null;
    
    // YTD calculate: start of year vs now
    const currentYear = new Date().getFullYear();
    const thisYearData = history.filter(h => h.date && new Date(h.date).getFullYear() === currentYear);
    
    // Find the earliest point this year, vs latest
    if (thisYearData.length < 2) return null;
    
    const startObj = thisYearData[0];
    const endObj = thisYearData[thisYearData.length - 1];
    
    // Portfolio Return
    const portReturn = startObj.value > 0 ? ((endObj.value - startObj.value) / startObj.value) * 100 : 0;
    
    // S&P500 Return
    let sp500Return = 0;
    if (startObj.sp500 && endObj.sp500) {
      sp500Return = ((endObj.sp500 - startObj.sp500) / startObj.sp500) * 100;
    }
    
    // Nikkei Return
    let nikkeiReturn = 0;
    if (startObj.nikkei && endObj.nikkei) {
      nikkeiReturn = ((endObj.nikkei - startObj.nikkei) / startObj.nikkei) * 100;
    }

    return {
      portfolio: portReturn,
      sp500: sp500Return,
      nikkei: nikkeiReturn,
      outperforming: portReturn > sp500Return
    };
  }, [history]);

  if (!returns) return null;

  return (
    <div className={styles.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className={styles.allocationTitle} style={{ marginBottom: '1rem' }}>📈 YTD パフォーマンス</h2>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        年初来（YTD）のリターン率比較
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>My Portfolio</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: returns.portfolio >= 0 ? '#22c55e' : '#ef4444' }}>
            {returns.portfolio >= 0 ? '+' : ''}{returns.portfolio.toFixed(2)}%
          </div>
        </div>
        
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>S&P 500</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: returns.sp500 >= 0 ? '#22c55e' : '#ef4444' }}>
            {returns.sp500 >= 0 ? '+' : ''}{returns.sp500.toFixed(2)}%
          </div>
        </div>

        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>日経平均</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: returns.nikkei >= 0 ? '#22c55e' : '#ef4444' }}>
            {returns.nikkei >= 0 ? '+' : ''}{returns.nikkei.toFixed(2)}%
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
        {returns.outperforming ? (
          <span style={{ color: '#22c55e' }}>✨ S&P500をアウトパフォーム！</span>
        ) : (
          <span style={{ color: 'var(--text-secondary)' }}>着実に運用を続けましょう</span>
        )}
      </div>
    </div>
  );
}
