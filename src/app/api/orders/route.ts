import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders, createOrder } from '@/lib/server/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  return NextResponse.json(getAllOrders(status));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.tableNumber || !body.items || body.items.length === 0) {
    return NextResponse.json({ error: '테이블 번호와 주문 항목이 필요합니다' }, { status: 400 });
  }
  const order = createOrder({
    tableNumber: body.tableNumber,
    items: body.items,
  });
  return NextResponse.json(order, { status: 201 });
}
