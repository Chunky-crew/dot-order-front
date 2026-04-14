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
  const res = await fetch(`${API_BASE}/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}
