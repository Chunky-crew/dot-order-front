import { NextRequest, NextResponse } from 'next/server';
import { getTableCount, setTableCount } from '@/lib/server/store';

export async function GET() {
  return NextResponse.json({ tables: getTableCount() });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!body.tables || body.tables < 1) {
    return NextResponse.json({ error: '유효한 테이블 수를 입력해주세요' }, { status: 400 });
  }
  const count = setTableCount(body.tables);
  return NextResponse.json({ tables: count });
}
