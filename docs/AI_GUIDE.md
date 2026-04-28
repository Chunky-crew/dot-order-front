# Dot Order — AI 작업 가이드

이 문서는 AI(Claude / Codex / 기타 LLM)가 `dot-order` 프로젝트에서 작업할 때
**가장 먼저 읽어야 하는 진입점**입니다. 세부 내용은 같은 폴더 안의 다른 문서를 참조하세요.

- 코드 컨벤션 → [`CODE_CONVENTIONS.md`](./CODE_CONVENTIONS.md)
- 컴포넌트 / 페이지 구조 → [`COMPONENTS.md`](./COMPONENTS.md)
- API · 상태 · 데이터 흐름 → [`API.md`](./API.md)

---

## 1. 프로젝트 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 이름 | `dot-order` |
| 종류 | QR 기반 카페/식당 주문 시스템 (관리자 + 손님 양쪽) |
| 프레임워크 | Next.js 15 (App Router, Turbopack) + React 19 |
| 언어 | TypeScript 5 (`strict: true`) |
| 스타일 | Tailwind CSS v4 (`@theme inline` 토큰 + maroon 팔레트) |
| 상태 관리 | Zustand v5 (+ `persist` 미들웨어, localStorage) |
| 데이터 저장 | **인메모리 `Map`** (서버 프로세스 메모리, `src/lib/server/store.ts`) |
| QR | `qrcode.react` (+ 인쇄용은 외부 `api.qrserver.com` 이미지) |
| 한글 폰트 | `next/font/google` `Noto_Sans_KR` |
| 경로 alias | `@/*` → `./src/*` (`tsconfig.json`) |

**중요**: DB가 없습니다. `store.ts`의 `Map`이 곧 데이터베이스이며,
서버 재시작 시 모든 카테고리·메뉴·주문이 초기 시드 상태로 돌아갑니다.

---

## 2. 디렉터리 지도

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # 전역 레이아웃 (Noto Sans KR)
│   ├── page.tsx                      # `/` → `/admin` 으로 redirect
│   ├── globals.css                   # Tailwind v4 + maroon 토큰
│   ├── admin/                        # 사장님(관리자) 영역
│   │   ├── layout.tsx                # 사이드바 레이아웃
│   │   ├── page.tsx                  # 대시보드
│   │   ├── menu/page.tsx             # 메뉴/카테고리/옵션 관리
│   │   ├── orders/page.tsx           # 주문 카드 보드 + 5초 폴링
│   │   └── tables/page.tsx           # 테이블 수 + QR 인쇄
│   ├── order/[tableNumber]/          # 손님(고객) 영역
│   │   ├── layout.tsx                # 모바일 헤더 (max-w-lg)
│   │   ├── page.tsx                  # 메뉴판 + 옵션 모달
│   │   ├── cart/page.tsx             # 장바구니 + 주문 확정
│   │   └── complete/page.tsx         # 주문 완료 + 진행 단계
│   └── api/                          # Route Handlers
│       ├── menu/categories/[id?]
│       ├── menu/items/[id?]
│       ├── orders/[id?]
│       └── tables
├── components/ui/                    # 재사용 UI 프리미티브
│   ├── Button.tsx                    # variant × size
│   ├── Badge.tsx                     # 상태 색상 매핑
│   ├── Input.tsx                     # Input / Textarea / Select
│   └── Modal.tsx                     # 오버레이 + body scroll lock
├── lib/
│   ├── utils.ts                      # 포맷터 + ID/총액 헬퍼
│   ├── api/                          # 클라이언트 fetch wrapper
│   │   ├── menu.ts
│   │   ├── orders.ts
│   │   └── tables.ts
│   └── server/store.ts               # 인메모리 도메인 저장소 + 시드
├── stores/cartStore.ts               # Zustand persist 카트
└── types/index.ts                    # 도메인 타입 단일 소스
```

---

## 3. 두 개의 사용자 흐름

### 사장님(Admin) — `/admin/*`
1. `/admin` 대시보드 — 10초 폴링, 주문 통계 + 최근 10건
2. `/admin/menu` — 좌측 카테고리 패널 / 우측 메뉴 카드 + 모달 CRUD + 옵션 편집기
3. `/admin/orders` — 5초 폴링, 탭 필터(전체/대기/준비/완료), 신규 주문 6초간 NEW 강조
4. `/admin/tables` — 1~100 테이블, QR 미리보기 + 단일/전체 인쇄 (`window.open` + `window.print`)

### 손님(Order) — `/order/[tableNumber]/*`
1. `/order/[tableNumber]` — 카테고리 탭 + 그리드 메뉴, 클릭 시 옵션 모달, 하단 floating 장바구니
2. `/order/[tableNumber]/cart` — 수량 조정, 단건 삭제 모달, 주문 확정 모달
3. `/order/[tableNumber]/complete?orderId=...` — 진행 단계(주문접수 → 준비중 → 완료), 5초 폴링

QR 콘텐츠 = `${origin}/order/${tableNumber}`. 테이블 번호는 URL 세그먼트에서만 들어옵니다.

---

## 4. AI 작업 시 체크리스트

기능을 추가하거나 수정하기 전에 반드시 확인하세요.

- [ ] `src/types/index.ts` 도메인 타입을 그대로 쓰는가? (필요 시 *여기*만 수정)
- [ ] 새 데이터를 저장한다면 `src/lib/server/store.ts`에 함수를 추가하는가? (직접 `Map` 노출 금지)
- [ ] 새 API는 `app/api/.../route.ts`에 만들고, 클라 호출은 `src/lib/api/*`에 wrapper를 추가하는가?
- [ ] 새 UI는 `src/components/ui/*`(Button/Badge/Input/Modal)를 재사용하는가? 색상은 `maroon-*` 토큰?
- [ ] 한글 UI 텍스트인가? (이 프로젝트는 한국어 UI/에러 메시지 사용)
- [ ] `'use client'` 가 필요한 파일인가? (`useState`, `useEffect`, `usePathname`, `useParams`, `useRouter`, `zustand` 사용 시 필수)
- [ ] 주문/메뉴를 변경할 때 폴링 주기(5s/10s)와 정합성이 맞는가?
- [ ] 클라이언트가 가격을 신뢰하지 않도록 합계는 서버(`store.createOrder`)에서 재계산되고 있는가? (현재 그렇게 동작함 — 깨뜨리지 말 것)
- [ ] 빌드/린트로 검증: `npm run build`, `npm run lint`

---

## 5. 자주 빠지는 함정

1. **인메모리 저장소** — 코드 변경으로 서버가 리스타트되면 주문 데이터가 사라집니다.
   주문 시퀀스(`orderCounter`)도 0으로 초기화됩니다.
2. **`useCartStore`는 client only** — `persist` 미들웨어가 localStorage를 쓰므로 SSR 시 hydration mismatch에 주의.
   `cart/page.tsx`가 `mounted` 가드를 두는 이유입니다. 새 페이지에서 카트 값을 즉시 렌더할 때도 동일한 패턴을 따르세요.
3. **카테고리 삭제 시 메뉴 정리 없음** — `deleteCategory`는 카테고리만 지웁니다. 해당 `categoryId`를 가진 메뉴는 고아가 됩니다 (현 동작).
4. **`tableCount` 축소 시 기존 주문 보존** — 테이블 수를 줄여도 과거 주문의 `tableNumber`는 남아있습니다. 손님 페이지는 검증하지 않으므로 임의 번호 URL이 들어와도 동작합니다.
5. **QR 인쇄는 외부 API 의존** — `api.qrserver.com`을 새 창에서 사용합니다. 오프라인이면 실패합니다.
   화면용 QR은 `qrcode.react`로 자체 렌더링되어 별도 의존성이 없습니다.
6. **`/api/menu/items` POST는 `image` 미지정 시 `/images/menu/default.jpg` 자동 주입** — 실제 파일은 `public/`에 없을 수 있으니 placeholder를 항상 고려하세요.
7. **상태 라벨이 두 곳에 흩어져 있음** — `admin/orders/page.tsx`의 `STATUS_LABEL`, `admin/page.tsx`의 `statusLabel`,
   `order/.../complete/page.tsx`의 `STATUS_BADGE_MAP`. 새 상태를 추가하면 세 곳 모두 갱신해야 합니다.

---

## 6. 빌드 / 실행

```bash
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # ESLint (eslint-config-next core-web-vitals + typescript)
```

`/`로 들어오면 자동으로 `/admin`으로 리다이렉트됩니다.
손님 화면은 `http://localhost:3000/order/1`처럼 직접 진입합니다.
