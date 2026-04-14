'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getCategories, getMenuItems } from '@/lib/api/menu';
import { useCartStore } from '@/stores/cartStore';
import { formatKRW } from '@/lib/utils';
import type { MenuCategory, MenuItem, MenuOption, MenuOptionChoice } from '@/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-white animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col">
      {/* category tab skeleton */}
      <div className="sticky top-[56px] z-20 bg-background border-b border-border px-4 py-2 flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-16 bg-muted rounded-full animate-pulse flex-shrink-0" />
        ))}
      </div>
      {/* grid skeleton */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Placeholder icon when no image ──────────────────────────────────────────

function ImagePlaceholder({ name }: { name: string }) {
  return (
    <div className="aspect-square bg-maroon-50 flex flex-col items-center justify-center text-maroon-300">
      <svg
        className="w-10 h-10 mb-1"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3h10.5A2.25 2.25 0 0119.5 5.25v13.5A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3zm0 0"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5l4.5-4.5 3 3 4-5 4 6"
        />
      </svg>
      <span className="text-xs text-maroon-400 text-center px-2 line-clamp-1">{name}</span>
    </div>
  );
}

// ─── Types for option state ───────────────────────────────────────────────────

type SelectedOptions = Record<string, string[]>; // optionId → [choiceId, ...]

// ─── Option Modal ─────────────────────────────────────────────────────────────

interface OptionModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, selectedOptions: SelectedOptions, quantity: number) => void;
}

function OptionModal({ item, onClose, onAddToCart }: OptionModalProps) {
  const [selected, setSelected] = useState<SelectedOptions>({});
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset state when item changes
  useEffect(() => {
    setSelected({});
    setQuantity(1);
    setValidationError(null);
  }, [item?.id]);

  if (!item) return null;

  // Calculate option price delta
  const optionDelta = item.options.reduce((total, opt) => {
    const choiceIds = selected[opt.id] ?? [];
    return total + opt.choices
      .filter((c) => choiceIds.includes(c.id))
      .reduce((s, c) => s + c.priceModifier, 0);
  }, 0);
  const unitPrice = item.price + optionDelta;
  const totalPrice = unitPrice * quantity;

  function handleRadioChange(optionId: string, choiceId: string) {
    setSelected((prev) => ({ ...prev, [optionId]: [choiceId] }));
    setValidationError(null);
  }

  function handleCheckboxChange(optionId: string, choiceId: string, checked: boolean) {
    setSelected((prev) => {
      const current = prev[optionId] ?? [];
      return {
        ...prev,
        [optionId]: checked
          ? [...current, choiceId]
          : current.filter((id) => id !== choiceId),
      };
    });
    setValidationError(null);
  }

  function handleAddToCart() {
    // Validate required options
    for (const opt of item.options) {
      if (opt.required) {
        const choices = selected[opt.id] ?? [];
        if (choices.length === 0) {
          setValidationError(`'${opt.name}' 항목을 선택해 주세요.`);
          return;
        }
      }
    }
    onAddToCart(item, selected, quantity);
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={item.name}>
      {/* Item summary */}
      <div className="flex gap-3 mb-5 pb-4 border-b border-border">
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImagePlaceholder name={item.name} />
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="font-semibold text-base">{item.name}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <p className="text-maroon-800 font-bold mt-1">{formatKRW(item.price)}</p>
        </div>
      </div>

      {/* Options */}
      {item.options.length > 0 && (
        <div className="space-y-5 mb-5">
          {item.options.map((opt: MenuOption) => (
            <div key={opt.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">{opt.name}</span>
                {opt.required && (
                  <Badge variant="pending">필수</Badge>
                )}
              </div>
              <div className="space-y-2">
                {opt.choices.map((choice: MenuOptionChoice) => {
                  const isSelected = (selected[opt.id] ?? []).includes(choice.id);
                  const inputId = `opt-${opt.id}-${choice.id}`;
                  return (
                    <label
                      key={choice.id}
                      htmlFor={inputId}
                      className={`flex items-center justify-between rounded-lg border px-3 py-3 cursor-pointer transition-colors min-h-[44px] ${
                        isSelected
                          ? 'border-maroon-800 bg-maroon-50'
                          : 'border-border bg-white hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          id={inputId}
                          type={opt.type === 'radio' ? 'radio' : 'checkbox'}
                          name={opt.type === 'radio' ? `option-${opt.id}` : undefined}
                          checked={isSelected}
                          onChange={(e) => {
                            if (opt.type === 'radio') {
                              handleRadioChange(opt.id, choice.id);
                            } else {
                              handleCheckboxChange(opt.id, choice.id, e.target.checked);
                            }
                          }}
                          className="w-4 h-4 accent-maroon-800"
                        />
                        <span className="text-sm">{choice.label}</span>
                      </div>
                      {choice.priceModifier !== 0 && (
                        <span className="text-sm text-muted-foreground">
                          {choice.priceModifier > 0 ? '+' : ''}
                          {formatKRW(choice.priceModifier)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">
          {validationError}
        </p>
      )}

      {/* Quantity selector */}
      <div className="flex items-center justify-between py-4 border-t border-border mb-4">
        <span className="font-medium text-sm">수량</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="수량 줄이기"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold text-base tabular-nums">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            disabled={quantity >= 99}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="수량 늘리기"
          >
            +
          </button>
        </div>
      </div>

      {/* Total + CTA */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">합계</span>
        <span className="font-bold text-lg text-maroon-800">{formatKRW(totalPrice)}</span>
      </div>
      <Button
        variant="primary"
        size="lg"
        className="w-full mt-3"
        onClick={handleAddToCart}
      >
        장바구니 담기
      </Button>
    </Modal>
  );
}

// ─── Menu Item Card ───────────────────────────────────────────────────────────

interface MenuItemCardProps {
  item: MenuItem;
  onTap: (item: MenuItem) => void;
}

function MenuItemCard({ item, onTap }: MenuItemCardProps) {
  return (
    <button
      onClick={() => !item.soldOut && onTap(item)}
      disabled={item.soldOut}
      className={`text-left rounded-xl overflow-hidden border transition-all active:scale-95 w-full ${
        item.soldOut
          ? 'border-border opacity-60 cursor-not-allowed'
          : 'border-border hover:border-maroon-300 hover:shadow-md cursor-pointer'
      }`}
      aria-label={`${item.name} ${item.soldOut ? '(품절)' : ''}`}
    >
      <div className="relative aspect-square bg-muted">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className={`object-cover ${item.soldOut ? 'grayscale' : ''}`}
            sizes="(max-width: 512px) 50vw, 256px"
          />
        ) : (
          <ImagePlaceholder name={item.name} />
        )}
        {item.soldOut && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Badge variant="soldout">품절</Badge>
          </div>
        )}
      </div>
      <div className="p-3 bg-white">
        <p className="font-medium text-sm leading-snug line-clamp-2 mb-1">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{item.description}</p>
        )}
        <p className="font-bold text-sm text-maroon-800">{formatKRW(item.price)}</p>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrderMenuPage() {
  const params = useParams();
  const router = useRouter();
  const tableNumber = params.tableNumber as string;

  const { setTableNumber, addItem, getTotalCount, getTotalPrice } = useCartStore();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const tabsRef = useRef<HTMLDivElement>(null);

  const totalCount = getTotalCount();
  const totalPrice = getTotalPrice();

  // Set table number on mount
  useEffect(() => {
    setTableNumber(Number(tableNumber));
  }, [tableNumber, setTableNumber]);

  // Fetch menu data
  useEffect(() => {
    async function fetchMenu() {
      setLoading(true);
      try {
        const [cats, items] = await Promise.all([getCategories(), getMenuItems()]);
        const sorted = [...cats].sort((a, b) => a.displayOrder - b.displayOrder);
        setCategories(sorted);
        setAllItems(items);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  // Scroll active tab into view
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeEl = tabsRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeCategoryId]);

  const filteredItems = activeCategoryId
    ? allItems.filter((item) => item.categoryId === activeCategoryId)
    : allItems;

  function handleAddToCart(item: MenuItem, selectedOptions: SelectedOptions, quantity: number) {
    const mapped = item.options.flatMap((opt) => {
      const choiceIds = selectedOptions[opt.id] ?? [];
      return opt.choices
        .filter((c) => choiceIds.includes(c.id))
        .map((c) => ({
          optionName: opt.name,
          choiceLabel: c.label,
          priceModifier: c.priceModifier,
        }));
    });

    addItem({
      menuItemId: item.id,
      menuItemName: item.name,
      basePrice: item.price,
      selectedOptions: mapped,
      quantity,
    });
    setSelectedItem(null);
  }

  return (
    <div className="flex flex-col pb-28">
      {/* Category tabs */}
      <div className="sticky top-[56px] z-20 bg-background border-b border-border shadow-sm">
        <div
          ref={tabsRef}
          className="hide-scrollbar flex overflow-x-auto px-4 gap-1 py-2"
        >
          {/* 전체 tab */}
          <button
            data-active={activeCategoryId === null}
            onClick={() => setActiveCategoryId(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
              activeCategoryId === null
                ? 'bg-maroon-800 text-white'
                : 'bg-muted text-muted-foreground hover:bg-maroon-50 hover:text-maroon-800'
            }`}
          >
            전체
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              data-active={activeCategoryId === cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[36px] whitespace-nowrap ${
                activeCategoryId === cat.id
                  ? 'bg-maroon-800 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-maroon-50 hover:text-maroon-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <PageSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <svg
            className="w-12 h-12 mb-3 opacity-40"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm">메뉴가 없습니다.</p>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} onTap={setSelectedItem} />
          ))}
        </div>
      )}

      {/* Option modal */}
      <OptionModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Floating cart button */}
      {totalCount > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4"
        >
          <button
            onClick={() => router.push(`/order/${tableNumber}/cart`)}
            className="w-full bg-maroon-800 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center justify-between active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white text-maroon-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold tabular-nums">
                {totalCount}
              </span>
              <span className="font-semibold text-sm">장바구니 보기</span>
            </div>
            <span className="font-bold text-base tabular-nums">{formatKRW(totalPrice)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
