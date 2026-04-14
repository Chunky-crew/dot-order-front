import type { MenuCategory, MenuItem, Order } from '@/types';

const categories = new Map<string, MenuCategory>();
const menuItems = new Map<string, MenuItem>();
const orders = new Map<string, Order>();
let tableCount = 8;
let orderCounter = 0;

function seed() {
  if (categories.size > 0) return;

  const cats: MenuCategory[] = [
    { id: 'cat-1', name: '커피', displayOrder: 1 },
    { id: 'cat-2', name: '음료', displayOrder: 2 },
    { id: 'cat-3', name: '베이커리', displayOrder: 3 },
  ];
  cats.forEach(c => categories.set(c.id, c));

  const items: MenuItem[] = [
    {
      id: 'item-1', categoryId: 'cat-1', name: '아메리카노', price: 4000,
      image: '/images/menu/americano.jpg', description: '깊고 진한 에스프레소에 물을 더한 클래식 커피',
      soldOut: false,
      options: [
        { id: 'opt-1', name: '온도', type: 'radio', required: true, choices: [
          { id: 'ch-1', label: 'HOT', priceModifier: 0 },
          { id: 'ch-2', label: 'ICE', priceModifier: 0 },
        ]},
        { id: 'opt-2', name: '사이즈', type: 'radio', required: true, choices: [
          { id: 'ch-3', label: 'Regular', priceModifier: 0 },
          { id: 'ch-4', label: 'Large', priceModifier: 500 },
        ]},
      ],
    },
    {
      id: 'item-2', categoryId: 'cat-1', name: '카페라떼', price: 4500,
      image: '/images/menu/latte.jpg', description: '부드러운 우유와 에스프레소의 조화',
      soldOut: false,
      options: [
        { id: 'opt-3', name: '온도', type: 'radio', required: true, choices: [
          { id: 'ch-5', label: 'HOT', priceModifier: 0 },
          { id: 'ch-6', label: 'ICE', priceModifier: 0 },
        ]},
        { id: 'opt-4', name: '사이즈', type: 'radio', required: true, choices: [
          { id: 'ch-7', label: 'Regular', priceModifier: 0 },
          { id: 'ch-8', label: 'Large', priceModifier: 500 },
        ]},
      ],
    },
    {
      id: 'item-3', categoryId: 'cat-1', name: '바닐라라떼', price: 5000,
      image: '/images/menu/vanilla-latte.jpg', description: '달콤한 바닐라 시럽이 들어간 라떼',
      soldOut: false,
      options: [
        { id: 'opt-5', name: '온도', type: 'radio', required: true, choices: [
          { id: 'ch-9', label: 'HOT', priceModifier: 0 },
          { id: 'ch-10', label: 'ICE', priceModifier: 0 },
        ]},
      ],
    },
    {
      id: 'item-4', categoryId: 'cat-1', name: '카푸치노', price: 4500,
      image: '/images/menu/cappuccino.jpg', description: '풍성한 우유 거품의 이탈리아 정통 커피',
      soldOut: false,
      options: [
        { id: 'opt-6', name: '사이즈', type: 'radio', required: true, choices: [
          { id: 'ch-11', label: 'Regular', priceModifier: 0 },
          { id: 'ch-12', label: 'Large', priceModifier: 500 },
        ]},
      ],
    },
    {
      id: 'item-5', categoryId: 'cat-2', name: '녹차라떼', price: 5000,
      image: '/images/menu/green-tea.jpg', description: '진한 말차와 부드러운 우유의 만남',
      soldOut: false,
      options: [
        { id: 'opt-7', name: '온도', type: 'radio', required: true, choices: [
          { id: 'ch-13', label: 'HOT', priceModifier: 0 },
          { id: 'ch-14', label: 'ICE', priceModifier: 0 },
        ]},
      ],
    },
    {
      id: 'item-6', categoryId: 'cat-2', name: '자몽에이드', price: 5500,
      image: '/images/menu/grapefruit.jpg', description: '상큼한 자몽과 탄산의 시원한 조합',
      soldOut: false,
      options: [
        { id: 'opt-8', name: '토핑', type: 'checkbox', required: false, choices: [
          { id: 'ch-15', label: '알로에 추가', priceModifier: 500 },
          { id: 'ch-16', label: '코코넛 추가', priceModifier: 500 },
        ]},
      ],
    },
    {
      id: 'item-7', categoryId: 'cat-2', name: '레몬에이드', price: 5000,
      image: '/images/menu/lemonade.jpg', description: '새콤달콤한 수제 레몬에이드',
      soldOut: false,
      options: [],
    },
    {
      id: 'item-8', categoryId: 'cat-3', name: '크로와상', price: 3500,
      image: '/images/menu/croissant.jpg', description: '바삭하고 버터향 가득한 프랑스식 크로와상',
      soldOut: false,
      options: [],
    },
    {
      id: 'item-9', categoryId: 'cat-3', name: '초코 머핀', price: 3800,
      image: '/images/menu/muffin.jpg', description: '진한 초콜릿이 가득한 촉촉한 머핀',
      soldOut: false,
      options: [],
    },
    {
      id: 'item-10', categoryId: 'cat-3', name: '치즈케이크', price: 5500,
      image: '/images/menu/cheesecake.jpg', description: '부드럽고 진한 뉴욕 스타일 치즈케이크',
      soldOut: true,
      options: [],
    },
  ];
  items.forEach(i => menuItems.set(i.id, i));
}

seed();

// Categories
export function getAllCategories(): MenuCategory[] {
  return Array.from(categories.values()).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function createCategory(data: Omit<MenuCategory, 'id'>): MenuCategory {
  const id = `cat-${Date.now()}`;
  const category: MenuCategory = { id, ...data };
  categories.set(id, category);
  return category;
}

export function updateCategory(id: string, data: Partial<MenuCategory>): MenuCategory | null {
  const existing = categories.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...data, id };
  categories.set(id, updated);
  return updated;
}

export function deleteCategory(id: string): boolean {
  return categories.delete(id);
}

// Menu Items
export function getAllMenuItems(categoryId?: string): MenuItem[] {
  const all = Array.from(menuItems.values());
  if (categoryId) return all.filter(i => i.categoryId === categoryId);
  return all;
}

export function getMenuItem(id: string): MenuItem | null {
  return menuItems.get(id) || null;
}

export function createMenuItem(data: Omit<MenuItem, 'id'>): MenuItem {
  const id = `item-${Date.now()}`;
  const item: MenuItem = { id, ...data };
  menuItems.set(id, item);
  return item;
}

export function updateMenuItem(id: string, data: Partial<MenuItem>): MenuItem | null {
  const existing = menuItems.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...data, id };
  menuItems.set(id, updated);
  return updated;
}

export function deleteMenuItem(id: string): boolean {
  return menuItems.delete(id);
}

// Orders
export function getAllOrders(status?: string): Order[] {
  const all = Array.from(orders.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (status) return all.filter(o => o.status === status);
  return all;
}

export function createOrder(data: { tableNumber: number; items: Order['items'] }): Order {
  orderCounter++;
  const id = `#${String(orderCounter).padStart(3, '0')}`;
  const totalPrice = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const order: Order = {
    id,
    tableNumber: data.tableNumber,
    items: data.items,
    totalPrice,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.set(id, order);
  return order;
}

export function updateOrderStatus(id: string, status: Order['status']): Order | null {
  const existing = orders.get(id);
  if (!existing) return null;
  const updated = { ...existing, status };
  orders.set(id, updated);
  return updated;
}

// Tables
export function getTableCount(): number {
  return tableCount;
}

export function setTableCount(count: number): number {
  tableCount = count;
  return tableCount;
}
