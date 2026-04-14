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
  const date = new Date(isoString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function calculateCartItemTotal(
  basePrice: number,
  selectedOptions: { priceModifier: number }[],
  quantity: number
): number {
  const optionTotal = selectedOptions.reduce((sum, opt) => sum + opt.priceModifier, 0);
  return (basePrice + optionTotal) * quantity;
}
