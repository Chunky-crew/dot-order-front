'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Order } from '@/types';
import { getOrders, updateOrderStatus } from '@/lib/api/orders';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatKRW, formatDateTime } from '@/lib/utils';

type FilterStatus = 'all' | Order['status'];

const TABS: { label: string; value: FilterStatus }[] = [
  { label: '전체', value: 'all' },
  { label: '대기중', value: 'pending' },
  { label: '준비중', value: 'preparing' },
  { label: '완료', value: 'completed' },
];

const STATUS_LABEL: Record<Order['status'], string> = {
  pending: '대기중',
  preparing: '준비중',
  completed: '완료',
};

interface OrdersClientProps { initialOrders: Order[]; }
export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);  // was []
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(false);                  // was true
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const prevOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data);

      const currentIds = new Set(data.map((o) => o.id));
      const prevIds = prevOrderIdsRef.current;
      const newIds = new Set<string>();

      data.forEach((o) => {
        if (!prevIds.has(o.id) && o.status === 'pending' && prevIds.size > 0) {
          newIds.add(o.id);
        }
      });

      if (newIds.size > 0) {
        setNewOrderIds((prev) => new Set([...prev, ...newIds]));
        setTimeout(() => {
          setNewOrderIds((prev) => {
            const next = new Set(prev);
            newIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 6000);
      }

      prevOrderIdsRef.current = currentIds;
    } catch (err) {
      console.error('주문 목록 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Server already provided initialOrders; skip the immediate refetch and just start polling.
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusChange = async (order: Order, nextStatus: Order['status']) => {
    setUpdatingIds((prev) => new Set([...prev, order.id]));
    try {
      const updated = await updateOrderStatus(order.id, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      console.error('상태 변경 실패:', err);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const filteredOrders = orders.filter((o) =>
    filter === 'all' ? true : o.status === filter
  );

  const countByStatus = (status: Order['status']) =>
    orders.filter((o) => o.status === status).length;

  return (
    <div className="min-h-screen bg-[var(--color-muted)]">
      {/* Header */}
      <div className="bg-maroon-800 text-white px-6 py-4">
        <h1 className="text-xl font-bold">주문 관리</h1>
        <p className="text-sm text-maroon-200 mt-0.5">5초마다 자동 새로고침</p>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-[var(--color-border)] sticky top-0 z-10">
        <div className="flex px-6">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors focus:outline-none ${
                filter === tab.value
                  ? 'text-maroon-800 border-b-2 border-maroon-800'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {tab.value !== 'all' && countByStatus(tab.value as Order['status']) > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center rounded-full text-xs font-semibold w-5 h-5 ${
                    tab.value === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : tab.value === 'preparing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {countByStatus(tab.value as Order['status'])}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <span className="text-sm">불러오는 중...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <svg
              className="w-12 h-12 mb-3 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-sm">주문이 없습니다</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order) => {
              const isNew = newOrderIds.has(order.id);
              const isUpdating = updatingIds.has(order.id);

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl border shadow-sm flex flex-col transition-all duration-300 ${
                    isNew
                      ? 'border-yellow-400 shadow-yellow-100 shadow-md ring-2 ring-yellow-300'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {/* Card header */}
                  <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)] flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900">{order.id}</span>
                        {isNew && (
                          <span className="text-xs font-semibold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        테이블 {order.tableNumber}번 &middot; {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <Badge variant={order.status}>{STATUS_LABEL[order.status]}</Badge>
                  </div>

                  {/* Item list */}
                  <div className="px-4 py-3 flex-1 space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-gray-900 leading-snug">
                            {item.menuItemName}{' '}
                            <span className="font-normal text-gray-500">x{item.quantity}</span>
                          </span>
                          <span className="text-gray-700 whitespace-nowrap shrink-0">
                            {formatKRW(item.totalPrice)}
                          </span>
                        </div>
                        {item.selectedOptions.length > 0 && (
                          <ul className="mt-0.5 space-y-0.5">
                            {item.selectedOptions.map((opt, i) => (
                              <li key={i} className="text-xs text-gray-400 pl-2">
                                · {opt.optionName}: {opt.choiceLabel}
                                {opt.priceModifier !== 0 && (
                                  <span>
                                    {' '}
                                    ({opt.priceModifier > 0 ? '+' : ''}
                                    {formatKRW(opt.priceModifier)})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Card footer */}
                  <div className="px-4 pb-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-maroon-800">
                      합계 {formatKRW(order.totalPrice)}
                    </span>
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order, 'preparing')}
                      >
                        {isUpdating ? '처리중...' : '준비 시작'}
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order, 'completed')}
                      >
                        {isUpdating ? '처리중...' : '완료'}
                      </Button>
                    )}
                    {order.status === 'completed' && (
                      <Badge variant="completed">완료됨</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
