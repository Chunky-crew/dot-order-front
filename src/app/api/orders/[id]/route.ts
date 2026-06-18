import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus, deleteOrder } from '@/lib/server/store';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  if (!body.status || !['pending', 'preparing', 'completed'].includes(body.status)) {
    return NextResponse.json({ error: '유효한 상태값이 필요합니다' }, { status: 400 });
  }
  const updated = updateOrderStatus(id, body.status);
  if (!updated) return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteOrder(id);
  if (!deleted) return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json({ success: true });
}
