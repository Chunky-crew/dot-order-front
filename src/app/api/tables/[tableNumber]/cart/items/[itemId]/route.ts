import { NextRequest, NextResponse } from 'next/server';
import { removeCartItemServer, updateCartItemQuantity } from '@/lib/server/store';
import { broadcast } from '@/lib/server/cartBus';

function parseTable(tableNumber: string): number | null {
  const n = Number(tableNumber);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableNumber: string; itemId: string }> },
) {
  const { tableNumber, itemId } = await params;
  const n = parseTable(tableNumber);
  if (n === null) {
    return NextResponse.json({ error: '유효한 테이블 번호가 아닙니다' }, { status: 400 });
  }

  const body = await request.json();
  if (typeof body?.quantity !== 'number') {
    return NextResponse.json({ error: 'quantity가 필요합니다' }, { status: 400 });
  }

  const snap = updateCartItemQuantity(n, itemId, body.quantity);
  if (!snap) {
    return NextResponse.json({ error: '장바구니 항목을 찾을 수 없습니다' }, { status: 404 });
  }
  broadcast(n, 'snapshot', JSON.stringify(snap));
  return NextResponse.json(snap);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableNumber: string; itemId: string }> },
) {
  const { tableNumber, itemId } = await params;
  const n = parseTable(tableNumber);
  if (n === null) {
    return NextResponse.json({ error: '유효한 테이블 번호가 아닙니다' }, { status: 400 });
  }

  const snap = removeCartItemServer(n, itemId);
  if (!snap) {
    return NextResponse.json({ error: '장바구니 항목을 찾을 수 없습니다' }, { status: 404 });
  }
  broadcast(n, 'snapshot', JSON.stringify(snap));
  return NextResponse.json(snap);
}
