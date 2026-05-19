import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { CartItem, MenuCategory, MenuItem, Order, TableCartSnapshot } from '@/types';

const categories = new Map<string, MenuCategory>();
const menuItems = new Map<string, MenuItem>();
const orders = new Map<string, Order>();
let tableCount = 8;
let orderCounter = 0;

// ─── Persistence ─────────────────────────────────────────────────────────────
// Cart state (tableCarts, host info) is intentionally NOT persisted — it's
// runtime session state tied to live SSE connections.

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

interface PersistedState {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  tableCount: number;
  orderCounter: number;
}

function loadFromDisk(): PersistedState | null {
  if (!existsSync(STORE_FILE)) return null;
  try {
    const raw = readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(raw) as PersistedState;
  } catch (err) {
    console.warn('[store] failed to load store.json, falling back to seed:', err);
    return null;
  }
}

function persist() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const state: PersistedState = {
      categories: Array.from(categories.values()),
      menuItems: Array.from(menuItems.values()),
      orders: Array.from(orders.values()),
      tableCount,
      orderCounter,
    };
    writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('[store] failed to persist store.json:', err);
  }
}

function hydrate(state: PersistedState) {
  categories.clear();
  menuItems.clear();
  orders.clear();
  state.categories.forEach(c => categories.set(c.id, c));
  state.menuItems.forEach(i => menuItems.set(i.id, i));
  state.orders.forEach(o => orders.set(o.id, o));
  tableCount = state.tableCount;
  orderCounter = state.orderCounter;
}

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
      image: '', description: '깊고 진한 에스프레소에 물을 더한 클래식 커피',
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
      image: '', description: '부드러운 우유와 에스프레소의 조화',
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
      image: '', description: '달콤한 바닐라 시럽이 들어간 라떼',
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
      image: '', description: '풍성한 우유 거품의 이탈리아 정통 커피',
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
      image: '', description: '진한 말차와 부드러운 우유의 만남',
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
      image: '', description: '상큼한 자몽과 탄산의 시원한 조합',
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
      image: '', description: '새콤달콤한 수제 레몬에이드',
      soldOut: false,
      options: [],
    },
    {
      id: 'item-8', categoryId: 'cat-3', name: '크로와상', price: 3500,
      image: '', description: '바삭하고 버터향 가득한 프랑스식 크로와상',
      soldOut: false,
      options: [],
    },
    {
      id: 'item-9', categoryId: 'cat-3', name: '초코 머핀', price: 3800,
      image: '', description: '진한 초콜릿이 가득한 촉촉한 머핀',
      soldOut: false,
      options: [],
    },
    {
      id: 'item-10', categoryId: 'cat-3', name: '치즈케이크', price: 5500,
      image: '', description: '부드럽고 진한 뉴욕 스타일 치즈케이크',
      soldOut: true,
      options: [],
    },
  ];
  items.forEach(i => menuItems.set(i.id, i));
}

function cleanupOrphanMenuItems(): boolean {
  let changed = false;
  for (const [itemId, item] of menuItems) {
    if (!categories.has(item.categoryId)) {
      menuItems.delete(itemId);
      changed = true;
    }
  }
  return changed;
}

// Initialize: prefer persisted state, fall back to seed
{
  const loaded = loadFromDisk();
  if (loaded) {
    hydrate(loaded);
    // Clean up any orphan menu items left behind by older (pre-cascade)
    // category deletes so they stop leaking into "전체 메뉴".
    if (cleanupOrphanMenuItems()) persist();
  } else {
    seed();
    persist();
  }
}

// Categories
export function getAllCategories(): MenuCategory[] {
  return Array.from(categories.values()).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function createCategory(data: Omit<MenuCategory, 'id'>): MenuCategory {
  const id = `cat-${Date.now()}`;
  const category: MenuCategory = { id, ...data };
  categories.set(id, category);
  persist();
  return category;
}

export function updateCategory(id: string, data: Partial<MenuCategory>): MenuCategory | null {
  const existing = categories.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...data, id };
  categories.set(id, updated);
  persist();
  return updated;
}

export function deleteCategory(id: string): boolean {
  const ok = categories.delete(id);
  if (!ok) return false;
  // Cascade: remove menu items that belonged to this category so they don't
  // leak into the "전체 메뉴" view as orphans.
  for (const [itemId, item] of menuItems) {
    if (item.categoryId === id) menuItems.delete(itemId);
  }
  persist();
  return true;
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
  persist();
  return item;
}

export function updateMenuItem(id: string, data: Partial<MenuItem>): MenuItem | null {
  const existing = menuItems.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...data, id };
  menuItems.set(id, updated);
  persist();
  return updated;
}

export function deleteMenuItem(id: string): boolean {
  const ok = menuItems.delete(id);
  if (ok) persist();
  return ok;
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
  persist();
  return order;
}

export function updateOrderStatus(id: string, status: Order['status']): Order | null {
  const existing = orders.get(id);
  if (!existing) return null;
  const updated = { ...existing, status };
  orders.set(id, updated);
  persist();
  return updated;
}

// Tables
export function getTableCount(): number {
  return tableCount;
}

export function setTableCount(count: number): number {
  tableCount = count;
  persist();
  return tableCount;
}

// ─── Shared Table Carts (collaborative, host-gated ordering) ────────────────

interface TableCart {
  items: CartItem[];
  hostClientId: string | null;
  hostLastSeen: number;
  version: number;
}

const tableCarts = new Map<number, TableCart>();
const HOST_GRACE_MS = 30_000;

function getOrCreateCart(tableNumber: number): TableCart {
  let cart = tableCarts.get(tableNumber);
  if (!cart) {
    cart = { items: [], hostClientId: null, hostLastSeen: 0, version: 0 };
    tableCarts.set(tableNumber, cart);
  }
  return cart;
}

function snapshot(tableNumber: number, cart: TableCart): TableCartSnapshot {
  const totalPrice = cart.items.reduce((s, i) => s + i.totalPrice, 0);
  const totalCount = cart.items.reduce((s, i) => s + i.quantity, 0);
  return {
    tableNumber,
    items: cart.items.map(it => ({ ...it, selectedOptions: [...it.selectedOptions] })),
    hostClientId: cart.hostClientId,
    version: cart.version,
    totalPrice,
    totalCount,
  };
}

export function getTableCart(tableNumber: number): TableCartSnapshot {
  return snapshot(tableNumber, getOrCreateCart(tableNumber));
}

/**
 * Called when a client opens an SSE stream. Claims host if the table has none,
 * or if the existing host has been gone past the grace period.
 *
 * `hostHasActiveConnection` is supplied by the route handler from the SSE bus
 * so we don't introduce a circular import here.
 */
export function joinTableCart(
  tableNumber: number,
  clientId: string,
  hostHasActiveConnection: () => boolean,
): TableCartSnapshot {
  const cart = getOrCreateCart(tableNumber);
  const now = Date.now();
  if (cart.hostClientId === clientId) {
    cart.hostLastSeen = now;
  } else if (cart.hostClientId === null) {
    cart.hostClientId = clientId;
    cart.hostLastSeen = now;
    cart.version++;
  } else {
    const stale = !hostHasActiveConnection() && now - cart.hostLastSeen >= HOST_GRACE_MS;
    if (stale) {
      cart.hostClientId = clientId;
      cart.hostLastSeen = now;
      cart.version++;
    }
  }
  return snapshot(tableNumber, cart);
}

/** Called when a client's SSE stream closes; starts the host-grace timer. */
export function leaveTableCart(tableNumber: number, clientId: string): void {
  const cart = tableCarts.get(tableNumber);
  if (!cart) return;
  if (cart.hostClientId === clientId) {
    cart.hostLastSeen = Date.now();
  }
}

export function addCartItemServer(
  tableNumber: number,
  data: Omit<CartItem, 'id' | 'totalPrice'>,
  clientId?: string,
): { item: CartItem; snap: TableCartSnapshot } {
  const cart = getOrCreateCart(tableNumber);
  // If a previous round just ended (host cleared by placeTableOrder), let the
  // first mutator after that claim host so the next order can be confirmed.
  if (cart.hostClientId === null && clientId) {
    cart.hostClientId = clientId;
    cart.hostLastSeen = Date.now();
  }
  const id = `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const optionTotal = data.selectedOptions.reduce((s, o) => s + o.priceModifier, 0);
  const totalPrice = (data.basePrice + optionTotal) * data.quantity;
  const item: CartItem = { ...data, id, totalPrice };
  cart.items.push(item);
  cart.version++;
  return { item, snap: snapshot(tableNumber, cart) };
}

export function updateCartItemQuantity(
  tableNumber: number,
  itemId: string,
  quantity: number,
): TableCartSnapshot | null {
  const cart = tableCarts.get(tableNumber);
  if (!cart) return null;
  const idx = cart.items.findIndex(i => i.id === itemId);
  if (idx < 0) return null;
  if (quantity < 1) {
    cart.items.splice(idx, 1);
  } else {
    const item = cart.items[idx];
    const optTotal = item.selectedOptions.reduce((s, o) => s + o.priceModifier, 0);
    const totalPrice = (item.basePrice + optTotal) * quantity;
    cart.items[idx] = { ...item, quantity, totalPrice };
  }
  cart.version++;
  return snapshot(tableNumber, cart);
}

export function removeCartItemServer(
  tableNumber: number,
  itemId: string,
): TableCartSnapshot | null {
  const cart = tableCarts.get(tableNumber);
  if (!cart) return null;
  const idx = cart.items.findIndex(i => i.id === itemId);
  if (idx < 0) return null;
  cart.items.splice(idx, 1);
  cart.version++;
  return snapshot(tableNumber, cart);
}

export type PlaceOrderResult =
  | { ok: true; order: Order; snap: TableCartSnapshot }
  | { ok: false; error: 'empty' | 'forbidden' | 'no-host' };

/**
 * Place the table's cart as an Order. Only the host may call this.
 * On success, clears the cart and resets host so the next session can have a new host.
 */
export function placeTableOrder(tableNumber: number, clientId: string): PlaceOrderResult {
  const cart = getOrCreateCart(tableNumber);
  if (cart.items.length === 0) return { ok: false, error: 'empty' };
  if (cart.hostClientId === null) return { ok: false, error: 'no-host' };
  if (cart.hostClientId !== clientId) return { ok: false, error: 'forbidden' };
  const order = createOrder({ tableNumber, items: cart.items });
  cart.items = [];
  cart.hostClientId = null;
  cart.hostLastSeen = 0;
  cart.version++;
  return { ok: true, order, snap: snapshot(tableNumber, cart) };
}
