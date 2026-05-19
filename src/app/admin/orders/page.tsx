import { orderRepository } from '@/lib/server/repositories';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const orders = orderRepository.getAllOrders();
  return <OrdersClient initialOrders={orders} />;
}
