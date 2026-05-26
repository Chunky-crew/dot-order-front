'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CartItem, TableCartSnapshot } from '@/types';

const CLIENT_ID_KEY = 'dot-order-client-id';

function readOrCreateClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export interface UseTableCartReturn {
  ready: boolean;
  clientId: string;
  items: CartItem[];
  hostClientId: string | null;
  isHost: boolean;
  totalPrice: number;
  totalCount: number;
  addItem: (data: Omit<CartItem, 'id' | 'totalPrice'>) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  placeOrder: () => Promise<{ ok: true; orderId: string } | { ok: false; error: string }>;
}

/**
 * Subscribes to the table's shared cart via Server-Sent Events. Every device at
 * the table sees the same cart and any of them may add/update/remove items and
 * place the order. (`hostClientId`/`isHost` are retained as informational SSE
 * state but no longer gate ordering.)
 */
export function useTableCart(tableNumber: number | null): UseTableCartReturn {
  const [clientId, setClientId] = useState<string>('');
  const [snap, setSnap] = useState<TableCartSnapshot | null>(null);

  useEffect(() => {
    setClientId(readOrCreateClientId());
  }, []);

  useEffect(() => {
    if (!clientId || tableNumber === null || !Number.isFinite(tableNumber)) return;

    const url = `/api/tables/${tableNumber}/cart/stream?clientId=${encodeURIComponent(clientId)}`;
    let es: EventSource | null = null;
    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = 500;

    const handleSnapshot = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as TableCartSnapshot;
        setSnap(data);
        backoff = 500;
      } catch {
        // ignore malformed payload
      }
    };

    const connect = () => {
      if (closed) return;
      es = new EventSource(url);
      es.addEventListener('snapshot', handleSnapshot as EventListener);
      es.addEventListener('error', () => {
        es?.close();
        if (closed) return;
        retryTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 5000);
      });
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [clientId, tableNumber]);

  const items = snap?.items ?? [];
  const hostClientId = snap?.hostClientId ?? null;
  const isHost = clientId !== '' && hostClientId === clientId;
  const totalPrice = snap?.totalPrice ?? 0;
  const totalCount = snap?.totalCount ?? 0;

  const addItem = useCallback(
    async (data: Omit<CartItem, 'id' | 'totalPrice'>) => {
      if (tableNumber === null) return;
      const res = await fetch(`/api/tables/${tableNumber}/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, clientId }),
      });
      if (res.ok) {
        const body = (await res.json()) as { snapshot: TableCartSnapshot };
        setSnap(body.snapshot);
      }
    },
    [tableNumber, clientId],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (tableNumber === null) return;
      const res = await fetch(`/api/tables/${tableNumber}/cart/items/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) {
        const body = (await res.json()) as TableCartSnapshot;
        if (Array.isArray(body.items) && typeof body.totalCount === 'number') {
          setSnap(body);
        }
      }
    },
    [tableNumber],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (tableNumber === null) return;
      const res = await fetch(`/api/tables/${tableNumber}/cart/items/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const body = (await res.json()) as TableCartSnapshot;
        if (Array.isArray(body.items) && typeof body.totalCount === 'number') {
          setSnap(body);
        }
      }
    },
    [tableNumber],
  );

  const placeOrder = useCallback(async (): Promise<
    { ok: true; orderId: string } | { ok: false; error: string }
  > => {
    if (tableNumber === null) return { ok: false, error: '테이블 정보가 없습니다' };
    if (!clientId) return { ok: false, error: '연결이 준비되지 않았습니다' };
    const res = await fetch(`/api/tables/${tableNumber}/cart/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error ?? '주문 처리에 실패했습니다' };
    }
    if (data.snapshot) {
      setSnap(data.snapshot as TableCartSnapshot);
    }
    return { ok: true, orderId: data.order.id as string };
  }, [tableNumber, clientId]);

  return {
    ready: snap !== null,
    clientId,
    items,
    hostClientId,
    isHost,
    totalPrice,
    totalCount,
    addItem,
    updateQuantity,
    removeItem,
    placeOrder,
  };
}
