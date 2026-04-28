import { NextRequest, NextResponse } from 'next/server';
import { addCartItemServer } from '@/lib/server/store';
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

  const body = await request.json();
  if (
    typeof body?.menuItemId !== 'string' ||
    typeof body?.menuItemName !== 'string' ||
    typeof body?.basePrice !== 'number' ||
    !Array.isArray(body?.selectedOptions) ||
    typeof body?.quantity !== 'number' ||
    body.quantity < 1
  ) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 });
  }

  const clientId = typeof body?.clientId === 'string' ? body.clientId : undefined;
  const { item, snap } = addCartItemServer(
    n,
    {
      menuItemId: body.menuItemId,
      menuItemName: body.menuItemName,
      basePrice: body.basePrice,
      selectedOptions: body.selectedOptions,
      quantity: body.quantity,
    },
    clientId,
  );
  broadcast(n, 'snapshot', JSON.stringify(snap));
  return NextResponse.json({ item, snapshot: snap }, { status: 201 });
}
