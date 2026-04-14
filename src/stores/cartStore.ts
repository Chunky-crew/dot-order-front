'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';
import { calculateCartItemTotal } from '@/lib/utils';

interface CartState {
  tableNumber: number | null;
  items: CartItem[];
  setTableNumber: (num: number) => void;
  addItem: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tableNumber: null,
      items: [],

      setTableNumber: (num) => set({ tableNumber: num }),

      addItem: (item) => {
        const id = `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const totalPrice = calculateCartItemTotal(item.basePrice, item.selectedOptions, item.quantity);
        set((state) => ({
          items: [...state.items, { ...item, id, totalPrice }],
        }));
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== cartItemId),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity < 1) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === cartItemId
              ? { ...i, quantity, totalPrice: calculateCartItemTotal(i.basePrice, i.selectedOptions, quantity) }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [], tableNumber: null }),

      getTotalPrice: () => get().items.reduce((sum, i) => sum + i.totalPrice, 0),

      getTotalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'dot-order-cart' }
  )
);
