'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { getTableCount, setTableCount } from '@/lib/api/tables';

export default function TablesPage() {
  const [tableCount, setTableCountState] = useState<number>(0);
  const [inputCount, setInputCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
    getTableCount().then((count) => {
      setTableCountState(count);
      setInputCount(count);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (inputCount < 1 || inputCount > 100) return;
    setSaving(true);
    try {
      const updated = await setTableCount(inputCount);
      setTableCountState(updated);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintSingle = (tableNumber: number) => {
    const qrUrl = `${origin}/order/${tableNumber}`;
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>테이블 ${tableNumber} QR 코드</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
            h2 { margin-bottom: 16px; font-size: 1.5rem; }
            svg { width: 200px; height: 200px; }
            p { margin-top: 12px; font-size: 0.875rem; color: #666; }
          </style>
        </head>
        <body>
          <h2>테이블 ${tableNumber}번</h2>
          <div id="qr"></div>
          <p>${qrUrl}</p>
          <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"><\/script>
          <script>
            QRCode.toCanvas ? void 0 : void 0;
            var img = document.createElement('img');
            fetch('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}')
              .then(function(r){ return r.blob(); })
              .then(function(b){
                img.src = URL.createObjectURL(b);
                img.style.width = '200px';
                img.style.height = '200px';
                document.getElementById('qr').appendChild(img);
                setTimeout(function(){ window.print(); window.close(); }, 800);
              });
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    const tables = Array.from({ length: tableCount }, (_, i) => i + 1);
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const tableItems = tables
      .map(
        (n) =>
          `<div class="qr-item">
            <h3>테이블 ${n}번</h3>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${origin}/order/${n}`)}" width="160" height="160" />
            <p>${origin}/order/${n}</p>
          </div>`
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>전체 테이블 QR 코드</title>
          <style>
            body { font-family: sans-serif; margin: 24px; }
            h1 { text-align: center; margin-bottom: 24px; font-size: 1.5rem; }
            .grid { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; }
            .qr-item { display: flex; flex-direction: column; align-items: center; border: 1px solid #ddd; border-radius: 8px; padding: 16px; page-break-inside: avoid; }
            .qr-item h3 { margin: 0 0 12px; font-size: 1rem; font-weight: bold; }
            .qr-item p { margin: 8px 0 0; font-size: 0.7rem; color: #666; word-break: break-all; max-width: 160px; text-align: center; }
            @media print { body { margin: 12px; } }
          </style>
        </head>
        <body>
          <h1>Dot Order — 전체 테이블 QR 코드</h1>
          <div class="grid">${tableItems}</div>
          <script>
            window.onload = function() { setTimeout(function(){ window.print(); }, 1200); };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const selectedQrUrl = selectedTable ? `${origin}/order/${selectedTable}` : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">테이블 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">테이블 수를 설정하고 QR 코드를 인쇄하세요.</p>
        </div>
        <Button variant="secondary" onClick={handlePrintAll} disabled={tableCount === 0}>
          전체 QR 인쇄
        </Button>
      </div>

      {/* Table count settings */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold mb-4">테이블 수 설정</h2>
        <div className="flex items-end gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setInputCount((v) => Math.max(1, v - 1))}
              disabled={inputCount <= 1}
            >
              −
            </Button>
            <div className="w-24">
              <Input
                label=""
                type="number"
                min={1}
                max={100}
                value={inputCount}
                onChange={(e) => setInputCount(Number(e.target.value))}
                className="text-center"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setInputCount((v) => Math.min(100, v + 1))}
              disabled={inputCount >= 100}
            >
              +
            </Button>
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || inputCount === tableCount}
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
          {inputCount !== tableCount && (
            <p className="text-sm text-muted-foreground self-center">
              현재: <span className="font-medium text-foreground">{tableCount}개</span> → 변경: <span className="font-medium text-maroon-800">{inputCount}개</span>
            </p>
          )}
        </div>
      </div>

      {/* Table grid */}
      {tableCount === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">테이블이 없습니다. 테이블 수를 설정해주세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: tableCount }, (_, i) => i + 1).map((tableNumber) => (
            <div
              key={tableNumber}
              className="bg-white rounded-xl border border-border p-4 flex flex-col items-center gap-3 hover:shadow-md transition-shadow"
            >
              <span className="text-2xl font-bold text-maroon-800">{tableNumber}번</span>
              <div className="p-1 border border-border rounded-lg">
                <QRCodeSVG
                  value={origin ? `${origin}/order/${tableNumber}` : `/order/${tableNumber}`}
                  size={80}
                  level="M"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setSelectedTable(tableNumber)}
              >
                QR 보기
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* QR detail modal */}
      <Modal
        isOpen={selectedTable !== null}
        onClose={() => setSelectedTable(null)}
        title={`테이블 ${selectedTable}번 QR 코드`}
      >
        {selectedTable !== null && (
          <div className="flex flex-col items-center gap-5 py-2">
            <div className="p-4 border border-border rounded-xl bg-white">
              <QRCodeSVG
                value={selectedQrUrl}
                size={220}
                level="H"
                includeMargin
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-maroon-800">{selectedTable}번 테이블</p>
              <p className="text-xs text-muted-foreground break-all">{selectedQrUrl}</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handlePrintSingle(selectedTable)}
              >
                인쇄
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setSelectedTable(null)}
              >
                닫기
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
