'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { Input, Textarea, Select } from '@/components/ui/Input';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '@/lib/api/menu';
import { formatKRW } from '@/lib/utils';
import type { MenuCategory, MenuItem, MenuOption, MenuOptionChoice } from '@/types';

// ─── Category Modal ───────────────────────────────────────────────────────────

interface CategoryFormState {
  name: string;
  displayOrder: string;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: MenuCategory | null;
}

function CategoryModal({ isOpen, onClose, onSaved, editing }: CategoryModalProps) {
  const [form, setForm] = useState<CategoryFormState>({ name: '', displayOrder: '0' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        editing
          ? { name: editing.name, displayOrder: String(editing.displayOrder) }
          : { name: '', displayOrder: '0' }
      );
    }
  }, [isOpen, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { name: form.name.trim(), displayOrder: Number(form.displayOrder) };
      if (editing) {
        await updateCategory(editing.id, data);
      } else {
        await createCategory(data);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? '카테고리 수정' : '카테고리 추가'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="카테고리 이름"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="예: 커피, 논커피, 디저트"
          required
        />
        <Input
          label="표시 순서"
          type="number"
          value={form.displayOrder}
          onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
          min={0}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Option Editor (inside MenuItem modal) ───────────────────────────────────

interface OptionEditorProps {
  options: MenuOption[];
  onChange: (options: MenuOption[]) => void;
}

function OptionEditor({ options, onChange }: OptionEditorProps) {
  function addOption() {
    const newOpt: MenuOption = {
      id: `opt-${Date.now()}`,
      name: '',
      type: 'radio',
      required: false,
      choices: [],
    };
    onChange([...options, newOpt]);
  }

  function removeOption(optId: string) {
    onChange(options.filter((o) => o.id !== optId));
  }

  function updateOption(optId: string, patch: Partial<MenuOption>) {
    onChange(options.map((o) => (o.id === optId ? { ...o, ...patch } : o)));
  }

  function addChoice(optId: string) {
    const newChoice: MenuOptionChoice = {
      id: `ch-${Date.now()}`,
      label: '',
      priceModifier: 0,
    };
    onChange(
      options.map((o) =>
        o.id === optId ? { ...o, choices: [...o.choices, newChoice] } : o
      )
    );
  }

  function removeChoice(optId: string, choiceId: string) {
    onChange(
      options.map((o) =>
        o.id === optId
          ? { ...o, choices: o.choices.filter((c) => c.id !== choiceId) }
          : o
      )
    );
  }

  function updateChoice(optId: string, choiceId: string, patch: Partial<MenuOptionChoice>) {
    onChange(
      options.map((o) =>
        o.id === optId
          ? {
              ...o,
              choices: o.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)),
            }
          : o
      )
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">옵션 설정</span>
        <Button type="button" variant="ghost" size="sm" onClick={addOption}>
          + 옵션 추가
        </Button>
      </div>

      {options.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
          등록된 옵션이 없습니다.
        </p>
      )}

      {options.map((opt) => (
        <div key={opt.id} className="border border-border rounded-lg p-3 space-y-2 bg-muted">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-800/20 focus:border-maroon-800 bg-white"
              placeholder="옵션 이름 (예: 온도 선택)"
              value={opt.name}
              onChange={(e) => updateOption(opt.id, { name: e.target.value })}
            />
            <select
              className="rounded border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-800/20 focus:border-maroon-800 bg-white"
              value={opt.type}
              onChange={(e) => updateOption(opt.id, { type: e.target.value as 'radio' | 'checkbox' })}
            >
              <option value="radio">단일 선택</option>
              <option value="checkbox">복수 선택</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
              <input
                type="checkbox"
                checked={opt.required}
                onChange={(e) => updateOption(opt.id, { required: e.target.checked })}
                className="accent-maroon-800"
              />
              필수
            </label>
            <button
              type="button"
              onClick={() => removeOption(opt.id)}
              className="text-red-500 hover:text-red-700 text-lg leading-none"
              title="옵션 삭제"
            >
              &times;
            </button>
          </div>

          {/* Choices */}
          <div className="pl-2 space-y-1">
            {opt.choices.map((choice) => (
              <div key={choice.id} className="flex items-center gap-2">
                <input
                  className="flex-1 rounded border border-border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-maroon-800/20 focus:border-maroon-800 bg-white"
                  placeholder="선택지 이름 (예: 아이스)"
                  value={choice.label}
                  onChange={(e) => updateChoice(opt.id, choice.id, { label: e.target.value })}
                />
                <input
                  type="number"
                  className="w-24 rounded border border-border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-maroon-800/20 focus:border-maroon-800 bg-white"
                  placeholder="가격 변동"
                  value={choice.priceModifier}
                  onChange={(e) =>
                    updateChoice(opt.id, choice.id, { priceModifier: Number(e.target.value) })
                  }
                />
                <span className="text-xs text-muted-foreground">원</span>
                <button
                  type="button"
                  onClick={() => removeChoice(opt.id, choice.id)}
                  className="text-red-400 hover:text-red-600 text-base leading-none"
                  title="선택지 삭제"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addChoice(opt.id)}
              className="text-xs text-maroon-800 hover:text-maroon-600 font-medium mt-1"
            >
              + 선택지 추가
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MenuItem Modal ───────────────────────────────────────────────────────────

interface MenuItemFormState {
  name: string;
  price: string;
  description: string;
  image: string;
  soldOut: boolean;
  categoryId: string;
  options: MenuOption[];
}

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: MenuItem | null;
  categories: MenuCategory[];
  defaultCategoryId: string;
}

function MenuItemModal({
  isOpen,
  onClose,
  onSaved,
  editing,
  categories,
  defaultCategoryId,
}: MenuItemModalProps) {
  const [form, setForm] = useState<MenuItemFormState>({
    name: '',
    price: '',
    description: '',
    image: '',
    soldOut: false,
    categoryId: defaultCategoryId,
    options: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        editing
          ? {
              name: editing.name,
              price: String(editing.price),
              description: editing.description,
              image: editing.image,
              soldOut: editing.soldOut,
              categoryId: editing.categoryId,
              options: editing.options,
            }
          : {
              name: '',
              price: '',
              description: '',
              image: '',
              soldOut: false,
              categoryId: defaultCategoryId,
              options: [],
            }
      );
    }
  }, [isOpen, editing, defaultCategoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Omit<MenuItem, 'id'> = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim(),
        image: form.image.trim(),
        soldOut: form.soldOut,
        categoryId: form.categoryId,
        options: form.options,
      };
      if (editing) {
        await updateMenuItem(editing.id, data);
      } else {
        await createMenuItem(data);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? '메뉴 수정' : '메뉴 추가'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="카테고리"
          options={categoryOptions}
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
        />
        <Input
          label="메뉴 이름"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="예: 아메리카노"
          required
        />
        <Input
          label="가격 (원)"
          type="number"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          placeholder="예: 4500"
          min={0}
          required
        />
        <Textarea
          label="설명"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="메뉴 설명을 입력하세요."
        />
        <Input
          label="이미지 URL"
          value={form.image}
          onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
          placeholder="https://..."
        />
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={form.soldOut}
            onChange={(e) => setForm((f) => ({ ...f, soldOut: e.target.checked }))}
            className="accent-maroon-800 w-4 h-4"
          />
          품절 표시
        </label>

        <div className="border-t border-border pt-4">
          <OptionEditor
            options={form.options}
            onChange={(options) => setForm((f) => ({ ...f, options }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  // MenuItem modal state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const loadCategories = useCallback(async () => {
    const cats = await getCategories();
    const sorted = [...cats].sort((a, b) => a.displayOrder - b.displayOrder);
    setCategories(sorted);
    return sorted;
  }, []);

  const loadItems = useCallback(async (categoryId?: string) => {
    const items = await getMenuItems(categoryId);
    setMenuItems(items);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const cats = await loadCategories();
      if (cats.length > 0) {
        const first = cats[0].id;
        setSelectedCategoryId(first);
        await loadItems(first);
      } else {
        await loadItems();
      }
      setLoading(false);
    }
    init();
  }, [loadCategories, loadItems]);

  async function handleSelectCategory(id: string) {
    setSelectedCategoryId(id);
    await loadItems(id);
  }

  async function handleShowAll() {
    setSelectedCategoryId(null);
    await loadItems();
  }

  // Category actions
  function openAddCategory() {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  }

  function openEditCategory(cat: MenuCategory) {
    setEditingCategory(cat);
    setCategoryModalOpen(true);
  }

  async function handleDeleteCategory(cat: MenuCategory) {
    if (!confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?\n해당 카테고리의 메뉴도 함께 삭제될 수 있습니다.`)) return;
    await deleteCategory(cat.id);
    const cats = await loadCategories();
    if (selectedCategoryId === cat.id) {
      const next = cats[0]?.id ?? null;
      setSelectedCategoryId(next);
      await loadItems(next ?? undefined);
    }
  }

  async function handleCategorySaved() {
    await loadCategories();
  }

  // MenuItem actions
  function openAddItem() {
    setEditingItem(null);
    setItemModalOpen(true);
  }

  function openEditItem(item: MenuItem) {
    setEditingItem(item);
    setItemModalOpen(true);
  }

  async function handleDeleteItem(item: MenuItem) {
    if (!confirm(`"${item.name}" 메뉴를 삭제하시겠습니까?`)) return;
    await deleteMenuItem(item.id);
    await loadItems(selectedCategoryId ?? undefined);
  }

  async function handleItemSaved() {
    await loadItems(selectedCategoryId ?? undefined);
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const displayedItems = selectedCategoryId
    ? menuItems.filter((item) => item.categoryId === selectedCategoryId)
    : menuItems;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* ── Left Panel: Categories ── */}
      <aside className="w-56 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">카테고리</h2>
          <Button size="sm" variant="primary" onClick={openAddCategory}>
            + 추가
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {/* All categories option */}
          <button
            onClick={handleShowAll}
            className={`w-full text-left px-4 py-3 text-sm border-b border-border transition-colors ${
              selectedCategoryId === null
                ? 'bg-maroon-50 text-maroon-800 font-semibold'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            전체 메뉴
          </button>

          {categories.length === 0 && (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">
              카테고리가 없습니다.
            </p>
          )}

          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 transition-colors ${
                selectedCategoryId === cat.id
                  ? 'bg-maroon-50'
                  : 'hover:bg-muted'
              }`}
            >
              <button
                onClick={() => handleSelectCategory(cat.id)}
                className={`flex-1 text-left text-sm ${
                  selectedCategoryId === cat.id
                    ? 'text-maroon-800 font-semibold'
                    : 'text-foreground'
                }`}
              >
                {cat.name}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditCategory(cat)}
                  className="p-1 text-muted-foreground hover:text-maroon-800 text-xs"
                  title="수정"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-1 text-muted-foreground hover:text-red-600 text-xs"
                  title="삭제"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right Panel: Menu Items ── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {selectedCategory ? selectedCategory.name : '전체 메뉴'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              총 {displayedItems.length}개 메뉴
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={openAddItem}>
            + 메뉴 추가
          </Button>
        </div>

        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-border py-16 text-center">
            <p className="text-muted-foreground text-sm">등록된 메뉴가 없습니다.</p>
            <Button size="sm" variant="ghost" className="mt-3" onClick={openAddItem}>
              + 첫 메뉴 추가하기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                categoryName={categories.find((c) => c.id === item.categoryId)?.name}
                onEdit={() => openEditItem(item)}
                onDelete={() => handleDeleteItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSaved={handleCategorySaved}
        editing={editingCategory}
      />

      <MenuItemModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        onSaved={handleItemSaved}
        editing={editingItem}
        categories={categories}
        defaultCategoryId={selectedCategoryId ?? categories[0]?.id ?? ''}
      />
    </div>
  );
}

// ─── MenuItem Card ────────────────────────────────────────────────────────────

interface MenuItemCardProps {
  item: MenuItem;
  categoryName?: string;
  onEdit: () => void;
  onDelete: () => void;
}

function MenuItemCard({ item, categoryName, onEdit, onDelete }: MenuItemCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      {item.image ? (
        <div className="relative h-36 bg-muted overflow-hidden shrink-0">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="h-36 bg-muted flex items-center justify-center shrink-0">
          <span className="text-3xl">☕</span>
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
            {categoryName && (
              <p className="text-xs text-muted-foreground">{categoryName}</p>
            )}
          </div>
          <div className="shrink-0">
            {item.soldOut && <Badge variant="soldout">품절</Badge>}
          </div>
        </div>

        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-bold text-maroon-800">{formatKRW(item.price)}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={onEdit}>
              수정
            </Button>
            <Button size="sm" variant="danger" onClick={onDelete}>
              삭제
            </Button>
          </div>
        </div>

        {item.options.length > 0 && (
          <p className="text-xs text-muted-foreground">
            옵션 {item.options.length}개
          </p>
        )}
      </div>
    </div>
  );
}
