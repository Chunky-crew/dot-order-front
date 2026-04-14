'use client';

import { useParams } from 'next/navigation';

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tableNumber = params.tableNumber as string;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-maroon-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Dot Order</span>
        </div>
        <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
          테이블 {tableNumber}번
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
