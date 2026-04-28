# 컴포넌트 / 페이지 레퍼런스

각 파일이 무엇을 책임지고, 어떤 props/state를 다루며, 어디와 의존 관계를 갖는지를 정리합니다.
새 코드를 짤 때 **재사용 가능한 컴포넌트가 이미 있는지** 먼저 이 문서에서 확인하세요.

---

## 1. UI 프리미티브 — `src/components/ui/`

### `Button.tsx`
| 항목 | 값 |
| --- | --- |
| Export | `export default function Button` |
| 클라이언트 | `'use client'` |
| Props | `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'`, `size?: 'sm' | 'md' | 'lg'`, 기타 `ButtonHTMLAttributes` 전부 |
| 기본 | `variant='primary'`, `size='md'` |

variant 매핑:
- `primary`: `bg-maroon-800 text-white` (CTA 기본)
- `secondary`: `bg-muted text-foreground border border-border`
- `danger`: `bg-red-600 text-white`
- `ghost`: `text-maroon-800 hover:bg-maroon-50`

```tsx
<Button variant="primary" size="lg" onClick={...}>저장</Button>
<Button variant="danger" disabled={isLoading}>삭제</Button>
```

### `Badge.tsx`
| 항목 | 값 |
| --- | --- |
| Export | default |
| 클라이언트 | 서버 컴포넌트 (서버/클라 양쪽 OK) |
| Props | `variant?: 'default' | 'pending' | 'preparing' | 'completed' | 'soldout'`, `children` |

`Order['status']` 와 키가 거의 1:1 (단, `default`/`soldout` 추가). 새 주문 상태가 생기면 여기 variant 도 추가해야 합니다.

### `Input.tsx` — `Input`, `Textarea`, `Select` (named export 3개)
| 컴포넌트 | 추가 props |
| --- | --- |
| `Input` | `label?: string` + `InputHTMLAttributes` |
| `Textarea` | `label?: string` + `TextareaHTMLAttributes` (기본 `rows={3}`, `resize-none`) |
| `Select` | `label?: string`, `options: { value; label }[]` + `SelectHTMLAttributes` |

세 컴포넌트 모두 동일한 `baseClasses`(border + focus ring `maroon-800/20`) 공유. label 있으면 `space-y-1` 래퍼.

### `Modal.tsx`
| 항목 | 값 |
| --- | --- |
| Export | default |
| 클라이언트 | `'use client'` |
| Props | `isOpen`, `onClose`, `title`, `children` |

핵심 동작:
- 열려 있는 동안 `document.body.style.overflow = 'hidden'` (cleanup 보장)
- 오버레이(`overlayRef`) **자기 자신**을 클릭했을 때만 닫힘 — 내부 클릭은 무시
- `max-w-lg`, `max-h-[85vh]`, 본문 `overflow-y-auto`
- `&times;` 버튼이 우상단 닫기 버튼

---

## 2. 도메인 타입 — `src/types/index.ts`

```ts
Store              // 매장 메타 (현재 미사용)
MenuCategory       // 카테고리 (id, name, displayOrder)
MenuOption         // 옵션 그룹 (radio | checkbox, required)
MenuOptionChoice   // 선택지 (id, label, priceModifier)
MenuItem           // 메뉴 (categoryId, price, image, description, soldOut, options)
CartItem           // 장바구니 1개 (selectedOptions: { optionName; choiceLabel; priceModifier }[], quantity, totalPrice)
Order              // 주문 (#001 형식 id, tableNumber, items, totalPrice, status, createdAt ISO)
```

`CartItem.selectedOptions`는 `MenuItem.options`와 형태가 다른 점에 주의 — UI에 보여주기 좋게 평탄화한 스냅샷입니다.

---

## 3. 유틸 — `src/lib/utils.ts`

| 함수 | 시그니처 | 용도 |
| --- | --- | --- |
| `generateId()` | `() => string` | uuid v4 |
| `generateOrderId()` | `() => string` | `#001` 형식 (모듈 카운터 사용) |
| `resetOrderCounter(n)` | `(n: number) => void` | 외부에서 카운터 동기화 |
| `formatKRW(price)` | `(n: number) => string` | `4,500원` |
| `formatDateTime(iso)` | `(s: string) => string` | `14:23` |
| `calculateCartItemTotal(base, opts, qty)` | `(n, {priceModifier}[], n) => number` | 카트 총액 |

---

## 4. 서버 저장소 — `src/lib/server/store.ts`

**서버 메모리에만 존재하는 도메인 저장소.** 클라이언트에서 import 금지.

내부 상태:
```ts
const categories = new Map<string, MenuCategory>();
const menuItems  = new Map<string, MenuItem>();
const orders     = new Map<string, Order>();
let tableCount = 8;
let orderCounter = 0;
```

모듈 import 시 `seed()`가 한 번만 실행 → 카테고리 3개 + 메뉴 10개 (일부 `soldOut: true`).

| 그룹 | export 함수 |
| --- | --- |
| Categories | `getAllCategories`, `createCategory`, `updateCategory`, `deleteCategory` |
| MenuItems | `getAllMenuItems(categoryId?)`, `getMenuItem`, `createMenuItem`, `updateMenuItem`, `deleteMenuItem` |
| Orders | `getAllOrders(status?)`, `createOrder({tableNumber, items})`, `updateOrderStatus(id, status)` |
| Tables | `getTableCount`, `setTableCount` |

`createOrder`가 클라이언트의 `totalPrice`를 무시하고 `items`로 재계산해서 저장합니다 — 이 보안 패턴을 유지하세요.

---

## 5. 클라이언트 API 래퍼 — `src/lib/api/`

### `menu.ts`
- `getCategories(): Promise<MenuCategory[]>`
- `createCategory({name, displayOrder})`, `updateCategory(id, partial)`, `deleteCategory(id)`
- `getMenuItems(categoryId?)`, `createMenuItem(Omit<MenuItem,'id'>)`, `updateMenuItem(id, partial)`, `deleteMenuItem(id)`

### `orders.ts`
- `getOrders(status?)`, `createOrder({tableNumber, items})`, `updateOrderStatus(id, status)`

### `tables.ts`
- `getTableCount(): Promise<number>` — 서버는 `{ tables }` 객체로 보내지만 wrapper는 number만 노출
- `setTableCount(n: number): Promise<number>`

모두 `const API_BASE = '/api'` 상수, `fetch` 사용. 에러 처리는 호출 측 책임.

---

## 6. 카트 스토어 — `src/stores/cartStore.ts`

```ts
useCartStore = create<CartState>()(persist(..., { name: 'dot-order-cart' }))
```

상태 + 메서드:

| 멤버 | 설명 |
| --- | --- |
| `tableNumber: number | null` | URL에서 진입 시 `setTableNumber`로 세팅 |
| `items: CartItem[]` | 카트 항목 |
| `setTableNumber(num)` | — |
| `addItem(item)` | id/totalPrice 자동 채움 (`cart-${Date.now()}-${rnd}`) |
| `removeItem(id)` | — |
| `updateQuantity(id, q)` | q < 1이면 자동 `removeItem` |
| `clearCart()` | items와 tableNumber 동시 초기화 |
| `getTotalPrice()` / `getTotalCount()` | 파생 값 |

**SSR 주의**: `persist` 때문에 hydration 직후의 `items`는 빈 배열일 수 있음 →
처음 진입 페이지(`cart/page.tsx`)는 `mounted` boolean state로 가드하는 패턴 유지.

---

## 7. 페이지 — `src/app/`

### `layout.tsx` (root)
- `Noto_Sans_KR` 변수 폰트 등록 (`--font-noto-sans-kr`)
- `<html lang="ko">` 명시
- `metadata.title = "Dot Order - 간편 주문 시스템"`

### `page.tsx` (root)
- 단순 `redirect('/admin')`. 손님 진입은 `/order/[tableNumber]`로 직접.

### `globals.css`
- Tailwind v4 import + `@theme inline` 토큰
- 스크롤바 스타일 + `.hide-scrollbar` 헬퍼 (카테고리 탭 가로 스크롤용)

---

### Admin — `src/app/admin/`

#### `layout.tsx`
- `'use client'` (usePathname)
- 좌측 `aside.w-60.bg-maroon-800` 사이드바 (4개 nav: 대시보드 / 메뉴 / 주문 / 테이블)
- `pathname === item.href`로 active 강조 (`bg-maroon-900`)
- 본문은 `flex-1 overflow-y-auto bg-muted`

새 어드민 페이지를 만들 때 `navItems` 배열에 추가 + 매칭되는 `app/admin/<slug>/page.tsx` 생성.

#### `page.tsx` — 대시보드
- 10초 폴링(`setInterval(fetchData, 10_000)`)
- `Stats` 객체 = total/pending/preparing/completed/revenue
- `StatCard` 내부 컴포넌트 (color: yellow/blue/green/accent)
- 최근 10건은 `createdAt desc` 정렬 후 slice
- 우상단에 "새로고침" `Button`(disabled: loading), "마지막 업데이트" 시각 표시

#### `menu/page.tsx` — 메뉴 관리 (가장 복잡)
파일 안에 4개 컴포넌트가 모여 있음:

1. **`CategoryModal`** — 추가/수정 (이름 + 표시 순서)
2. **`OptionEditor`** — 메뉴 모달 안에 들어가는 옵션 그룹 편집기
   - `addOption`, `removeOption`, `updateOption`
   - `addChoice`, `removeChoice`, `updateChoice`
   - 옵션 타입: `radio`(단일 선택) / `checkbox`(복수 선택)
3. **`MenuItemModal`** — 메뉴 추가/수정 (카테고리 Select, 이름, 가격, 설명, 이미지 URL, 품절, OptionEditor)
4. **`MenuItemCard`** — 카드 뷰 (이미지 / 이름·카테고리 / 설명 / 가격 / 수정·삭제 버튼 / 품절 배지 / 옵션 개수)

페이지 본체:
- 좌측 카테고리 패널 (`w-56 shrink-0`) — "전체 메뉴" 항목 + 추가/수정/삭제
- 우측 메뉴 그리드 (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- 카테고리 선택 시 `loadItems(id)`로 갱신
- `confirm(...)` 네이티브 다이얼로그로 삭제 확인 (한국어)

#### `orders/page.tsx` — 주문 카드 보드
- 5초 폴링
- 탭: 전체/대기중/준비중/완료 + 상태별 카운트 배지
- **신규 주문 감지**: `prevOrderIdsRef`(useRef)로 직전 ID 셋과 비교. 새로 들어온 `pending` 주문은 `newOrderIds` Set에 추가 → 6초 후 자동 제거. 카드에 `ring-2 ring-yellow-300` 강조 + "NEW" 펄스 라벨.
- **상태 변경**: `updatingIds` Set으로 단일 주문의 in-flight 표시. `pending → preparing → completed` 단방향 전이.
- 카드 구조: 헤더(주문번호/테이블/시각/상태 배지) → 아이템 리스트(옵션·가격 변동 포함) → 푸터(합계 + 다음 단계 버튼)

#### `tables/page.tsx` — 테이블/QR 관리
- 1~100 사이 `tableCount` 설정 (Input + −/+ 버튼)
- 변경 미리보기: `현재 N개 → 변경 M개`
- 그리드: 각 테이블에 `QRCodeSVG`(qrcode.react, level="M", size 80) + "QR 보기" Button
- `Modal`: 큰 QR(level="H", size 220, includeMargin) + 인쇄/닫기
- **인쇄**: `window.open` + `document.write` + `window.print`
  - 단일: `api.qrserver.com`에서 PNG 받아 표시 후 자동 인쇄/닫기
  - 전체: 모든 테이블을 grid로 한 페이지에 인쇄 (페이지 분할 시 `page-break-inside: avoid`)

---

### Order (손님) — `src/app/order/[tableNumber]/`

#### `layout.tsx`
- `'use client'` (useParams)
- `max-w-lg mx-auto` 모바일 폭
- sticky 헤더: 좌측 "Dot Order" 로고, 우측 "테이블 N번" pill

#### `page.tsx` — 메뉴판 + 옵션 모달
파일 안에 5개 컴포넌트:

1. **`SkeletonCard` / `PageSkeleton`** — `Promise.all([getCategories, getMenuItems])` 동안 표시
2. **`ImagePlaceholder`** — `image`가 비었을 때 보여주는 maroon 톤 SVG
3. **`OptionModal`**
   - `selected: Record<optionId, choiceId[]>` 로 선택 상태 관리
   - 가격 = `item.price + Σ선택된 priceModifier`, 합계 = `unit * quantity`
   - radio: 클릭 시 단일 교체. checkbox: 다중 토글.
   - `required` 옵션 검증 → `validationError`로 빨간 박스 표시
   - "장바구니 담기" 클릭 시 `selected`를 `{optionName, choiceLabel, priceModifier}[]` 평탄화
4. **`MenuItemCard`** — 정사각형 이미지 + 이름·설명 (`line-clamp-2`/`-1`) + 가격. `soldOut`이면 grayscale + 품절 배지 + 클릭 비활성.
5. **`OrderMenuPage`** — 페이지 본체
   - mount 시 `useCartStore.setTableNumber(Number(tableNumber))`
   - 카테고리 탭(`hide-scrollbar`로 스크롤바 숨김), 활성 탭 `scrollIntoView`
   - 하단 floating CTA: 카트가 비어있지 않을 때만 표시 (`fixed bottom-6`, 카운트 + 합계)

#### `cart/page.tsx`
- `mounted` 가드(persist hydration)
- 빈 카트 — 큰 일러스트 + "메뉴로 돌아가기"
- 항목 리스트: 옵션 표시(점 prefix), 수량 +/-(1에서 - 누르면 삭제 모달), 단건 삭제 휴지통
- 주문 요약 박스(아이템 라인 + 합계)
- fixed 하단 "₩...원 주문하기" 버튼 — 클릭 시 `showConfirm` Modal
- 확인 모달: 미니 요약 + 취소 / 주문하기. `createOrder` 성공 시 `clearCart` + `router.push(/order/N/complete?orderId=...)`. 실패 시 `orderError` 메시지.
- 별도 "메뉴 삭제" 확인 Modal 도 존재.

#### `complete/page.tsx`
- `searchParams.get('orderId')`로 주문번호 획득
- 5초 폴링. 진행 단계는 `STATUS_STEPS = [pending, preparing, completed]`로 시각화 (체크 아이콘 + 연결선 색)
- 본문: 상태 카드 + 주문 내역(테이블·시각·아이템·옵션·합계)
- "추가 주문하기" → `/order/[tableNumber]` 메뉴로 이동 (cart는 이미 clear됨)

---

## 8. API 라우트 핸들러 — `src/app/api/`

자세한 인터페이스는 [`API.md`](./API.md) 참고. 한 줄 요약만:

| 경로 | 메서드 | 동작 |
| --- | --- | --- |
| `/api/menu/categories` | GET | 전체 (displayOrder 정렬) |
| `/api/menu/categories` | POST | 생성 (`name` 필수) |
| `/api/menu/categories/[id]` | PUT/DELETE | 수정/삭제 |
| `/api/menu/items` | GET | `?categoryId=`로 필터 |
| `/api/menu/items` | POST | 생성 (`name`, `categoryId`, `price` 필수) |
| `/api/menu/items/[id]` | GET/PUT/DELETE | 단건 조회·수정·삭제 |
| `/api/orders` | GET | `?status=`로 필터, 최신순 |
| `/api/orders` | POST | 생성 (`tableNumber`, `items` 필수, totalPrice 서버 재계산) |
| `/api/orders/[id]` | PUT | `status` 변경 (`pending`/`preparing`/`completed`만) |
| `/api/tables` | GET/PUT | `{ tables: number }` |

---

## 9. 페이지 → 데이터 의존 한눈 보기

| 페이지 | 읽는 API | 쓰는 API | 폴링 |
| --- | --- | --- | --- |
| `/admin` | `getOrders` | — | 10s |
| `/admin/menu` | `getCategories`, `getMenuItems` | menu CRUD 전체 | 없음 (수동) |
| `/admin/orders` | `getOrders` | `updateOrderStatus` | 5s |
| `/admin/tables` | `getTableCount` | `setTableCount` | 없음 |
| `/order/[n]` | `getCategories`, `getMenuItems` | — (cart는 로컬) | 없음 |
| `/order/[n]/cart` | — | `createOrder` | 없음 |
| `/order/[n]/complete` | `getOrders` (id로 find) | — | 5s |

---

## 10. 새 컴포넌트를 만들기 전에

1. `components/ui/`에 비슷한 게 있는가? → 있으면 props/variant 확장.
2. 페이지 내부에서만 쓰면 같은 `page.tsx`에 내부 함수로 두는 게 기존 패턴 (예: `MenuItemCard`, `OptionModal`).
3. 두 페이지 이상에서 쓰면 `components/`로 승격 — 이때 `'use client'` 여부 결정 + props 인터페이스 정의 + default export.
4. 도메인 모델이 등장하면 `src/types/index.ts`에 타입 추가 후 import.
