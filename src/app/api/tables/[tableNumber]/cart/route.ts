import { NextRequest, NextResponse } from 'next/server';
import { getTableCart } from '@/lib/server/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableNumber: string }> },
) {
  const { tableNumber } = await params;
  const n = Number(tableNumber);
  if (!Number.isFinite(n) || n < 1) {
    return NextResponse.json({ error: '유효한 테이블 번호가 아닙니다' }, { status: 400 });
  }
  return NextResponse.json(getTableCart(n));
}
