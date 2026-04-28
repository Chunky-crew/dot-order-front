# 코드 컨벤션 (Code Conventions)

`dot-order`에서 일관성 있는 코드를 유지하기 위한 규칙입니다.
새 코드는 기존 코드와 같은 스타일을 따라야 합니다.

---

## 1. 언어 / 모듈

- **TypeScript strict 모드** (`tsconfig.json`의 `strict: true`).
  - `any` 사용 금지. 도메인 타입은 `src/types/index.ts`에 정의.
  - `Partial<T>`, `Omit<T, ...>`을 자유롭게 활용 (예: `Omit<MenuItem, 'id'>`).
- **모듈 시스템**: ESM (`"module": "esnext"`).
- **경로 alias**: 항상 `@/` 사용. `'../../../'` 식의 상대 경로 금지.
  ```ts
  import type { Order } from '@/types';
  import { formatKRW } from '@/lib/utils';
  import Button from '@/components/ui/Button';
  ```

---

## 2. 파일·폴더 명명

| 종류 | 규칙 | 예 |
| --- | --- | --- |
| React 컴포넌트 | `PascalCase.tsx`, default export | `Button.tsx`, `Modal.tsx` |
| 페이지 | App Router 규칙 (`page.tsx`, `layout.tsx`) | `app/admin/orders/page.tsx` |
| 라우트 핸들러 | `route.ts` | `app/api/orders/route.ts` |
| 동적 세그먼트 | `[name]` | `app/order/[tableNumber]` |
| 비-React 모듈 | `camelCase.ts` | `cartStore.ts`, `utils.ts` |
| 도메인 타입 단일 진입 | `src/types/index.ts` | — |

폴더는 모두 소문자 (`admin`, `order`, `cart`, `complete`, `api`).

---

## 3. React / Next.js

### 3-1. 클라이언트 vs 서버 컴포넌트
- **`'use client'`는 파일 첫 줄**.
  훅(`useState`, `useEffect`, `useRef`, `useCallback`),
  Next 클라이언트 훅(`usePathname`, `useParams`, `useRouter`, `useSearchParams`),
  Zustand store, 이벤트 핸들러를 쓰는 모든 컴포넌트에 필요.
- 서버 전용 코드는 클라이언트 모듈에서 import 하지 말 것 (특히 `src/lib/server/store.ts`).
- 라우트 핸들러(`app/api/.../route.ts`)는 자동으로 서버. `'use client'` 안 씀.

### 3-2. Default export 규칙
- `app/**/page.tsx`, `app/**/layout.tsx`, `components/ui/*`는 **default export**.
- `lib/**/*`, `stores/*`, `types/*`는 **named export**.
- 같은 파일에 보조 컴포넌트가 여럿이면 default 1개 + 내부 named 함수.
  (예: `admin/menu/page.tsx`의 `CategoryModal`, `MenuItemModal`, `OptionEditor`, `MenuItemCard`.)

### 3-3. Props 타입
- props는 항상 `interface XxxProps`로 별도 정의 (inline 타입 금지).
- children은 `React.ReactNode`. boolean/optional flag는 `?`로.
  ```ts
  interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }
  ```

### 3-4. 훅 사용 패턴
- 데이터 페칭: `useCallback`으로 fetcher를 메모이즈한 뒤 `useEffect`에서 호출하고
  `setInterval`로 폴링. 언마운트 시 `clearInterval`. (예: `admin/orders/page.tsx`)
- "in-flight" 표시는 `Set<string>`을 state로 (`updatingIds`).
- 직전 값 비교는 `useRef<Set<string>>(new Set())` (예: 새 주문 감지의 `prevOrderIdsRef`).
- 훅 의존성 배열은 정직하게 — ESLint(`react-hooks/exhaustive-deps`) 경고를 방치하지 않음.

---

## 4. 스타일 (Tailwind v4)

### 4-1. 토큰
`globals.css`에서 `@theme inline`으로 정의된 CSS 변수를 사용합니다.

| 토큰 | 용도 |
| --- | --- |
| `maroon-50 ~ 950` | 브랜드 컬러 (특히 `maroon-800`이 primary) |
| `background` | 페이지 기본 배경 |
| `foreground` | 본문 텍스트 |
| `muted` / `muted-foreground` | 보조 배경 / 보조 텍스트 |
| `border` | 보더 |
| `font-sans` | Noto Sans KR |

### 4-2. 클래스 작성 규칙
- 유틸리티 클래스 한 줄 나열 (CSS-in-JS, `clsx` 미도입 — 단순 템플릿 리터럴로 조건부 연결).
  ```tsx
  className={`base-classes ${condition ? 'on' : 'off'} ${className}`}
  ```
- variant/size 매핑은 **객체 룩업**.
  ```ts
  const variantClasses: Record<Variant, string> = { ... };
  className={`... ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
  ```
- 임의 색상 직접 사용 금지. `text-red-600`, `bg-yellow-100` 등 Tailwind 기본 팔레트는 상태 표현(`Badge`, 통계 카드)에서만.
- 외부 변수가 필요한 곳은 `bg-[var(--color-muted)]` 같은 임의 값 표현식 사용 (예: `admin/orders/page.tsx` 헤더).
- 라운드: 카드/버튼 `rounded-lg` 또는 `rounded-xl`, 배지 `rounded-full`, 픽토그램 버튼 `rounded-full`.
- 트랜지션: `transition-colors`, `transition-shadow`, `transition-all` 중 적절한 것. 길이는 기본값.

### 4-3. 모바일 우선
- 손님 페이지는 `max-w-lg mx-auto` 모바일 폭 컨테이너.
- 어드민은 데스크톱 사이드바(`w-60`) 고정 + 본문 `flex-1 overflow-y-auto`.
- 그리드는 반응형 분기: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.

---

## 5. 상태 관리

### 5-1. 서버(공유) 상태
- `src/lib/server/store.ts`의 `Map`이 단일 소스.
- 외부 코드는 함수만 호출 (예: `getAllOrders`, `createOrder`). `Map` 자체를 export 하지 않음.
- 변경 함수는 새로 `set`해서 객체 동일성을 끊고 반환 (`{ ...existing, ...data, id }`).

### 5-2. 클라이언트 상태
- 컴포넌트 로컬 상태가 기본. 페이지 간 공유가 필요한 카트만 Zustand.
- Zustand 스토어는 단일 (`useCartStore`). `persist` 미들웨어로 localStorage 키 `dot-order-cart`.
- 셀렉터 사용 권장: `useCartStore((s) => s.items)` (cart 페이지 참조).
- 파생 값은 store 내부 메서드(`getTotalPrice`, `getTotalCount`)로 계산.
- ID 생성: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` (cart) /
  `cat-${Date.now()}` / `item-${Date.now()}` / `opt-${Date.now()}` / `ch-${Date.now()}` (server store).

---

## 6. API 호출

### 6-1. 서버 (Route Handler)
- `app/api/.../route.ts`에서 `NextRequest`/`NextResponse` 사용.
- 검증 후 한국어 에러 메시지 + HTTP status:
  ```ts
  if (!body.name) {
    return NextResponse.json({ error: '카테고리 이름이 필요합니다' }, { status: 400 });
  }
  ```
- 성공 응답: 생성은 `201`, 수정/조회는 기본 `200`, 삭제는 `{ success: true }`.
- 동적 세그먼트는 `params: Promise<{ id: string }>` (Next 15 시그니처) → `const { id } = await params;`.

### 6-2. 클라이언트 (lib/api)
- 도메인 단위로 파일 분리 (`menu.ts`, `orders.ts`, `tables.ts`).
- 모두 `const API_BASE = '/api'` 상수 사용.
- `fetch` → `await res.json()`. 에러 처리는 호출자가 try/catch (현재 코드 패턴).
- 타입은 wrapper 함수 시그니처에서 명시 (`Promise<MenuItem[]>` 등).

---

## 7. 도메인 타입 / 모델

`src/types/index.ts`가 단일 소스. 추가/변경은 항상 여기서 시작.

```ts
// 핵심 타입
Store, MenuCategory, MenuOption, MenuOptionChoice, MenuItem, CartItem, Order
```

- `Order['status']`는 `'pending' | 'preparing' | 'completed'` 리터럴 유니언. 새 상태 추가 시 영향 범위:
  - `Badge` variant
  - `lib/server/store.ts`의 정렬·필터
  - `app/api/orders/[id]/route.ts`의 검증 배열
  - `admin/orders/page.tsx` `TABS`, `STATUS_LABEL`
  - `admin/page.tsx` `statusLabel`, `Stats` 인터페이스
  - `order/[tableNumber]/complete/page.tsx`의 `STATUS_STEPS`, `STATUS_BADGE_MAP`
- 가격은 항상 정수 (원). 클라가 보낸 `totalPrice`를 신뢰하지 않고 서버가 재계산하는 패턴(`createOrder`)을 유지.
- 옵션은 `radio`(단일) / `checkbox`(복수) 두 종류. `required`는 클라이언트 모달에서 검증(`OptionModal`).

---

## 8. 포맷터 / 유틸

`src/lib/utils.ts`만 사용. 동일 기능을 별도 파일에 다시 만들지 말 것.

| 함수 | 용도 |
| --- | --- |
| `generateId()` | uuid v4 (현재 미사용 — 향후 활용 가능) |
| `generateOrderId()` / `resetOrderCounter()` | `#001` 형식 주문번호 (현재는 `store.ts`가 자체 카운터를 유지 — 둘이 공존, 새 코드는 `store.ts` 흐름을 사용) |
| `formatKRW(price)` | `4,500원` (ko-KR locale) |
| `formatDateTime(iso)` | `14:23` (시:분만) |
| `calculateCartItemTotal(base, opts, qty)` | `(base + Σmodifier) * qty` |

---

## 9. UI 텍스트 / i18n

- **모든 UI/에러 텍스트는 한국어**.
- 버튼·라벨·confirm 메시지 모두 일관된 톤 ("저장", "취소", "삭제", "주문하기").
- 시간 포맷은 `ko-KR` locale로 통일.

---

## 10. 접근성·UX 패턴

- 모달 열림 시 `document.body.style.overflow = 'hidden'` (Modal 내부에서 처리, 추가 작업 불필요).
- 오버레이 클릭으로 닫힘 — `overlayRef.current === e.target` 체크로 내부 클릭은 무시.
- 아이콘 only 버튼은 `aria-label` 필수 (예: 수량 +/-, 삭제).
- 비활성 상태는 `disabled:opacity-50 disabled:cursor-not-allowed`.
- 로딩: 스피너는 `border-4 border-X border-t-transparent rounded-full animate-spin` 패턴.
- 신규 주문 강조: `ring-2 ring-yellow-300` + 6초 타임아웃.
- 폴링: 5초(주문 보드/완료 추적), 10초(대시보드).

---

## 11. 커밋 / 린트

- 커밋 메시지는 한국어 가능 (`feat:`, `fix:`, `chore:` 같은 conventional 접두 사용 — 기존 커밋 참고).
- PR 직전:
  - `npm run lint` 통과
  - `npm run build` 통과 (Next 15 + React 19 컴파일 확인)
- 자동 포맷터 별도 설정 없음 — ESLint 규칙(`eslint-config-next/core-web-vitals`, `typescript`) 만족하면 OK.

---

## 12. 하지 말 것 (Do-Not List)

- ❌ 도메인 타입을 페이지/컴포넌트 안에서 재정의
- ❌ `Map`/내부 상태를 모듈 밖으로 직접 export
- ❌ `'use client'` 컴포넌트에서 `src/lib/server/*` import
- ❌ `useEffect` 안에서 `await` 직접 (별도 async 함수 정의 후 호출)
- ❌ 가격 계산을 클라에서만 처리하고 서버 검증 생략
- ❌ Tailwind 임의 색상값(`#xxxxxx`)을 직접 적기 (토큰 또는 기본 팔레트)
- ❌ 한글 메시지 대신 영어로만 표기 (UI는 한국어)
- ❌ 새 페이지를 `pages/` 디렉터리에 만들기 (이 프로젝트는 App Router 전용)
