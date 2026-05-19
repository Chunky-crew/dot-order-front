'use client';

import { useEffect, useState, useCallback } from 'react';
import { getOrders } from '@/lib/api/orders';
import type { Order } from '@/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatKRW, formatDateTime } from '@/lib/utils';

interface Stats {
  total: number;
  pending: number;
  preparing: number;
  completed: number;
  revenue: number;
}

function computeStats(orders: Order[]): Stats {
  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    revenue: orders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + o.totalPrice, 0),
  };
}

const statusLabel: Record<Order['status'], string> = {
  pending: '대기 중',
  preparing: '준비 중',
  completed: '완료',
};

interface DashboardClientProps { initialOrders: Order[]; }
export default function DashboardClient({ initialOrders }: DashboardClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [stats, setStats] = useState<Stats>(computeStats(initialOrders));
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getOrders();
      setOrders(data);
      setStats(computeStats(data));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('주문 데이터를 불러오지 못했습니다.', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Server already provided initialOrders; just start polling for updates.
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">대시보드</h2>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading}>
          새로고침
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="오늘 총 주문" value={String(stats.total)} accent />
        <StatCard label="대기 중" value={String(stats.pending)} color="yellow" />
        <StatCard label="준비 중" value={String(stats.preparing)} color="blue" />
        <StatCard label="완료" value={String(stats.completed)} color="green" />
        <StatCard label="완료 매출" value={formatKRW(stats.revenue)} accent />
      </div>

      {/* Recent orders */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">최근 주문</h3>
          <p className="text-xs text-muted-foreground mt-0.5">최근 10건</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            불러오는 중...
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            주문이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted transition-colors">
                <span className="text-sm font-semibold text-maroon-800 w-20 shrink-0">
                  {order.id}
                </span>
                <span className="text-sm text-foreground w-16 shrink-0">
                  {order.tableNumber}번 테이블
                </span>
                <div className="flex-1 text-xs text-muted-foreground truncate">
                  {order.items.map((item) => `${item.menuItemName} ×${item.quantity}`).join(', ')}
                </div>
                <span className="text-sm font-medium text-foreground w-24 text-right shrink-0">
                  {formatKRW(order.totalPrice)}
                </span>
                <div className="w-16 flex justify-center shrink-0">
                  <Badge variant={order.status}>{statusLabel[order.status]}</Badge>
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                  {formatDateTime(order.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  accent?: boolean;
  color?: 'yellow' | 'blue' | 'green';
}

function StatCard({ label, value, accent, color }: StatCardProps) {
  const colorClasses = color === 'yellow'
    ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : color === 'blue'
    ? 'text-blue-700 bg-blue-50 border-blue-200'
    : color === 'green'
    ? 'text-green-700 bg-green-50 border-green-200'
    : accent
    ? 'text-maroon-800 bg-maroon-50 border-maroon-200'
    : 'text-foreground bg-background border-border';

  return (
    <div className={`rounded-xl border p-4 ${colorClasses}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
