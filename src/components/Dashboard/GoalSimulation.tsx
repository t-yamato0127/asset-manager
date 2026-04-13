import React, { useState, useMemo } from 'react';
import styles from '@/app/page.module.css';

interface Props {
  currentValueJPY: number;
}

export default function GoalSimulation({ currentValueJPY }: Props) {
  const [targetAmount, setTargetAmount] = useState(50000000); // Default 50M JPY
  const [monthlyContribution, setMonthlyContribution] = useState(100000); // Default 100k
  const [expectedAnnualReturn, setExpectedAnnualReturn] = useState(5); // Default 5%

  const simulation = useMemo(() => {
    if (currentValueJPY >= targetAmount) {
      return { years: 0, progress: 100, isReached: true };
    }
    
    const progress = Math.min(100, (currentValueJPY / targetAmount) * 100);
    
    // Calculate months to reach target using compound interest
    let balance = currentValueJPY;
    let months = 0;
    const monthlyRate = expectedAnnualReturn / 100 / 12;
    
    // Safely limit loop to 100 years max (1200 months)
    while (balance < targetAmount && months < 1200) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      months++;
    }
    
    return {
      years: +(months / 12).toFixed(1),
      progress,
      isReached: false,
    };
  }, [currentValueJPY, targetAmount, monthlyContribution, expectedAnnualReturn]);

  return (
    <div className={styles.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 className={styles.allocationTitle} style={{ marginBottom: '1rem' }}>🎯 FIREシミュレーション</h2>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>目標到達度</span>
          <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{simulation.progress.toFixed(1)}%</span>
        </div>
        <div className={styles.progressBarContainer} style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div 
            className={styles.progressBarFill} 
            style={{ width: `${simulation.progress}%`, backgroundImage: 'linear-gradient(90deg, #ec4899, #8b5cf6)' }}
          ></div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>目標額 (円)</label>
          <input 
            type="number" 
            className={styles.formInput} 
            value={targetAmount} 
            onChange={(e) => setTargetAmount(Number(e.target.value) || 0)} 
            step={1000000}
            style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>毎月積立額 (円)</label>
          <input 
            type="number" 
            className={styles.formInput} 
            value={monthlyContribution} 
            onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)} 
            step={10000}
            style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)' }}
          />
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
        {simulation.isReached ? (
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎉</div>
            <div style={{ fontWeight: 'bold', color: '#22c55e' }}>目標金額を達成しました！</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              年利 <input type="number" value={expectedAnnualReturn} onChange={(e) => setExpectedAnnualReturn(Number(e.target.value)||0)} style={{ width: '40px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', textAlign: 'center', margin: '0 4px', padding: '2px' }} /> % で運用した場合…
            </div>
            <div style={{ fontSize: '1.2rem' }}>
              目標達成まで約 <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ec4899' }}>{simulation.years}</span> 年
            </div>
          </>
        )}
      </div>
    </div>
  );
}
