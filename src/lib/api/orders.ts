import type { Order, CartItem } from '@/types';

const API_BASE = '/api';

export async function getOrders(status?: string): Promise<Order[]> {
  const url = status ? `${API_BASE}/orders?status=${status}` : `${API_BASE}/orders`;
  const res = await fetch(url);
  return res.json();
}

export async function createOrder(data: { tableNumber: number; items: CartItem[] }): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
  // Order IDs use the `#001` format; `#` is the URL fragment delimiter, so it
  // MUST be percent-encoded or the path collapses to `/api/orders/` and hits
  // the wrong route handler.
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function deleteOrder(id: string): Promise<void> {
  // Same `#`-encoding requirement as updateOrderStatus above.
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('주문 삭제 실패');
}
