'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { formatCurrency, formatChange } from '@/lib/exchangeRate';
import type { Transaction, Currency } from '@/types';

// Sample data for demonstration
const SAMPLE_TRANSACTIONS: Transaction[] = [
    {
        id: '1',
        date: '2024-12-15',
        symbol: '6758.T',
        name: 'ソニーグループ',
        type: 'sell',
        quantity: 100,
        price: 14500,
        fees: 550,
        realizedPL: 125000,
        currency: 'JPY',
    },
    {
        id: '2',
        date: '2024-11-20',
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        type: 'sell',
        quantity: 20,
        price: 175,
        fees: 5,
        realizedPL: 450,
        currency: 'USD',
    },
    {
        id: '3',
        date: '2024-10-10',
        symbol: '7203.T',
        name: 'トヨタ自動車',
        type: 'buy',
        quantity: 100,
        price: 2400,
        fees: 275,
        currency: 'JPY',
    },
    {
        id: '4',
        date: '2024-09-05',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'buy',
        quantity: 50,
        price: 150,
        fees: 5,
        currency: 'USD',
    },
    {
        id: '5',
        date: '2024-08-15',
        symbol: '8306.T',
        name: '三菱UFJ',
        type: 'sell',
        quantity: 500,
        price: 1580,
        fees: 440,
        realizedPL: 89500,
        currency: 'JPY',
    },
    {
        id: '6',
        date: '2024-07-22',
        symbol: 'NVDA',
        name: 'NVIDIA Corp.',
        type: 'sell',
        quantity: 10,
        price: 480,
        fees: 5,
        realizedPL: 1200,
        currency: 'USD',
    },
    {
        id: '7',
        date: '2024-06-10',
        symbol: '9984.T',
        name: 'ソフトバンクグループ',
        type: 'buy',
        quantity: 200,
        price: 6500,
        fees: 550,
        currency: 'JPY',
    },
];

type FilterType = 'all' | 'buy' | 'sell';

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>(SAMPLE_TRANSACTIONS);
    const [selectedYear, setSelectedYear] = useState<number>(2024);
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [usdJpyRate] = useState(150.5);

    const years = [2024, 2023, 2022];

    // Filter transactions
    const filteredTransactions = transactions.filter(t => {
        const matchYear = new Date(t.date).getFullYear() === selectedYear;
        const matchType = filterType === 'all' || t.type === filterType;
        return matchYear && matchType;
    });

    // Calculate summary
    const sellTransactions = filteredTransactions.filter(t => t.type === 'sell');
    const totalRealizedPL = sellTransactions.reduce((sum, t) => {
        const plJPY = t.currency === 'USD'
            ? (t.realizedPL || 0) * usdJpyRate
            : (t.realizedPL || 0);
        return sum + plJPY;
    }, 0);
    const totalFees = filteredTransactions.reduce((sum, t) => {
        const feesJPY = t.currency === 'USD' ? t.fees * usdJpyRate : t.fees;
        return sum + feesJPY;
    }, 0);

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.backButton}>
                        ←
                    </Link>
                    <div className={styles.pageTitle}>
                        <span>📊</span>
                        <h1>取引履歴・実現損益</h1>
                    </div>
                </div>
                <div className={styles.yearSelector}>
                    {years.map(year => (
                        <button
                            key={year}
                            className={selectedYear === year ? styles.yearButtonActive : styles.yearButton}
                            onClick={() => setSelectedYear(year)}
                        >
                            {year}年
                        </button>
                    ))}
                </div>
            </header>

            {/* Summary Cards */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <p className={styles.cardLabel}>年間実現損益</p>
                    <p className={`${styles.cardValue} ${totalRealizedPL >= 0 ? styles.positive : styles.negative}`}>
                        {formatChange(totalRealizedPL)}
                    </p>
                </div>
                <div className={styles.summaryCard}>
                    <p className={styles.cardLabel}>売却回数</p>
                    <p className={styles.cardValue}>{sellTransactions.length}回</p>
                </div>
                <div className={styles.summaryCard}>
                    <p className={styles.cardLabel}>購入回数</p>
                    <p className={styles.cardValue}>
                        {filteredTransactions.filter(t => t.type === 'buy').length}回
                    </p>
                </div>
                <div className={styles.summaryCard}>
                    <p className={styles.cardLabel}>年間手数料</p>
                    <p className={styles.cardValue}>{formatCurrency(totalFees)}</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className={styles.tableSection}>
                <div className={styles.tableHeader}>
                    <h2 className={styles.tableTitle}>取引一覧</h2>
                    <div className={styles.filterTabs}>
                        {[
                            { key: 'all', label: 'すべて' },
                            { key: 'buy', label: '購入' },
                            { key: 'sell', label: '売却' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                className={filterType === tab.key ? styles.filterTabActive : styles.filterTab}
                                onClick={() => setFilterType(tab.key as FilterType)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>この期間の取引履歴はありません</p>
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>日付</th>
                                    <th>銘柄</th>
                                    <th>種別</th>
                                    <th>数量</th>
                                    <th>単価</th>
                                    <th>約定金額</th>
                                    <th>手数料</th>
                                    <th>実現損益</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td>{tx.date}</td>
                                        <td>
                                            <div className={styles.symbolCell}>
                                                <span className={styles.symbolCode}>{tx.symbol}</span>
                                                <span className={styles.symbolName}>{tx.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={tx.type === 'buy' ? styles.typeBuy : styles.typeSell}>
                                                {tx.type === 'buy' ? '購入' : '売却'}
                                            </span>
                                        </td>
                                        <td>{tx.quantity.toLocaleString()}</td>
                                        <td className={styles.priceCell}>
                                            {formatCurrency(tx.price, tx.currency)}
                                        </td>
                                        <td className={styles.priceCell}>
                                            {formatCurrency(tx.price * tx.quantity, tx.currency)}
                                        </td>
                                        <td className={styles.priceCell}>
                                            {formatCurrency(tx.fees, tx.currency)}
                                        </td>
                                        <td className={`${styles.priceCell} ${tx.realizedPL !== undefined
                                                ? (tx.realizedPL >= 0 ? styles.positive : styles.negative)
                                                : ''
                                            }`}>
                                            {tx.realizedPL !== undefined
                                                ? formatChange(tx.realizedPL, tx.currency)
                                                : '-'
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
