# Dot Order

QR 코드 기반 카페/식당 간편 주문 시스템.
사장님(관리자)과 손님(고객) 두 가지 화면을 한 Next.js 앱에 담았습니다.

> 숭실대학교 2학년 웹프로그래밍 프로젝트

---

## 주요 기능

### 사장님 (Admin) — `/admin`
- **대시보드** — 오늘의 주문 통계, 매출, 최근 주문 10건 (10초 자동 새로고침)
- **메뉴 관리** — 카테고리·메뉴·옵션(라디오/체크박스, 가격 변동 포함) CRUD
- **주문 관리** — 카드 보드, 상태 필터(대기/준비/완료) 탭, 신규 주문 NEW 강조 (5초 자동 새로고침)
- **테이블 관리** — 1~100 테이블 설정, 테이블별 QR 코드 미리보기 + 단일/전체 인쇄

### 손님 (Order) — `/order/[tableNumber]`
- QR 스캔으로 테이블 번호와 함께 진입
- 카테고리 탭 + 그리드 형태 메뉴판 (이미지·설명·가격)
- 옵션 모달 (필수 옵션 검증, 가격 변동 실시간 합산, 수량 선택)
- 장바구니 (수량 조정·단건 삭제·확인 모달)
- 주문 확정 후 진행 단계 화면 (`pending → preparing → completed`, 5초 자동 갱신)

---

## 기술 스택

| 분야 | 사용 |
| --- | --- |
| 프레임워크 | [Next.js 15](https://nextjs.org) (App Router, Turbopack) |
| 런타임 | React 19 |
| 언어 | TypeScript 5 (`strict`) |
| 스타일 | Tailwind CSS v4 (`@theme inline` 토큰, maroon 팔레트) |
| 상태 관리 | [Zustand 5](https://github.com/pmndrs/zustand) (+ `persist` 미들웨어) |
| QR | [`qrcode.react`](https://github.com/zpao/qrcode.react) |
| 폰트 | `next/font/google` Noto Sans KR |
| 데이터 저장 | **인메모리** (서버 프로세스의 `Map`, 재시작 시 시드 복원) |

> ⚠ DB가 없습니다. 모든 카테고리/메뉴/주문은 `src/lib/server/store.ts`의 `Map`에 저장됩니다.
> 서버를 재시작하면 시드 데이터(카테고리 3개, 메뉴 10개)로 돌아가고 주문 기록은 사라집니다.

---

## 시작하기

### 사전 요구 사항
- Node.js 20+ (LTS 권장)
- npm 10+

### 설치 & 실행

```bash
git clone <this-repo>
cd dot-order
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 열면 자동으로 `/admin`(대시보드)으로 이동합니다.

손님 화면을 직접 열어 보려면:

```
http://localhost:3000/order/1
http://localhost:3000/order/2
...
```

---

## 사용 시나리오

1. **사장님**이 `/admin/tables`에서 테이블 수를 8개로 설정 → 각 테이블의 QR 코드를 인쇄해 매장에 부착.
2. **손님**이 자리에 앉아 QR 스캔 → `/order/3` 같은 URL이 열림 → 메뉴를 골라 주문.
3. 주문이 생기면 사장님 `/admin/orders` 보드에 5초 안에 NEW 카드로 표시됨.
4. 사장님이 *준비 시작* → *완료* 버튼을 누르면 손님 완료 페이지의 진행 단계가 자동으로 갱신됨.

---

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (http://localhost:3000, Hot Reload) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 (build 이후) |
| `npm run lint` | ESLint 9 (Next core-web-vitals + TypeScript) |

---

## 디렉터리 구조

```
src/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # 루트 레이아웃 (Noto Sans KR)
│   ├── page.tsx                 # `/` → `/admin` 리다이렉트
│   ├── globals.css              # Tailwind v4 + maroon 토큰
│   ├── admin/                   # 사장님 화면 (사이드바 레이아웃)
│   │   ├── page.tsx             # 대시보드
│   │   ├── menu/page.tsx        # 메뉴/카테고리/옵션 CRUD
│   │   ├── orders/page.tsx      # 주문 카드 보드 (5s 폴링)
│   │   └── tables/page.tsx      # 테이블 + QR 인쇄
│   ├── order/[tableNumber]/     # 손님 화면 (모바일 폭 max-w-lg)
│   │   ├── page.tsx             # 메뉴판 + 옵션 모달
│   │   ├── cart/page.tsx        # 장바구니 + 주문 확정
│   │   └── complete/page.tsx    # 주문 완료 + 진행 단계
│   └── api/                     # Route Handlers (REST-ish)
│       ├── menu/categories/[id?]
│       ├── menu/items/[id?]
│       ├── orders/[id?]
│       └── tables
├── components/ui/               # 재사용 UI (Button / Badge / Input / Modal)
├── lib/
│   ├── utils.ts                 # 포맷터 + 헬퍼 (formatKRW 등)
│   ├── api/                     # 클라이언트 fetch 래퍼
│   └── server/store.ts          # 인메모리 도메인 저장소 + 시드
├── stores/cartStore.ts          # Zustand 카트 (localStorage persist)
└── types/index.ts               # 도메인 타입 단일 진입점
```

---

## API

REST 형태의 Route Handler. 자세한 스키마는 [`docs/API.md`](./docs/API.md) 참조.

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` / `POST` | `/api/menu/categories` | 카테고리 목록 / 생성 |
| `PUT` / `DELETE` | `/api/menu/categories/[id]` | 카테고리 수정 / 삭제 |
| `GET` / `POST` | `/api/menu/items` | 메뉴 목록 (`?categoryId=`) / 생성 |
| `GET` / `PUT` / `DELETE` | `/api/menu/items/[id]` | 메뉴 단건 |
| `GET` / `POST` | `/api/orders` | 주문 목록 (`?status=`) / 생성 |
| `PUT` | `/api/orders/[id]` | 주문 상태 변경 |
| `GET` / `PUT` | `/api/tables` | 테이블 수 조회 / 변경 |

검증 실패 응답: `400 { error: '한국어 메시지' }`. 미존재: `404`.

---

## AI(Claude/Codex 등) 와 협업할 때

이 저장소에는 AI 친화적인 가이드 문서가 함께 있습니다. 새 기능을 추가하거나 리팩터링할 때
LLM에게 다음 문서를 먼저 읽히면 일관성 있는 코드가 나옵니다.

| 문서 | 내용 |
| --- | --- |
| [`docs/AI_GUIDE.md`](./docs/AI_GUIDE.md) | 진입점 — 프로젝트 한눈에 보기, 작업 체크리스트, 함정 |
| [`docs/CODE_CONVENTIONS.md`](./docs/CODE_CONVENTIONS.md) | 코드 컨벤션 (TS / React / Tailwind / 상태 / API) |
| [`docs/COMPONENTS.md`](./docs/COMPONENTS.md) | 컴포넌트·페이지별 책임과 props |
| [`docs/API.md`](./docs/API.md) | API 엔드포인트 상세 + 데이터 흐름 |

---

## 알려진 한계 (프로토타입 단계)

- **데이터가 휘발성** — 서버 재시작 시 주문 기록 손실, 주문번호도 `#001`로 리셋.
- **인증 없음** — `/admin`은 누구나 접근 가능.
- **카테고리 삭제 시 메뉴 정리 없음** — 카테고리만 삭제되고 해당 메뉴는 고아 상태로 남음.
- **테이블 번호 검증 없음** — `/order/999` 같은 임의 URL도 접근 가능.
- **QR 인쇄는 외부 API 의존** — 단일/전체 인쇄는 `api.qrserver.com` PNG 사용 (오프라인 시 실패).
- **이미지** — `next/image` 사용. 외부 도메인 URL을 메뉴에 넣으려면 `next.config.ts`의 `images.remotePatterns`에 등록 필요.

---

## 라이선스

학교 프로젝트 — 별도 라이선스 미지정.
