import { NextRequest, NextResponse } from 'next/server';
import { placeTableOrder } from '@/lib/server/store';
import { broadcast } from '@/lib/server/cartBus';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tableNumber: string }> },
) {
  const { tableNumber } = await params;
  const n = Number(tableNumber);
  if (!Number.isFinite(n) || n < 1) {
    return NextResponse.json({ error: '유효한 테이블 번호가 아닙니다' }, { status: 400 });
  }

  // Any client at the table may place the order — no host check.
  const result = placeTableOrder(n);
  if (!result.ok) {
    // Only 'empty' is possible: either the cart really is empty, or another
    // person at the table just confirmed it (atomic drain).
    return NextResponse.json(
      { error: '이미 주문이 접수되었거나 장바구니가 비어 있습니다', code: 'cart-empty' },
      { status: 409 },
    );
  }

  broadcast(n, 'snapshot', JSON.stringify(result.snap));
  return NextResponse.json({ order: result.order, snapshot: result.snap }, { status: 201 });
}
