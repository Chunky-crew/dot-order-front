'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: '대시보드', icon: '📊' },
  { href: '/admin/menu', label: '메뉴 관리', icon: '🍽️' },
  { href: '/admin/orders', label: '주문 관리', icon: '📋' },
  { href: '/admin/tables', label: '테이블 관리', icon: '🪑' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-maroon-800 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-maroon-700">
          <h1 className="text-xl font-bold tracking-tight">Dot Order</h1>
          <p className="text-maroon-300 text-xs mt-1">관리자 시스템</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-maroon-900 text-white font-semibold'
                    : 'text-maroon-200 hover:bg-maroon-700 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-maroon-700 text-xs text-maroon-400">
          &copy; 2026 Dot Order
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-muted">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
