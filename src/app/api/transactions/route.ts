// API route for fetching and creating transactions
import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, addTransaction } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    try {
        let transactions = await getTransactions();

        if (year) {
            const yearNum = parseInt(year);
            transactions = transactions.filter(t =>
                new Date(t.date).getFullYear() === yearNum
            );
        }

        if (type) {
            transactions = transactions.filter(t => t.type === type);
        }

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        const { date, symbol, name, type, quantity, price } = body;
        if (!date || !symbol || !name || !type || !quantity || !price) {
            return NextResponse.json(
                { error: '必須項目が不足しています: date, symbol, name, type, quantity, price' },
                { status: 400 }
            );
        }

        if (type !== 'buy' && type !== 'sell') {
            return NextResponse.json(
                { error: 'type は "buy" または "sell" を指定してください' },
                { status: 400 }
            );
        }

        await addTransaction({
            date,
            symbol,
            name,
            type,
            quantity: Number(quantity),
            price: Number(price),
            fees: Number(body.fees || 0),
            realizedPL: Number(body.realizedPL || 0),
            currency: body.currency || 'JPY',
            accountType: body.accountType || '',
            broker: body.broker || '',
        });

        return NextResponse.json({
            success: true,
            message: '取引を登録しました',
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        return NextResponse.json(
            { error: '取引の登録に失敗しました' },
            { status: 500 }
        );
    }
}
