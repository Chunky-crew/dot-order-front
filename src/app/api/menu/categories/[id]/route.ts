import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, deleteCategory } from '@/lib/server/store';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const updated = updateCategory(id, body);
  if (!updated) return NextResponse.json({ error: '카테고리를 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteCategory(id);
  if (!deleted) return NextResponse.json({ error: '카테고리를 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json({ success: true });
}
