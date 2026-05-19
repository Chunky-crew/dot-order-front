# dot-order — Backend Architecture

## 데이터 흐름 개요

모든 데이터 접근은 아래 단방향 파이프라인을 통해 이루어진다.

```
src/app/api/**          (Next.js Route Handlers)
       │
       ▼
src/lib/server/store.ts (퍼블릭 함수 파사드 — 12개 라우트가 import)
       │
       ▼
src/lib/server/repositories/index.ts  (Repository 인스턴스 export)
       │
       ├── MenuRepository  (jsonImpl/menuRepo.ts)
       ├── OrderRepository (jsonImpl/orderRepo.ts)
       ├── TableRepository (jsonImpl/tableRepo.ts)
       └── CartRepository  (jsonImpl/cartRepo.ts)
                │
                ▼
       src/lib/server/repositories/jsonImpl/persistence.ts
                │
                ▼
           data/store.json  (영속화 파일)
```

`store.ts`는 얇은 파사드다. 비즈니스 로직은 없고, 각 repository 메서드에 1:1 위임한다.
저장소 구현을 DB로 교체하려면 `repositories/index.ts` 한 파일만 수정하면 된다.

---

## Repository 계층

| Repository | 책임 | 파일 위치 | `store.json` 소유 필드 |
|---|---|---|---|
| `MenuRepository` | 카테고리 + 메뉴 아이템 CRUD, cascade 삭제, orphan 정리 | `jsonImpl/menuRepo.ts` | `categories`, `menuItems` |
| `OrderRepository` | 주문 생성·조회·상태 변경, `orderCounter` 관리 | `jsonImpl/orderRepo.ts` | `orders`, `orderCounter` |
| `TableRepository` | 테이블 수 조회·설정 | `jsonImpl/tableRepo.ts` | `tableCount` |
| `CartRepository` | 공유 테이블 장바구니, 호스트 선출, 주문 drain | `jsonImpl/cartRepo.ts` | `tableCarts` |

인터페이스 계약은 `src/lib/server/repositories/types.ts`에 정의되어 있다.

---

## 영속화 모델

`data/store.json` 구조 (TypeScript 표기):

```ts
{
  categories:   MenuCategory[];   // { id, name, displayOrder }
  menuItems:    MenuItem[];       // { id, categoryId, name, price, image, description, soldOut, options[] }
  orders:       Order[];          // { id, tableNumber, items[], totalPrice, status, createdAt }
  tableCount:   number;           // 기본값 8
  orderCounter: number;           // 단조 증가; 주문 ID는 "#001" 형식
  tableCarts:   Record<string, { // key = tableNumber(문자열)
    items:         CartItem[];
    hostClientId:  string | null;
    hostLastSeen:  number;        // Date.now() 타임스탬프
    version:       number;        // 스냅샷 버전 (SSE diff 용)
  }>;
}
```

**중요 사항:**
- `tableCarts`(hostClientId 포함)는 `store.json`에 **영속화**된다. 서버 HMR·재시작 후에도 장바구니가 사라지지 않는다.
- 단, `hostClientId`가 남아 있어도 재시작 직후 SSE 연결이 없으므로 `hostHasActiveConnection()` 이 `false`를 반환한다. `HOST_GRACE_MS`(30초) 경과 후 첫 번째 신규 클라이언트가 호스트를 승계한다.
- `data/store.json`과 `public/uploads/menu/`는 `.gitignore`에 등록되어 있어 버전 관리되지 않는다.
- 초기 데이터가 없을 때는 `jsonImpl/seed.ts`의 시드 데이터를 사용한다.

---

## 실시간 동기화 (SSE)

장바구니 변경 사항은 `src/lib/server/cartBus.ts`를 통해 SSE 구독자에게 브로드캐스트된다.

- `cartBus`는 **인메모리 pub/sub**이다. `store.json`에 저장되지 않으며, 서버 재시작 시 구독자 목록이 초기화된다.
- 클라이언트는 `src/app/api/tables/[tableNumber]/cart/stream/route.ts`로 GET 요청을 보내 SSE 스트림을 구독한다.
- 해당 route handler는 연결 맵을 직접 관리하며, `joinTableCart` / `leaveTableCart` 호출 시 `hostHasActiveConnection` 콜백을 주입한다.

```
클라이언트 GET /api/tables/1/cart/stream
    └─ SSE route → joinTableCart(1, clientId, () => bus.hasConnection(clientId))
                                │
           장바구니 변경 시 → cartBus.publish(1, snapshot)
                                │
                           모든 구독자에게 data: ... 전송
```

---

## 호스트 선출

테이블마다 **단 한 명의 호스트**만 주문 확정(`placeTableOrder`)을 호출할 수 있다.

| 상수 | 값 |
|---|---|
| `HOST_GRACE_MS` | 30,000 ms (30초) |

**선출 흐름:**

1. **join**: 테이블에 호스트가 없으면 → 즉시 호스트 승계.
2. **join (호스트 있음)**: `hostHasActiveConnection()` 이 `false` **이고** `hostLastSeen`이 30초 이상 경과 → stale 판정, 호스트 교체.
3. **leave**: 호스트가 SSE 스트림을 끊으면 → `hostLastSeen = Date.now()` 업데이트 (타이머 시작).
4. **takeOver**: grace 기간이 지난 뒤 새 클라이언트가 join하면 호스트 승계.

---

## 주문 흐름

`store.ts`의 `placeTableOrder(tableNumber, clientId)` 파이프라인:

```
1. cartRepository.takeOrderItems(tableNumber, clientId)
   ├─ 호스트 검증 (forbidden / no-host)
   ├─ 빈 장바구니 검증 (empty)
   └─ 장바구니 drain → { ok: true, items, snap }

2. orderRepository.createOrder({ tableNumber, items })
   └─ orderCounter++, id = "#NNN", persist()

3. { ok: true, order, snap } 반환
   └─ SSE route가 cartBus.publish()로 모든 구독자에게 브로드캐스트
```

drain과 createOrder는 같은 동기 컨텍스트에서 실행되므로 JSON 구현에서는 원자적으로 동작한다.
DB로 전환 시 명시적 트랜잭션이 필요하다 — 자세한 내용은 `docs/BACKEND_MIGRATION.md` 참고.

---

백엔드를 다른 저장소로 교체하려면 docs/BACKEND_MIGRATION.md 참고.

## 초기 페인트 전략 (SSR + Optimistic Updates)

페이지 진입 시 빈 화면/스켈레톤 단계를 제거하기 위해 주요 페이지를 server component + client component 쌍으로 분리했습니다.

- 고객 메뉴 페이지: `src/app/order/[tableNumber]/page.tsx`(서버, 메뉴 데이터를 repository로 직접 조회) + `OrderMenuClient.tsx`(클라이언트, 인터랙션 담당)
- 관리자 주문 페이지: `src/app/admin/orders/page.tsx` + `OrdersClient.tsx`
- 관리자 대시보드: `src/app/admin/page.tsx` + `DashboardClient.tsx`

서버는 `menuRepository` / `orderRepository`를 직접 호출해 첫 HTML에 데이터를 박아 보냅니다. 클라이언트는 그 값을 `useState`의 초기값으로 받고 폴링/SSE를 통해 실시간 갱신만 수행합니다. 결과적으로 첫 페인트에서 "불러오는 중..." 단계가 사라집니다.

장바구니 mutation(`addItem`/`updateQuantity`/`removeItem`/`placeOrder`)은 서버 응답에 포함된 새 snapshot을 즉시 `setSnap`으로 반영하는 optimistic update로 전환됐습니다. SSE 채널은 다른 기기/탭과의 동기화 용도로 남아 있습니다.

새 페이지를 추가할 때도 동일한 패턴을 권장합니다 — 첫 페인트에 보여줄 데이터는 server component에서 repository로 직접 조회하고, 인터랙티브 상태만 client component로 분리하세요.
