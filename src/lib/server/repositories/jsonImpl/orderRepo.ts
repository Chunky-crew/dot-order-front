import type { Order } from '@/types';
import type { OrderRepository } from '../types';
import { db } from './persistence';

export class JsonOrderRepository implements OrderRepository {
  getAllOrders(status?: string): Order[] {
    const all = [...db.state.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (status) return all.filter((o) => o.status === status);
    return all;
  }

  createOrder(data: { tableNumber: number; items: Order['items'] }): Order {
    let created!: Order;
    db.mutate((s) => {
      s.orderCounter += 1;
      const id = `#${String(s.orderCounter).padStart(3, '0')}`;
      const totalPrice = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const order: Order = {
        id,
        tableNumber: data.tableNumber,
        items: data.items,
        totalPrice,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      s.orders.push(order);
      created = order;
    });
    return created;
  }

  updateOrderStatus(id: string, status: Order['status']): Order | null {
    let updated: Order | null = null;
    db.mutate((s) => {
      const idx = s.orders.findIndex((o) => o.id === id);
      if (idx < 0) return;
      const next = { ...s.orders[idx], status };
      s.orders[idx] = next;
      updated = next;
    });
    return updated;
  }
}
