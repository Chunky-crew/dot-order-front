import { menuRepository } from '@/lib/server/repositories';
import OrderMenuClient from './OrderMenuClient';

// Cart state depends on tableNumber param; we want fresh menu data each visit.
export const dynamic = 'force-dynamic';

export default async function OrderMenuPage({
  params,
}: {
  params: Promise<{ tableNumber: string }>;
}) {
  const { tableNumber } = await params;
  const categories = menuRepository.getAllCategories();
  const menuItems = menuRepository.getAllMenuItems();
  return (
    <OrderMenuClient
      tableNumberStr={tableNumber}
      initialCategories={categories}
      initialMenuItems={menuItems}
    />
  );
}
