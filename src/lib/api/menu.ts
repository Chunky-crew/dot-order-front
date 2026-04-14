import type { MenuCategory, MenuItem } from '@/types';

const API_BASE = '/api';

export async function getCategories(): Promise<MenuCategory[]> {
  const res = await fetch(`${API_BASE}/menu/categories`);
  return res.json();
}

export async function createCategory(data: { name: string; displayOrder: number }): Promise<MenuCategory> {
  const res = await fetch(`${API_BASE}/menu/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateCategory(id: string, data: Partial<MenuCategory>): Promise<MenuCategory> {
  const res = await fetch(`${API_BASE}/menu/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  await fetch(`${API_BASE}/menu/categories/${id}`, { method: 'DELETE' });
}

export async function getMenuItems(categoryId?: string): Promise<MenuItem[]> {
  const url = categoryId
    ? `${API_BASE}/menu/items?categoryId=${categoryId}`
    : `${API_BASE}/menu/items`;
  const res = await fetch(url);
  return res.json();
}

export async function createMenuItem(data: Omit<MenuItem, 'id'>): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/menu/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateMenuItem(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/menu/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteMenuItem(id: string): Promise<void> {
  await fetch(`${API_BASE}/menu/items/${id}`, { method: 'DELETE' });
}
