// API route for fetching transactions and realized P&L
import { NextRequest, NextResponse } from 'next/server';

// Sample transactions data
const sampleTransactions = [
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
];

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const type = searchParams.get('type'); // 'buy' | 'sell' | undefined

    try {
        let transactions = [...sampleTransactions];

        // Filter by year
        if (year) {
            const yearNum = parseInt(year);
            transactions = transactions.filter(t =>
                new Date(t.date).getFullYear() === yearNum
            );
        }

        // Filter by type
        if (type) {
            transactions = transactions.filter(t => t.type === type);
        }

        // Calculate summary
        const sellTransactions = transactions.filter(t => t.type === 'sell');
        const totalRealizedPL = sellTransactions.reduce(
            (sum, t) => sum + (t.realizedPL || 0),
            0
        );
        const totalFees = transactions.reduce((sum, t) => sum + t.fees, 0);

        return NextResponse.json({
            transactions,
            summary: {
                totalRealizedPL,
                totalFees,
                sellCount: sellTransactions.length,
                buyCount: transactions.filter(t => t.type === 'buy').length,
            },
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        );
    }
}
