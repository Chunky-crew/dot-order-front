'use client';

import { useParams } from 'next/navigation';

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tableNumber = params.tableNumber as string;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — the maroon bar spans the full viewport width; its inner content
          stays aligned with the centered page column on wider screens. */}
      <header className="sticky top-0 z-30 bg-maroon-800 text-white shadow-md">
        <div className="mx-auto w-full max-w-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">Dot Order</span>
          </div>
          <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
            테이블 {tableNumber}번
          </div>
        </div>
      </header>

      {/* Content — fills the screen on phones (max-w-lg resolves to 100% below
          512px), and centers as a column on tablets/desktops. The fixed order
          button and FAB use the same `max-w-lg` centered pattern, so they stay
          aligned with this column. */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {children}
      </main>
    </div>
  );
}
