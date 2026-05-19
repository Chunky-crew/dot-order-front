import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

let orderCounter = 0;

export function generateOrderId(): string {
  orderCounter++;
  return `#${String(orderCounter).padStart(3, '0')}`;
}

export function resetOrderCounter(lastCount: number) {
  orderCounter = lastCount;
}

export function formatKRW(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export function formatDateTime(isoString: string): string {
  // SSR hydration safety: Node's small-icu falls back to English AM/PM for 'ko-KR'
  // ("PM 09:57"), while the browser's full ICU renders "오후 09:57", causing a
  // mismatch. Use 'en-US' (baseline in every ICU build) for deterministic parts
  // and translate the dayPeriod ourselves. Also pin the timezone so server and
  // client always agree.
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  let hour = '';
  let minute = '';
  let isPM = false;
  for (const p of parts) {
    if (p.type === 'hour') hour = p.value;
    else if (p.type === 'minute') minute = p.value;
    else if (p.type === 'dayPeriod') isPM = p.value.toUpperCase() === 'PM';
  }
  return `${isPM ? '오후' : '오전'} ${hour.padStart(2, '0')}:${minute}`;
}

export function calculateCartItemTotal(
  basePrice: number,
  selectedOptions: { priceModifier: number }[],
  quantity: number
): number {
  const optionTotal = selectedOptions.reduce((sum, opt) => sum + opt.priceModifier, 0);
  return (basePrice + optionTotal) * quantity;
}
