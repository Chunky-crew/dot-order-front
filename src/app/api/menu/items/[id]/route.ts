import { NextRequest, NextResponse } from 'next/server';
import { getMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/server/store';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getMenuItem(id);
  if (!item) return NextResponse.json({ error: '메뉴를 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const updated = updateMenuItem(id, body);
  if (!updated) return NextResponse.json({ error: '메뉴를 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteMenuItem(id);
  if (!deleted) return NextResponse.json({ error: '메뉴를 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json({ success: true });
}
