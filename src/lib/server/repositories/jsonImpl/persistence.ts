import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { CartItem, MenuCategory, MenuItem, Order } from '@/types';
import { seed } from './seed';

export interface PersistedTableCart {
  tableNumber: number;
  items: CartItem[];
  hostClientId: string | null;
  hostLastSeen: number;
  version: number;
}

export interface PersistedState {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  tableCount: number;
  orderCounter: number;
  tableCarts: PersistedTableCart[];
}

export const DATA_DIR = path.join(process.cwd(), 'data');
export const STORE_FILE = path.join(DATA_DIR, 'store.json');

function emptyState(): PersistedState {
  return {
    categories: [],
    menuItems: [],
    orders: [],
    tableCount: 8,
    orderCounter: 0,
    tableCarts: [],
  };
}

function loadFromDisk(): PersistedState | null {
  if (!existsSync(STORE_FILE)) return null;
  try {
    const raw = readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    // Backward compat: older snapshots may lack tableCarts.
    return {
      categories: parsed.categories ?? [],
      menuItems: parsed.menuItems ?? [],
      orders: parsed.orders ?? [],
      tableCount: parsed.tableCount ?? 8,
      orderCounter: parsed.orderCounter ?? 0,
      tableCarts: parsed.tableCarts ?? [],
    };
  } catch (err) {
    console.warn('[persistence] failed to load store.json, falling back to seed:', err);
    return null;
  }
}

function writeToDisk(state: PersistedState): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('[persistence] failed to persist store.json:', err);
  }
}

function initialState(): PersistedState {
  const loaded = loadFromDisk();
  if (loaded) return loaded;
  const seeded = emptyState();
  seed(seeded);
  writeToDisk(seeded);
  return seeded;
}

const state = initialState();

export const db = {
  get state(): PersistedState {
    return state;
  },
  mutate(fn: (s: PersistedState) => void): void {
    fn(state);
    writeToDisk(state);
  },
};
