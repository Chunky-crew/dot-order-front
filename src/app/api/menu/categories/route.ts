import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory } from '@/lib/server/store';

export async function GET() {
  return NextResponse.json(getAllCategories());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: '카테고리 이름이 필요합니다' }, { status: 400 });
  }
  const category = createCategory({
    name: body.name,
    displayOrder: body.displayOrder ?? 0,
  });
  return NextResponse.json(category, { status: 201 });
}
