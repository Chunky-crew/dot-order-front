# 백엔드 저장소 교체 가이드

## 의도

현재 구현(`jsonImpl`)은 프로토타입·과제 제출 용도의 JSON 파일 기반 저장소다.
운영 단계에서는 PostgreSQL(Prisma), MySQL, 외부 API 등으로 교체가 필요할 수 있다.

Repository 패턴 덕분에 `src/app/**`(API 라우트, React 컴포넌트) 전체와
`src/lib/server/store.ts`는 **한 줄도 수정하지 않고** 저장소를 교체할 수 있다.
교체 작업은 `src/lib/server/repositories/` 내부에만 집중된다.

---

## 교체 단계

### 1. 새 구현 클래스 작성

`src/lib/server/repositories/types.ts`에 정의된 4개 인터페이스를 모두 만족하는 클래스를 작성한다.

```
src/lib/server/repositories/
├── types.ts              (인터페이스 정의 — 수정 금지)
├── index.ts              (인스턴스 export — 여기만 수정)
├── jsonImpl/             (현재 구현)
│   ├── menuRepo.ts
│   ├── orderRepo.ts
│   ├── tableRepo.ts
│   ├── cartRepo.ts
│   ├── persistence.ts
│   └── seed.ts
└── prismaImpl/           (새 구현 예시)
    ├── menuRepo.ts
    ├── orderRepo.ts
    ├── tableRepo.ts
    └── cartRepo.ts
```

### 2. index.ts import 교체

`src/lib/server/repositories/index.ts`의 import 경로만 바꾼다.

```ts
// Before
import { JsonMenuRepository }  from './jsonImpl/menuRepo';
import { JsonOrderRepository } from './jsonImpl/orderRepo';
// ...
export const menuRepository: MenuRepository  = new JsonMenuRepository();
export const orderRepository: OrderRepository = new JsonOrderRepository();

// After
import { PrismaMenuRepository }  from './prismaImpl/menuRepo';
import { PrismaOrderRepository } from './prismaImpl/orderRepo';
// ...
export const menuRepository: MenuRepository  = new PrismaMenuRepository();
export const orderRepository: OrderRepository = new PrismaOrderRepository();
```

### 3. 패키지 설치 + 스키마 마이그레이션

```bash
npm install prisma @prisma/client
npx prisma init
# prisma/schema.prisma 작성 후:
npx prisma migrate dev --name init
```

`data/store.json`은 더 이상 사용되지 않는다. 삭제해도 무방하다.

### 4. 시드 데이터 이관

`src/lib/server/repositories/jsonImpl/seed.ts`의 카테고리·메뉴 데이터를
SQL 마이그레이션 또는 `prisma/seed.ts`로 옮긴다.

```bash
npx prisma db seed
```

### 5. 빌드·타입체크 후 배포

```bash
npm run build   # 타입 오류 없으면 완료
```

---

## 인터페이스 계약 요약

`src/lib/server/repositories/types.ts`의 4개 인터페이스와 핵심 invariant:

### MenuRepository

```ts
interface MenuRepository {
  getAllCategories(): MenuCategory[];
  createCategory(data: Omit<MenuCategory, 'id'>): MenuCategory;
  updateCategory(id: string, data: Partial<MenuCategory>): MenuCategory | null;
  deleteCategory(id: string): boolean;          // cascade: 해당 카테고리 메뉴 아이템 삭제
  getAllMenuItems(categoryId?: string): MenuItem[];
  getMenuItem(id: string): MenuItem | null;
  createMenuItem(data: Omit<MenuItem, 'id'>): MenuItem;
  updateMenuItem(id: string, data: Partial<MenuItem>): MenuItem | null;
  deleteMenuItem(id: string): boolean;
  cleanupOrphanMenuItems(): boolean;            // 카테고리 없는 아이템 제거
}
```

**Invariant:** `deleteCategory`는 cascade — 속한 메뉴 아이템을 함께 삭제해야 한다.
그렇지 않으면 "전체 메뉴" 뷰에 orphan이 노출된다.

### OrderRepository

```ts
interface OrderRepository {
  getAllOrders(status?: string): Order[];
  createOrder(data: { tableNumber: number; items: Order['items'] }): Order;
  updateOrderStatus(id: string, status: Order['status']): Order | null;
}
```

**Invariant:** 주문 ID는 `#001` 형식. `orderCounter`는 단조 증가이며 절대 재사용하지 않는다.

### TableRepository

```ts
interface TableRepository {
  getTableCount(): number;
  setTableCount(count: number): number;
}
```

### CartRepository

```ts
interface CartRepository {
  getCart(tableNumber: number): TableCartSnapshot;
  joinCart(tableNumber: number, clientId: string, hostHasActiveConnection: () => boolean): TableCartSnapshot;
  // 호스트 이탈 시 자동 승계: hostStillConnected()=false면 pickSuccessor()(최고참)로 호스트 이양,
  // 남은 사람이 없으면 호스트 해제. 결과 snapshot을 반환해 caller가 broadcast 한다.
  handleDisconnect(
    tableNumber: number,
    clientId: string,
    hostStillConnected: () => boolean,
    pickSuccessor: () => string | null,
  ): TableCartSnapshot;
  addItem(tableNumber: number, data: Omit<CartItem, 'id' | 'totalPrice'>, clientId?: string): { item: CartItem; snap: TableCartSnapshot };
  updateItemQuantity(tableNumber: number, itemId: string, quantity: number): TableCartSnapshot | null;
  removeItem(tableNumber: number, itemId: string): TableCartSnapshot | null;
  // 누구나 주문 가능: 호스트 검증 없이 빈 장바구니만 확인 후 drain.
  takeOrderItems(tableNumber: number): TakeOrderItemsResult;
}
```

**Invariant:** `takeOrderItems`는 빈 장바구니 검증 + drain을 **원자적**으로 처리해야 한다.
이 원자성이 중복 주문 방지의 유일한 장치다(호스트 게이팅 없음). JSON 구현에서는 동기 함수 내에서 처리되지만, DB 구현에서는 명시적 트랜잭션(예: `SELECT ... FOR UPDATE` 후 삭제)이 필요하다.

---

## 신경 써야 할 Invariant

### 카테고리 cascade 삭제

`deleteCategory(id)`가 호출되면 해당 카테고리 소속 메뉴 아이템을 **반드시** 함께 삭제한다.
Prisma 예시:

```ts
await prisma.$transaction([
  prisma.menuItem.deleteMany({ where: { categoryId: id } }),
  prisma.menuCategory.delete({ where: { id } }),
]);
```

### 호스트 승계 (재시작 후)

`tableCarts.hostClientId`가 `store.json`에 남아 있어도 재시작 직후엔 해당 SSE 연결이 없다.
`hostHasActiveConnection()` 이 `false`를 반환하므로 `HOST_GRACE_MS`(30초) 후 첫 신규 클라이언트가 호스트를 승계한다.
DB 구현에서도 `hostClientId`를 영속화하되, 위 로직을 그대로 유지해야 한다.

### placeTableOrder 원자성

`takeOrderItems` (drain) + `createOrder` (insert)는 한 트랜잭션으로 묶어야 한다.
둘 사이에 서버가 재시작되면 장바구니는 비었는데 주문이 없는 상태가 된다.

```ts
// DB 구현 예시
async takeOrderItems(tableNumber, clientId) {
  return await prisma.$transaction(async (tx) => {
    const cart = await tx.tableCart.findUnique({ where: { tableNumber } });
    // 검증 후 drain + order insert
  });
}
```

### orderCounter 단조 증가

재시작 후 카운터가 초기화되면 ID 충돌이 발생한다.
DB 구현에서는 `AUTO_INCREMENT` 또는 `SERIAL`을 사용하거나, `MAX(orderCounter) + 1`로 초기화한다.

---

## Prisma 구현 예시

`createOrder` 한 메서드만 보여준다. 나머지 메서드도 같은 패턴으로 작성하면 된다.

```ts
// src/lib/server/repositories/prismaImpl/orderRepo.ts
import { PrismaClient } from '@prisma/client';
import type { Order } from '@/types';
import type { OrderRepository } from '../types';

const prisma = new PrismaClient();

export class PrismaOrderRepository implements OrderRepository {
  async createOrder(data: { tableNumber: number; items: Order['items'] }): Promise<Order> {
    const counter = await prisma.orderCounter.update({
      where: { id: 1 },
      data: { value: { increment: 1 } },
    });
    const id = `#${String(counter.value).padStart(3, '0')}`;
    const totalPrice = data.items.reduce((s, i) => s + i.totalPrice, 0);
    const order = await prisma.order.create({
      data: {
        id,
        tableNumber: data.tableNumber,
        items: data.items,   // JSON 컬럼
        totalPrice,
        status: 'pending',
      },
    });
    return order as unknown as Order;
  }

  async getAllOrders(status?: string): Promise<Order[]> {
    const rows = await prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return rows as unknown as Order[];
  }

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
    try {
      const updated = await prisma.order.update({ where: { id }, data: { status } });
      return updated as unknown as Order;
    } catch {
      return null;
    }
  }
}
```

---

## API/UI 변경 없음

12개 API 라우트 핸들러(`src/app/api/**`)와 React 컴포넌트는
`src/lib/server/store.ts`의 공개 함수만 호출한다.

Repository 인터페이스를 만족하는 새 구현으로 교체하는 한
**`src/app` 코드는 한 줄도 수정할 필요가 없다.**
