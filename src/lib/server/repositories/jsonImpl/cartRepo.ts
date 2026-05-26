import type { CartItem, TableCartSnapshot } from '@/types';
import type { CartRepository, PlaceCartOrderResult } from '../types';
import { db, type PersistedTableCart } from './persistence';

const HOST_GRACE_MS = 30_000;

function findCart(tableNumber: number): PersistedTableCart | undefined {
  return db.state.tableCarts.find((c) => c.tableNumber === tableNumber);
}

function getOrCreateCart(state: { tableCarts: PersistedTableCart[] }, tableNumber: number): PersistedTableCart {
  let cart = state.tableCarts.find((c) => c.tableNumber === tableNumber);
  if (!cart) {
    cart = { tableNumber, items: [], hostClientId: null, hostLastSeen: 0, version: 0 };
    state.tableCarts.push(cart);
  }
  return cart;
}

function snapshot(cart: PersistedTableCart): TableCartSnapshot {
  const totalPrice = cart.items.reduce((s, i) => s + i.totalPrice, 0);
  const totalCount = cart.items.reduce((s, i) => s + i.quantity, 0);
  return {
    tableNumber: cart.tableNumber,
    items: cart.items.map((it) => ({ ...it, selectedOptions: [...it.selectedOptions] })),
    hostClientId: cart.hostClientId,
    version: cart.version,
    totalPrice,
    totalCount,
  };
}

function emptySnapshot(tableNumber: number): TableCartSnapshot {
  return { tableNumber, items: [], hostClientId: null, version: 0, totalPrice: 0, totalCount: 0 };
}

export class JsonCartRepository implements CartRepository {
  getCart(tableNumber: number): TableCartSnapshot {
    const cart = findCart(tableNumber);
    return cart ? snapshot(cart) : emptySnapshot(tableNumber);
  }

  joinCart(tableNumber: number, clientId: string, hostHasActiveConnection: () => boolean): TableCartSnapshot {
    let result!: TableCartSnapshot;
    db.mutate((s) => {
      const cart = getOrCreateCart(s, tableNumber);
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
      result = snapshot(cart);
    });
    return result;
  }

  handleDisconnect(
    tableNumber: number,
    clientId: string,
    hostStillConnected: () => boolean,
    pickSuccessor: () => string | null,
  ): TableCartSnapshot {
    let result!: TableCartSnapshot;
    db.mutate((s) => {
      const cart = s.tableCarts.find((c) => c.tableNumber === tableNumber);
      if (!cart) {
        result = emptySnapshot(tableNumber);
        return;
      }
      // Only the host's departure can change who controls checkout.
      if (cart.hostClientId === clientId) {
        const now = Date.now();
        if (hostStillConnected()) {
          // Host has another live connection (e.g. a second tab) — keep the role.
          cart.hostLastSeen = now;
        } else {
          // Auto-succession: promote the longest-present remaining client so the
          // table can keep ordering. If nobody is left, release the role (null)
          // so the next person to connect claims it without waiting out the grace.
          const successor = pickSuccessor();
          cart.hostClientId = successor;
          cart.hostLastSeen = successor ? now : 0;
          cart.version++;
        }
      }
      result = snapshot(cart);
    });
    return result;
  }

  addItem(
    tableNumber: number,
    data: Omit<CartItem, 'id' | 'totalPrice'>,
    clientId?: string,
  ): { item: CartItem; snap: TableCartSnapshot } {
    let result!: { item: CartItem; snap: TableCartSnapshot };
    db.mutate((s) => {
      const cart = getOrCreateCart(s, tableNumber);
      if (cart.hostClientId === null && clientId) {
        cart.hostClientId = clientId;
        cart.hostLastSeen = Date.now();
      }
      const id = `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optionTotal = data.selectedOptions.reduce((sum, o) => sum + o.priceModifier, 0);
      const totalPrice = (data.basePrice + optionTotal) * data.quantity;
      const item: CartItem = { ...data, id, totalPrice };
      cart.items.push(item);
      cart.version++;
      result = { item, snap: snapshot(cart) };
    });
    return result;
  }

  updateItemQuantity(tableNumber: number, itemId: string, quantity: number): TableCartSnapshot | null {
    let result: TableCartSnapshot | null = null;
    db.mutate((s) => {
      const cart = s.tableCarts.find((c) => c.tableNumber === tableNumber);
      if (!cart) return;
      const idx = cart.items.findIndex((i) => i.id === itemId);
      if (idx < 0) return;
      if (quantity < 1) {
        cart.items.splice(idx, 1);
      } else {
        const item = cart.items[idx];
        const optTotal = item.selectedOptions.reduce((sum, o) => sum + o.priceModifier, 0);
        const totalPrice = (item.basePrice + optTotal) * quantity;
        cart.items[idx] = { ...item, quantity, totalPrice };
      }
      cart.version++;
      result = snapshot(cart);
    });
    return result;
  }

  removeItem(tableNumber: number, itemId: string): TableCartSnapshot | null {
    let result: TableCartSnapshot | null = null;
    db.mutate((s) => {
      const cart = s.tableCarts.find((c) => c.tableNumber === tableNumber);
      if (!cart) return;
      const idx = cart.items.findIndex((i) => i.id === itemId);
      if (idx < 0) return;
      cart.items.splice(idx, 1);
      cart.version++;
      result = snapshot(cart);
    });
    return result;
  }

  takeOrderItems(tableNumber: number): PlaceCartOrderResult {
    let result: PlaceCartOrderResult = { ok: false, error: 'empty' };
    db.mutate((s) => {
      const cart = getOrCreateCart(s, tableNumber);
      // Anyone at the table may confirm the order. The only guard is a non-empty
      // cart; because the drain below runs inside a single synchronous mutate,
      // a second concurrent "주문하기" tap finds the cart already empty and gets
      // the friendly empty response — no duplicate orders, no host gate.
      if (cart.items.length === 0) {
        result = { ok: false, error: 'empty' };
        return;
      }
      const drainedItems = cart.items.map((it) => ({
        ...it,
        selectedOptions: [...it.selectedOptions],
      }));
      cart.items = [];
      cart.version++;
      result = { ok: true, items: drainedItems, snap: snapshot(cart) };
    });
    return result;
  }
}
