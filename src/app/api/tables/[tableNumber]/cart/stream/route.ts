import { NextRequest } from 'next/server';
import { getTableCart, joinTableCart, leaveTableCart } from '@/lib/server/store';
import { broadcast, isClientConnected, subscribe } from '@/lib/server/cartBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_MS = 15_000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableNumber: string }> },
) {
  const { tableNumber } = await params;
  const n = Number(tableNumber);
  if (!Number.isFinite(n) || n < 1) {
    return new Response('유효한 테이블 번호가 아닙니다', { status: 400 });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get('clientId');
  if (!clientId) {
    return new Response('clientId가 필요합니다', { status: 400 });
  }

  const encoder = new TextEncoder();
  let cleaned = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: string) => {
        if (cleaned) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          // controller closed; cleanup will run via cancel/abort
        }
      };

      // Register subscriber FIRST so the post-join broadcast reaches this client too.
      unsubscribe = subscribe(n, clientId, send);

      // Claim host if eligible, then broadcast snapshot so all subscribers (including
      // this one) see the up-to-date hostClientId.
      const snap = joinTableCart(n, clientId, () => isClientConnected(n, clientId));
      broadcast(n, 'snapshot', JSON.stringify(snap));

      // Heartbeat keeps the connection alive through proxies.
      heartbeat = setInterval(() => {
        send('heartbeat', JSON.stringify({ t: Date.now() }));
      }, HEARTBEAT_MS);

      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        leaveTableCart(n, clientId);
        // Notify remaining subscribers — host may have just gone idle (grace timer started).
        try {
          broadcast(n, 'snapshot', JSON.stringify(getTableCart(n)));
        } catch {
          // table may have no remaining subscribers
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      if (cleaned) return;
      cleaned = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
      leaveTableCart(n, clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
