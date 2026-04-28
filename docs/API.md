# API · 데이터 흐름 레퍼런스

`dot-order`의 API 엔드포인트, 요청/응답 스키마, 그리고 클라이언트→서버→저장소의 흐름을 정리합니다.

---

## 1. 전체 흐름

```
┌────────────────────────────┐    fetch    ┌──────────────────────────────┐    함수    ┌────────────────────┐
│ Client component (page)    │ ──────────► │ Route Handler                │ ─────────► │ store.ts (Map)    │
│ - admin/orders/page.tsx    │             │ app/api/.../route.ts         │            │ in-memory domain  │
│ - order/.../cart/page.tsx  │             │  · 검증 + JSON 응답           │            │ (서버 프로세스 메모리) │
└────────────────────────────┘             └──────────────────────────────┘            └────────────────────┘
            │                                                                                    ▲
            │ Zustand cart (persist)                                                             │
            ▼                                                                                    │
        localStorage (`dot-order-cart`)                                                          │
                                                                                                 │
       seed() 모듈 import 시 1회 실행 ────────────────────────────────────────────────────────────┘
```

- 클라이언트는 **항상 `src/lib/api/*` 래퍼**를 거쳐 fetch (직접 fetch 금지 컨벤션은 아니지만 일관성을 위해 권장)
- 서버는 **`src/lib/server/store.ts` 함수**만 호출, `Map`을 직접 노출하지 않음
- 가격 같은 보안에 민감한 값은 서버에서 재계산 (`createOrder`의 `totalPrice`)

---

## 2. 공통 규칙

| 항목 | 규약 |
| --- | --- |
| Base | `/api` |
| Content-Type | `application/json` |
| 동적 ID | URL path segment (`/api/menu/items/[id]`) |
| 에러 응답 | `{ error: '한국어 메시지' }` + HTTP status |
| 성공 응답 | 리소스 객체, 또는 `{ success: true }` (DELETE) |
| HTTP status | GET/PUT 200, POST 201, 검증 실패 400, 미존재 404 |
| 인증 | 없음 (현재 단계에서는 도입되지 않음) |

Next 15 라우트 시그니처:
```ts
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  ...
}
```
새 파라미터 라우트도 같은 패턴을 사용하세요.

---

## 3. 엔드포인트별 상세

### 3-1. 카테고리

#### `GET /api/menu/categories`
- 본문 없음
- **응답** `200` — `MenuCategory[]` (`displayOrder` 오름차순 정렬됨)

#### `POST /api/menu/categories`
- 요청 body
  ```json
  { "name": "디저트", "displayOrder": 4 }
  ```
- 검증: `name`이 falsy면 `400 { error: '카테고리 이름이 필요합니다' }`
- `displayOrder`는 미지정 시 `0`
- **응답** `201` — 생성된 `MenuCategory` (id = `cat-${Date.now()}`)

#### `PUT /api/menu/categories/[id]`
- 요청 body — `Partial<MenuCategory>`
- 미존재 시 `404 { error: '카테고리를 찾을 수 없습니다' }`
- **응답** `200` — 수정된 `MenuCategory`

#### `DELETE /api/menu/categories/[id]`
- 미존재 시 `404`
- **응답** `200` — `{ success: true }`
- ⚠ 카테고리 삭제 시 해당 카테고리의 메뉴는 **자동으로 정리되지 않음** (현 동작 — 변경 시 영향 큼)

---

### 3-2. 메뉴 아이템

#### `GET /api/menu/items?categoryId=cat-1`
- 쿼리스트링 `categoryId` (옵션)
- **응답** `200` — `MenuItem[]`

#### `POST /api/menu/items`
- 요청 body
  ```json
  {
    "categoryId": "cat-1",
    "name": "콜드브루",
    "price": 5500,
    "image": "/images/menu/coldbrew.jpg",
    "description": "...",
    "soldOut": false,
    "options": []
  }
  ```
- 검증: `name`, `categoryId`, `price`(0도 허용 — `!= null`로 체크) 중 하나라도 빠지면 `400`
- 누락 시 기본값:
  - `image` → `'/images/menu/default.jpg'`
  - `description` → `''`
  - `soldOut` → `false`
  - `options` → `[]`
- **응답** `201` — 생성된 `MenuItem` (id = `item-${Date.now()}`)

#### `GET /api/menu/items/[id]`
- 미존재 시 `404 { error: '메뉴를 찾을 수 없습니다' }`
- **응답** `200` — `MenuItem`

#### `PUT /api/menu/items/[id]`
- body — `Partial<MenuItem>` (옵션 전체를 통째로 교체하는 방식)
- **응답** `200` — 수정된 `MenuItem`

#### `DELETE /api/menu/items/[id]`
- **응답** `200` — `{ success: true }`

---

### 3-3. 주문

#### `GET /api/orders?status=pending`
- 쿼리 `status` (옵션, 'pending' | 'preparing' | 'completed' | 'all'은 wrapper에서만 의미)
- 정렬: `createdAt desc` (최신 우선)
- **응답** `200` — `Order[]`

#### `POST /api/orders`
- 요청 body
  ```json
  {
    "tableNumber": 3,
    "items": [
      {
        "id": "cart-...",
        "menuItemId": "item-1",
        "menuItemName": "아메리카노",
        "basePrice": 4000,
        "selectedOptions": [
          { "optionName": "온도", "choiceLabel": "ICE", "priceModifier": 0 },
          { "optionName": "사이즈", "choiceLabel": "Large", "priceModifier": 500 }
        ],
        "quantity": 2,
        "totalPrice": 9000
      }
    ]
  }
  ```
- 검증: `tableNumber`(falsy 검사), `items` 비배열 또는 빈 배열 → `400 { error: '테이블 번호와 주문 항목이 필요합니다' }`
- 서버는 **`items[].totalPrice`의 합계로 `Order.totalPrice` 재계산** (클라 신뢰 X)
- 자동 채움:
  - `id` = `#${counter padStart 3}` (예: `#001`, `#012`)
  - `status` = `'pending'`
  - `createdAt` = `new Date().toISOString()`
- **응답** `201` — 생성된 `Order`

#### `PUT /api/orders/[id]`
- 요청 body
  ```json
  { "status": "preparing" }
  ```
- 검증: `status`가 `['pending', 'preparing', 'completed']` 외면 `400 { error: '유효한 상태값이 필요합니다' }`
- 미존재 시 `404 { error: '주문을 찾을 수 없습니다' }`
- **응답** `200` — 수정된 `Order`
- 새 상태를 추가한다면 이 화이트리스트 + 타입 + 라벨 매핑들을 모두 갱신해야 함 (`AI_GUIDE.md` §5 함정 참고)

---

### 3-4. 테이블

#### `GET /api/tables`
- **응답** `200` — `{ tables: number }` (현재 모듈 내 `tableCount`, 기본 8)

#### `PUT /api/tables`
- 요청 body — `{ tables: number }`
- 검증: `!body.tables || body.tables < 1`이면 `400 { error: '유효한 테이블 수를 입력해주세요' }`
- ⚠ 상한 검증은 없음 — `admin/tables/page.tsx`가 클라이언트 측에서 100 cap.
- **응답** `200` — `{ tables: number }`

---

## 4. 클라이언트 래퍼 매핑

`src/lib/api/menu.ts`
| 함수 | HTTP |
| --- | --- |
| `getCategories()` | `GET /api/menu/categories` |
| `createCategory({name, displayOrder})` | `POST` |
| `updateCategory(id, partial)` | `PUT /api/menu/categories/${id}` |
| `deleteCategory(id)` | `DELETE` |
| `getMenuItems(categoryId?)` | `GET /api/menu/items?categoryId=...` |
| `createMenuItem(omit-id)` | `POST /api/menu/items` |
| `updateMenuItem(id, partial)` | `PUT` |
| `deleteMenuItem(id)` | `DELETE` |

`src/lib/api/orders.ts`
| 함수 | HTTP |
| --- | --- |
| `getOrders(status?)` | `GET /api/orders?status=...` |
| `createOrder({tableNumber, items})` | `POST /api/orders` |
| `updateOrderStatus(id, status)` | `PUT /api/orders/${id}` |

`src/lib/api/tables.ts`
| 함수 | HTTP | 비고 |
| --- | --- | --- |
| `getTableCount()` | `GET /api/tables` | 응답에서 `data.tables` 추출 |
| `setTableCount(n)` | `PUT /api/tables` | 응답에서 `data.tables` 추출 |

---

## 5. 데이터 모델 → 저장소

`src/lib/server/store.ts` (서버 메모리)

```ts
const categories: Map<string, MenuCategory>  // 시드: cat-1 커피, cat-2 음료, cat-3 베이커리
const menuItems:  Map<string, MenuItem>      // 시드: 10개 (item-10 치즈케이크는 soldOut)
const orders:     Map<string, Order>         // 시드: 비어있음
let tableCount = 8;
let orderCounter = 0;                        // 0부터 시작, 매 주문마다 ++
```

수정 함수는 모두 새 객체를 생성해 `set` 합니다 (참조 동등성 끊김 보장).

```ts
const updated = { ...existing, ...data, id };  // data 안의 id는 마지막 id 스프레드로 보호
map.set(id, updated);
return updated;
```

---

## 6. 카트 → 주문 라이프사이클

```
[메뉴 페이지 — order/[n]/page.tsx]
  ↓ MenuItemCard 클릭
[OptionModal]
  ↓ 옵션 선택 + 수량 → "장바구니 담기"
useCartStore.addItem({ menuItemId, menuItemName, basePrice, selectedOptions, quantity })
  → id, totalPrice 자동 채움 → localStorage 동기화
  ↓
[장바구니 — order/[n]/cart/page.tsx]
  ↓ "주문하기" → showConfirm 모달
createOrder({ tableNumber: Number(tableNumber), items })
  → POST /api/orders
  → store.createOrder() 가 totalPrice 재계산, status='pending', id='#001'
  ↓
clearCart() + router.push(`/order/${n}/complete?orderId=${order.id}`)
  ↓
[완료 — order/[n]/complete/page.tsx]
  ↓ 5초마다 getOrders() 후 find(o => o.id === orderId)
status = pending → preparing → completed (점진적 단계 표시)
```

병렬로 사장님 측에서:
```
[주문 보드 — admin/orders/page.tsx]
  5초 폴링 → 신규 pending 감지 시 NEW 강조 6초
  "준비 시작" → updateOrderStatus(id, 'preparing')
  "완료"     → updateOrderStatus(id, 'completed')
```

---

## 7. 알아두면 좋은 동작들

1. **시드의 멱등성** — `seed()`는 `categories.size > 0`이면 즉시 return. 핫리로드 시 시드가 재실행되지 않습니다.
2. **`orderCounter` 휘발성** — 서버 재시작이면 다시 `#001`부터 시작 (즉, 동일 ID가 재사용될 수 있음).
3. **카트 ↔ 주문 사이의 모델 차이**
   - `CartItem`: 클라이언트 임시 식별자(`cart-...`), `selectedOptions`는 평탄화된 형태
   - `Order.items`: 서버가 그대로 저장, 후속 변경 X (스냅샷)
4. **POST 응답을 곧장 신뢰** — `createOrder` 등은 응답 객체를 바로 state로 쓰는 패턴 (`admin/orders/page.tsx`의 `setOrders((prev) => prev.map(... === updated.id ? updated : o))`).
5. **에러 핸들링** — 현재는 `try/catch` + `console.error` 또는 `setOrderError(string)`. 토스트/알림 시스템 도입 시 한 번에 통일하기 좋은 지점.
6. **CORS / 프록시** — same-origin이라 별도 설정 없음.

---

## 8. 새 엔드포인트를 만들 때 체크리스트

- [ ] `app/api/<resource>/route.ts` (또는 `[id]/route.ts`)에 핸들러 작성
- [ ] `NextRequest`/`NextResponse` 사용, 동적 segment는 `params: Promise<...>` 시그니처
- [ ] 검증: 누락 시 `400 + 한국어 메시지`, 미존재 시 `404 + 한국어 메시지`
- [ ] `src/lib/server/store.ts`에 도메인 함수 추가 (`Map` 직접 노출 금지)
- [ ] 응답 객체는 도메인 타입 그대로 (`Order`, `MenuItem`, ...)
- [ ] `src/lib/api/<resource>.ts`에 클라이언트 래퍼 추가, 타입 시그니처 명시
- [ ] 페이지에서 사용 — 폴링 주기 / 캐시 / 에러 메시지를 기존 패턴(5s/10s, `console.error`)에 맞춤
- [ ] 새 상태/필드라면 `src/types/index.ts` 갱신
- [ ] `npm run lint`, `npm run build` 통과 확인
