'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTableCart } from '@/hooks/useTableCart';
import { formatKRW } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { CartItem } from '@/types';

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const tableNumberStr = params.tableNumber as string;
  const tableNumber = Number(tableNumberStr);

  const cart = useTableCart(Number.isFinite(tableNumber) ? tableNumber : null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  if (!cart.ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = cart.items;
  const totalPrice = cart.totalPrice;
  const totalCount = cart.totalCount;

  async function handlePlaceOrder() {
    setIsOrdering(true);
    setOrderError(null);
    const result = await cart.placeOrder();
    if (!result.ok) {
      setOrderError(result.error);
      setIsOrdering(false);
      return;
    }
    setShowConfirm(false);
    router.push(`/order/${tableNumberStr}/complete?orderId=${encodeURIComponent(result.orderId)}`);
  }

  function handleDecrement(item: CartItem) {
    if (item.quantity === 1) {
      setRemoveConfirmId(item.id);
    } else {
      cart.updateQuantity(item.id, item.quantity - 1);
    }
  }

  function handleConfirmRemove() {
    if (removeConfirmId) {
      cart.removeItem(removeConfirmId);
      setRemoveConfirmId(null);
    }
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-20 h-20 rounded-full bg-maroon-50 flex items-center justify-center">
            <svg className="w-10 h-10 text-maroon-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.874-7.148a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-foreground">장바구니가 비어있습니다</p>
          <p className="text-sm text-muted-foreground">메뉴를 선택해 주세요</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full max-w-xs"
          onClick={() => router.push(`/order/${tableNumberStr}`)}
        >
          메뉴로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Page content with bottom padding for fixed button */}
      <div className="pb-28">

        {/* Back button / header */}
        <div className="sticky top-0 z-20 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/order/${tableNumberStr}`)}
            className="flex items-center justify-center w-10 h-10 -ml-1 rounded-full hover:bg-muted transition-colors"
            aria-label="뒤로가기"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">장바구니</h1>
            <p className="text-xs text-muted-foreground">메뉴로 돌아가기</p>
          </div>
          <span className="ml-auto bg-maroon-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {totalCount}
          </span>
        </div>

        {/* Host status banner */}
        <div
          className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-xs ${
            cart.isHost
              ? 'bg-maroon-50 border-maroon-200 text-maroon-800'
              : 'bg-muted border-border text-muted-foreground'
          }`}
        >
          {cart.isHost
            ? '이 기기가 호스트입니다 — 주문 확정은 이 기기에서만 가능합니다.'
            : '주문 확정은 호스트(첫 접속 기기)만 가능합니다. 메뉴 추가/수량 변경/삭제는 자유롭게 하실 수 있어요.'}
        </div>

        {/* Cart items */}
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-base leading-tight">{item.menuItemName}</p>

                  {/* Selected options */}
                  {item.selectedOptions.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {item.selectedOptions.map((opt, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                          <span>{opt.optionName}: {opt.choiceLabel}</span>
                          {opt.priceModifier !== 0 && (
                            <span className="text-maroon-700 font-medium">
                              ({opt.priceModifier > 0 ? '+' : ''}{formatKRW(opt.priceModifier)})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleDecrement(item)}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
                      aria-label="수량 줄이기"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="w-8 text-center font-semibold text-base tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
                      aria-label="수량 늘리기"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Price + delete */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => setRemoveConfirmId(item.id)}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <p className="font-bold text-foreground text-base tabular-nums">{formatKRW(item.totalPrice)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Order summary */}
        <div className="mx-4 mt-4 rounded-xl bg-muted p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground mb-3">주문 요약</h2>
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[60%]">
                {item.menuItemName} × {item.quantity}
              </span>
              <span className="font-medium tabular-nums">{formatKRW(item.totalPrice)}</span>
            </div>
          ))}
          <div className="pt-3 mt-1 border-t border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">합계 ({totalCount}개)</span>
            <span className="text-lg font-bold text-maroon-800 tabular-nums">{formatKRW(totalPrice)}</span>
          </div>
        </div>
      </div>

      {/* Fixed order button — host only */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 pb-safe-bottom bg-white border-t border-border pt-3 pb-4 z-30">
        {cart.isHost ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isOrdering || items.length === 0}
            className="w-full h-14 rounded-xl bg-maroon-800 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg active:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isOrdering ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>주문 처리 중...</span>
              </>
            ) : (
              <span>{formatKRW(totalPrice)} 주문하기</span>
            )}
          </button>
        ) : (
          <div className="w-full h-14 rounded-xl bg-muted text-muted-foreground font-medium text-sm flex items-center justify-center text-center px-3">
            주문 확정은 호스트(첫 접속 기기)에서만 가능합니다.
          </div>
        )}
      </div>

      {/* Order confirmation modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => { if (!isOrdering) setShowConfirm(false); }}
        title="주문 확인"
      >
        <div className="space-y-4">
          <p className="text-base text-foreground">주문을 확정하시겠습니까?</p>

          <div className="rounded-lg bg-muted p-3 space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.menuItemName} × {item.quantity}</span>
                <span className="font-medium tabular-nums">{formatKRW(item.totalPrice)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-border flex justify-between font-bold">
              <span>총 금액</span>
              <span className="text-maroon-800 tabular-nums">{formatKRW(totalPrice)}</span>
            </div>
          </div>

          {orderError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{orderError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setShowConfirm(false)}
              disabled={isOrdering}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handlePlaceOrder}
              disabled={isOrdering}
            >
              {isOrdering ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  처리 중...
                </span>
              ) : (
                '주문하기'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove item confirmation modal */}
      <Modal
        isOpen={removeConfirmId !== null}
        onClose={() => setRemoveConfirmId(null)}
        title="메뉴 삭제"
      >
        <div className="space-y-4">
          <p className="text-base text-foreground">
            {items.find((i) => i.id === removeConfirmId)?.menuItemName ?? '이 메뉴'}를 장바구니에서 삭제하시겠습니까?
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setRemoveConfirmId(null)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={handleConfirmRemove}
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
