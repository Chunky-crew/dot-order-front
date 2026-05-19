import type { MenuCategory, MenuItem } from '@/types';
import type { MenuRepository } from '../types';
import { db } from './persistence';

export class JsonMenuRepository implements MenuRepository {
  getAllCategories(): MenuCategory[] {
    return [...db.state.categories].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  createCategory(data: Omit<MenuCategory, 'id'>): MenuCategory {
    const category: MenuCategory = { id: `cat-${Date.now()}`, ...data };
    db.mutate((s) => {
      s.categories.push(category);
    });
    return category;
  }

  updateCategory(id: string, data: Partial<MenuCategory>): MenuCategory | null {
    let updated: MenuCategory | null = null;
    db.mutate((s) => {
      const idx = s.categories.findIndex((c) => c.id === id);
      if (idx < 0) return;
      const next = { ...s.categories[idx], ...data, id };
      s.categories[idx] = next;
      updated = next;
    });
    return updated;
  }

  deleteCategory(id: string): boolean {
    let removed = false;
    db.mutate((s) => {
      const before = s.categories.length;
      s.categories = s.categories.filter((c) => c.id !== id);
      if (s.categories.length === before) return;
      // Cascade: drop items in this category so they don't leak into "전체 메뉴".
      s.menuItems = s.menuItems.filter((i) => i.categoryId !== id);
      removed = true;
    });
    return removed;
  }

  getAllMenuItems(categoryId?: string): MenuItem[] {
    const all = db.state.menuItems;
    if (categoryId) return all.filter((i) => i.categoryId === categoryId);
    return [...all];
  }

  getMenuItem(id: string): MenuItem | null {
    return db.state.menuItems.find((i) => i.id === id) ?? null;
  }

  createMenuItem(data: Omit<MenuItem, 'id'>): MenuItem {
    const item: MenuItem = { id: `item-${Date.now()}`, ...data };
    db.mutate((s) => {
      s.menuItems.push(item);
    });
    return item;
  }

  updateMenuItem(id: string, data: Partial<MenuItem>): MenuItem | null {
    let updated: MenuItem | null = null;
    db.mutate((s) => {
      const idx = s.menuItems.findIndex((i) => i.id === id);
      if (idx < 0) return;
      const next = { ...s.menuItems[idx], ...data, id };
      s.menuItems[idx] = next;
      updated = next;
    });
    return updated;
  }

  deleteMenuItem(id: string): boolean {
    let removed = false;
    db.mutate((s) => {
      const before = s.menuItems.length;
      s.menuItems = s.menuItems.filter((i) => i.id !== id);
      removed = s.menuItems.length !== before;
    });
    return removed;
  }

  cleanupOrphanMenuItems(): boolean {
    let changed = false;
    db.mutate((s) => {
      const validCategoryIds = new Set(s.categories.map((c) => c.id));
      const before = s.menuItems.length;
      s.menuItems = s.menuItems.filter((i) => validCategoryIds.has(i.categoryId));
      changed = s.menuItems.length !== before;
    });
    return changed;
  }
}
