/**
 * Server-side data access facade.
 *
 * All persistence and mutation now lives behind Repository interfaces in
 * `./repositories`. This file exists so the 12 existing API route handlers
 * (and any future ones) can keep importing simple top-level functions while
 * the underlying storage can be swapped (JSON → DB → external API) by editing
 * only `./repositories/index.ts`. See docs/BACKEND_MIGRATION.md.
 */

import type { CartItem, MenuCategory, MenuItem, Order, TableCartSnapshot } from '@/types';
import {
  cartRepository,
  menuRepository,
  orderRepository,
  tableRepository,
} from './repositories';

// One-time housekeeping: drop menu items whose category was deleted by a
// pre-cascade build of the app (kept here so the rest of the system sees a
// clean state without each consumer worrying about it).
menuRepository.cleanupOrphanMenuItems();

// ─── Categories ──────────────────────────────────────────────────────────────
export function getAllCategories(): MenuCategory[] {
  return menuRepository.getAllCategories();
}
export function createCategory(data: Omit<MenuCategory, 'id'>): MenuCategory {
  return menuRepository.createCategory(data);
}
export function updateCategory(id: string, data: Partial<MenuCategory>): MenuCategory | null {
  return menuRepository.updateCategory(id, data);
}
export function deleteCategory(id: string): boolean {
  return menuRepository.deleteCategory(id);
}

// ─── Menu items ──────────────────────────────────────────────────────────────
export function getAllMenuItems(categoryId?: string): MenuItem[] {
  return menuRepository.getAllMenuItems(categoryId);
}
export function getMenuItem(id: string): MenuItem | null {
  return menuRepository.getMenuItem(id);
}
export function createMenuItem(data: Omit<MenuItem, 'id'>): MenuItem {
  return menuRepository.createMenuItem(data);
}
export function updateMenuItem(id: string, data: Partial<MenuItem>): MenuItem | null {
  return menuRepository.updateMenuItem(id, data);
}
export function deleteMenuItem(id: string): boolean {
  return menuRepository.deleteMenuItem(id);
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export function getAllOrders(status?: string): Order[] {
  return orderRepository.getAllOrders(status);
}
export function createOrder(data: { tableNumber: number; items: Order['items'] }): Order {
  return orderRepository.createOrder(data);
}
export function updateOrderStatus(id: string, status: Order['status']): Order | null {
  return orderRepository.updateOrderStatus(id, status);
}
export function deleteOrder(id: string): boolean {
  return orderRepository.deleteOrder(id);
}

// ─── Tables ──────────────────────────────────────────────────────────────────
export function getTableCount(): number {
  return tableRepository.getTableCount();
}
export function setTableCount(count: number): number {
  return tableRepository.setTableCount(count);
}

// ─── Shared table carts (collaborative; any device at the table may order) ───
export function getTableCart(tableNumber: number): TableCartSnapshot {
  return cartRepository.getCart(tableNumber);
}
export function joinTableCart(
  tableNumber: number,
  clientId: string,
  hostHasActiveConnection: () => boolean,
): TableCartSnapshot {
  return cartRepository.joinCart(tableNumber, clientId, hostHasActiveConnection);
}
export function handleClientDisconnect(
  tableNumber: number,
  clientId: string,
  hostStillConnected: () => boolean,
  pickSuccessor: () => string | null,
): TableCartSnapshot {
  return cartRepository.handleDisconnect(tableNumber, clientId, hostStillConnected, pickSuccessor);
}
export function addCartItemServer(
  tableNumber: number,
  data: Omit<CartItem, 'id' | 'totalPrice'>,
  clientId?: string,
): { item: CartItem; snap: TableCartSnapshot } {
  return cartRepository.addItem(tableNumber, data, clientId);
}
export function updateCartItemQuantity(
  tableNumber: number,
  itemId: string,
  quantity: number,
): TableCartSnapshot | null {
  return cartRepository.updateItemQuantity(tableNumber, itemId, quantity);
}
export function removeCartItemServer(
  tableNumber: number,
  itemId: string,
): TableCartSnapshot | null {
  return cartRepository.removeItem(tableNumber, itemId);
}

export type PlaceOrderResult =
  | { ok: true; order: Order; snap: TableCartSnapshot }
  | { ok: false; error: 'empty' };

export function placeTableOrder(tableNumber: number): PlaceOrderResult {
  const taken = cartRepository.takeOrderItems(tableNumber);
  if (!taken.ok) return { ok: false, error: taken.error };
  const order = orderRepository.createOrder({ tableNumber, items: taken.items });
  return { ok: true, order, snap: taken.snap };
}
