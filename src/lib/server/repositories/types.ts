// Repository interfaces — swap the JSON implementation for any other persistence layer by
// providing alternative classes that satisfy these contracts.
// See docs/BACKEND_MIGRATION.md.

import type { CartItem, MenuCategory, MenuItem, Order, TableCartSnapshot } from '@/types';

export interface MenuRepository {
  getAllCategories(): MenuCategory[];
  createCategory(data: Omit<MenuCategory, 'id'>): MenuCategory;
  updateCategory(id: string, data: Partial<MenuCategory>): MenuCategory | null;
  /** Cascade-deletes any menu items in this category. */
  deleteCategory(id: string): boolean;
  getAllMenuItems(categoryId?: string): MenuItem[];
  getMenuItem(id: string): MenuItem | null;
  createMenuItem(data: Omit<MenuItem, 'id'>): MenuItem;
  updateMenuItem(id: string, data: Partial<MenuItem>): MenuItem | null;
  deleteMenuItem(id: string): boolean;
  /** Removes menu items whose categoryId no longer exists. Returns true if anything was cleaned. */
  cleanupOrphanMenuItems(): boolean;
}

export interface OrderRepository {
  getAllOrders(status?: string): Order[];
  createOrder(data: { tableNumber: number; items: Order['items'] }): Order;
  updateOrderStatus(id: string, status: Order['status']): Order | null;
}

export interface TableRepository {
  getTableCount(): number;
  setTableCount(count: number): number;
}

export type PlaceCartOrderResult =
  | { ok: true; snap: TableCartSnapshot; items: CartItem[] }
  | { ok: false; error: 'empty' | 'forbidden' | 'no-host' };

export interface CartRepository {
  getCart(tableNumber: number): TableCartSnapshot;
  joinCart(tableNumber: number, clientId: string, hostHasActiveConnection: () => boolean): TableCartSnapshot;
  leaveCart(tableNumber: number, clientId: string): void;
  addItem(
    tableNumber: number,
    data: Omit<CartItem, 'id' | 'totalPrice'>,
    clientId?: string,
  ): { item: CartItem; snap: TableCartSnapshot };
  updateItemQuantity(tableNumber: number, itemId: string, quantity: number): TableCartSnapshot | null;
  removeItem(tableNumber: number, itemId: string): TableCartSnapshot | null;
  /** Validates host + non-empty, drains the cart, returns items for the caller to create an Order from. */
  takeOrderItems(tableNumber: number, clientId: string): PlaceCartOrderResult;
}
