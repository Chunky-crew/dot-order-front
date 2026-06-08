import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'menu');
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB after base64 decode

const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const dataUrl = (body as { dataUrl?: unknown })?.dataUrl;
  if (typeof dataUrl !== 'string') {
    return NextResponse.json({ error: 'Missing dataUrl' }, { status: 400 });
  }

  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) {
    return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 });
  }

  const [, rawExt, b64] = match;
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, 'base64');
  } catch {
    return NextResponse.json({ error: 'Invalid base64 payload' }, { status: 400 });
  }

  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: 'Empty image' }, { status: 400 });
  }
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large' }, { status: 413 });
  }

  const filename = `${randomUUID()}.${ext}`;
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  } catch (err) {
    console.error('[upload] failed to write image:', err);
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
  }

  return NextResponse.json({ url: `/api/uploads/menu/${filename}` });
}
