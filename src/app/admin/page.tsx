import { orderRepository } from '@/lib/server/repositories';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const orders = orderRepository.getAllOrders();
  return <DashboardClient initialOrders={orders} />;
}
