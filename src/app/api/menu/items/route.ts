import { NextRequest, NextResponse } from 'next/server';
import { getAllMenuItems, createMenuItem } from '@/lib/server/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId') || undefined;
  return NextResponse.json(getAllMenuItems(categoryId));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || !body.categoryId || body.price == null) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 });
  }
  const item = createMenuItem({
    categoryId: body.categoryId,
    name: body.name,
    price: body.price,
    image: body.image || '/images/menu/default.jpg',
    description: body.description || '',
    soldOut: body.soldOut || false,
    options: body.options || [],
  });
  return NextResponse.json(item, { status: 201 });
}
