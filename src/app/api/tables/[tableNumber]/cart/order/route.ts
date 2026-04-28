import { NextRequest, NextResponse } from 'next/server';
import { placeTableOrder } from '@/lib/server/store';
import { broadcast } from '@/lib/server/cartBus';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableNumber: string }> },
) {
  const { tableNumber } = await params;
  const n = Number(tableNumber);
  if (!Number.isFinite(n) || n < 1) {
    return NextResponse.json({ error: '유효한 테이블 번호가 아닙니다' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const clientId = typeof body?.clientId === 'string' ? body.clientId : '';
  if (!clientId) {
    return NextResponse.json({ error: 'clientId가 필요합니다' }, { status: 400 });
  }

  const result = placeTableOrder(n, clientId);
  if (!result.ok) {
    if (result.error === 'empty') {
      return NextResponse.json({ error: '장바구니가 비어있습니다' }, { status: 400 });
    }
    if (result.error === 'no-host') {
      return NextResponse.json({ error: '호스트가 지정되지 않았습니다' }, { status: 409 });
    }
    return NextResponse.json(
      { error: '주문은 호스트(첫 접속자)만 가능합니다' },
      { status: 403 },
    );
  }

  broadcast(n, 'snapshot', JSON.stringify(result.snap));
  return NextResponse.json({ order: result.order, snapshot: result.snap }, { status: 201 });
}
