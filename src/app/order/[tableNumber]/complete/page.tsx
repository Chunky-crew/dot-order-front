'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getOrders } from '@/lib/api/orders';
import { formatKRW, formatDateTime } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { Order } from '@/types';

const STATUS_STEPS: { key: Order['status']; label: string }[] = [
  { key: 'pending', label: '주문접수' },
  { key: 'preparing', label: '준비중' },
  { key: 'completed', label: '완료' },
];

const STATUS_BADGE_MAP: Record<Order['status'], { variant: 'pending' | 'preparing' | 'completed'; label: string }> = {
  pending: { variant: 'pending', label: '대기중' },
  preparing: { variant: 'preparing', label: '준비중' },
  completed: { variant: 'completed', label: '완료' },
};

export default function OrderCompletePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tableNumber = params.tableNumber as string;
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const orders = await getOrders();
      const found = orders.find((o) => o.id === orderId);
      if (found) {
        setOrder(found);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (notFound || loading) return;
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [fetchOrder, notFound, loading]);

  const currentStepIndex = order
    ? STATUS_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">주문 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">주문 정보를 찾을 수 없습니다</h1>
          <p className="text-sm text-gray-500">주문번호 {orderId}에 해당하는 주문이 없습니다.</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full max-w-xs"
          onClick={() => router.push(`/order/${tableNumber}`)}
        >
          메뉴로 돌아가기
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_BADGE_MAP[order.status];

  return (
    <div className="px-4 py-6 flex flex-col gap-6 pb-10">
      {/* Success hero */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center">주문이 완료되었습니다!</h1>
        <div className="bg-green-50 border border-green-200 rounded-full px-5 py-2">
          <span className="text-green-800 font-bold text-lg tracking-wider">주문번호: {order.id}</span>
        </div>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-800">주문 상태</span>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>

        {/* Progress steps */}
        <div className="px-4 py-5">
          <div className="flex items-center">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isActive = index === currentStepIndex;

              return (
                <Fragment key={step.key}>
                  {/* Connector lives between steps as a direct flex-1 child, so the
                      steps spread evenly edge-to-edge (first at the left, last at the
                      right, middle centered) instead of bunching to the left. */}
                  {index > 0 && (
                    <div
                      className={`flex-1 h-1 mx-1 rounded-full transition-colors ${
                        index <= currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                      } ${isActive ? 'ring-4 ring-green-100' : ''}`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium whitespace-nowrap ${
                        isActive ? 'text-green-600' : isCompleted ? 'text-green-500' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order details card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-800">주문 내역</span>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1 border-b border-gray-100 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>테이블</span>
            <span className="font-medium text-gray-900">{order.tableNumber}번</span>
          </div>
          <div className="flex justify-between">
            <span>주문 시간</span>
            <span className="font-medium text-gray-900">{formatDateTime(order.createdAt)}</span>
          </div>
        </div>

        {/* Item list */}
        <div className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="px-4 py-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{item.menuItemName}</span>
                    <span className="text-xs text-gray-500 shrink-0">x{item.quantity}</span>
                  </div>
                  {item.selectedOptions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.selectedOptions.map((opt, i) => (
                        <span key={i} className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                          {opt.choiceLabel}
                          {opt.priceModifier !== 0 && (
                            <span className="ml-1 text-gray-400">
                              ({opt.priceModifier > 0 ? '+' : ''}{formatKRW(opt.priceModifier)})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 ml-3 shrink-0">
                  {formatKRW(item.totalPrice)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <span className="font-bold text-gray-900">합계</span>
          <span className="text-lg font-bold text-green-700">{formatKRW(order.totalPrice)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push(`/order/${tableNumber}`)}
        >
          추가 주문하기
        </Button>
      </div>

      {/* Auto-refresh notice */}
      <p className="text-center text-xs text-gray-400">주문 상태가 5초마다 자동으로 갱신됩니다.</p>
    </div>
  );
}
