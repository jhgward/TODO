# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 작업 기록
docs/history/ 폴더 아래에 YYYY-MM-DD-task-name.md 형식으로 자동 저장해줘.
단계별 실행한 bash의 명령어 의미, 사용 이유 등도 작성해줘.

## 프로젝트 개요
Tika는 티켓 기반 칸반 보드 TODO 앱이다 (단일 사용자 MVP, 4개 칼럼: Backlog / TODO / In Progress / Done).
Next.js App Router 기반으로, 프론트엔드와 백엔드를 디렉토리 수준에서 분리한다.
src/shared/에서 타입과 검증 스키마를 공유한다.

> 현재 저장소에는 명세 문서(docs/)만 있고 코드는 아직 스캐폴딩되지 않았다.
> 개발 순서: 백엔드(TC-API 기반 TDD) → 프론트엔드(TC-COMP, TC-INT 기반).

## 명령어
```bash
npm run dev            # 개발 서버 (http://localhost:3000)
npm run build          # 프로덕션 빌드
npm run lint           # ESLint
npm run format         # Prettier
npm run test           # 전체 테스트 (Jest)
npm run test:watch     # 감시 모드
npx jest __tests__/services/ticketService.test.ts   # 단일 파일
npx jest -t "테스트 이름"                             # 이름으로 단일 테스트

npm run db:generate    # drizzle-kit generate (마이그레이션 SQL 생성 → drizzle/)
npm run db:migrate     # drizzle-kit migrate
npm run db:seed        # src/server/db/seed.ts
npm run db:studio      # Drizzle Studio
```
환경 변수: `.env.local`에 `POSTGRES_URL` 설정 (`cp .env.example .env.local` 또는 `vercel env pull .env.local`).

## 프로젝트 구조
- app/api/       : 백엔드 진입점 (Route Handlers, 요청 파싱 + 응답만)
- app/(board)/   : 프론트엔드 페이지 그룹 (메인 보드)
- src/server/    : 백엔드 로직 (services, db, middleware)
- src/client/    : 프론트엔드 로직 (components, hooks, api 호출)
- src/shared/    : 공유 타입, Zod 스키마, 상수
- __tests__/     : api / services / components / hooks 별 테스트
- docs/          : 프로젝트 명세 문서

import 방향: `src/server` ↔ `src/client` 상호 import 금지. 양쪽 모두 `src/shared`만 참조한다.

## 기술 스택
- Framework: Next.js 15 (App Router)
- Language: TypeScript (strict mode)
- Frontend: React 19
- Styling: Tailwind CSS 4
- Drag & Drop: @dnd-kit/core + @dnd-kit/sortable
- ORM: Drizzle ORM (drizzle-kit로 마이그레이션)
- DB: Vercel Postgres (Neon), @vercel/postgres 드라이버
- Validation: Zod
- Testing: Jest + React Testing Library
- Deployment: Vercel

## 핵심 도메인 규칙 (여러 문서에 흩어져 있음 — 상세는 DATA_MODEL.md §5, API_SPEC.md)
- **상태 이동 API 분리**: Done으로의 이동은 반드시 `PATCH /api/tickets/:id/complete`, 그 외 모든 이동(Done에서 나가는 것 포함)은 `PATCH /api/tickets/reorder`. reorder의 status는 `ReorderableStatus`(DONE 제외).
- **시스템 관리 타임스탬프** (사용자 입력 불가):
  - `startedAt`: TODO로 이동 시 현재 시각, TODO→BACKLOG 시 null
  - `completedAt`: complete 시 현재 시각, DONE에서 나갈 때 null
  - 사용자 입력 날짜(`plannedStartDate`, `dueDate`)는 `YYYY-MM-DD` 문자열(DATE), 시스템 필드는 TIMESTAMP.
- **파생/필터 (서버에서 `GET /api/tickets` 시 계산, DB 저장 안 함)**:
  - `isOverdue` = dueDate < 오늘 && status !== DONE → `TicketWithMeta`
  - Done 칼럼은 completedAt 기준 24시간 이내만 반환
- **position**: 칼럼 내 오름차순. 새 티켓은 Backlog `min(position) - 1024`(맨 위), DnD는 인접 카드 중간값, 간격 ≤ 1이면 칼럼 전체를 1024 간격으로 재정렬.
- status/priority는 PostgreSQL ENUM이 아닌 VARCHAR + Zod 검증.

## 프로젝트 문서 (반드시 참조)
- 제품 요구사항: /docs/PRD.md
- 기술 요구사항: /docs/TRD.md
- 상세 요구사항: /docs/REQUIREMENTS.md
- API 명세: /docs/API_SPEC.md
- 데이터 모델: /docs/DATA_MODEL.md
- 컴포넌트 명세: /docs/COMPONENT_SPEC.md
- 테스트 케이스: /docs/TEST_CASES.md (현재 실제 파일명은 docs/TEXT_CASES.md)

## 코딩 컨벤션

### TypeScript (공통)
- strict 모드 사용
- any 사용 금지, unknown 사용 후 타입 가드
- 인터페이스는 I 접두사 없이 명사로 (예: Ticket, BoardData)
- enum 대신 const 객체 + typeof 패턴 사용
- 공유 타입은 반드시 @/shared/types에서 import

### 백엔드 (app/api/ + src/server/)
- Route Handler는 얇게: 요청 파싱 → 서비스 호출 → 응답 반환
- 비즈니스 로직은 src/server/services/에 작성
- Zod로 요청 검증 (shared/validations에서 import)
- 에러 응답 형식 통일: { error: { code, message } }
- HTTP 상태 코드: 200, 201, 204, 400, 404, 500
- DB 쿼리는 Drizzle ORM으로만 작성 (raw SQL 금지)

### 프론트엔드 (src/client/)
- 함수 컴포넌트 + 화살표 함수
- Props 타입은 컴포넌트 파일 내 정의
- API 호출은 src/client/api/ticketApi.ts를 통해서만
- 파일명: PascalCase (예: TicketCard.tsx)

## 개발 규칙

### 반드시 지켜야 할 것
- 새 기능 구현 전 TEST_CASES.md의 해당 테스트부터 작성
- API 구현 시 API_SPEC.md의 명세를 정확히 따르기
- 컴포넌트 구현 시 COMPONENT_SPEC.md의 Props와 동작 준수
- 타입 변경 시 src/shared/types 먼저 수정

### 하지 말아야 할 것
- 명세에 없는 기능 임의 추가 금지
- 테스트 코드 삭제 또는 skip 금지
- any 타입 사용 금지
- console.log 커밋 금지 (디버깅 후 제거)
- src/client/에서 직접 DB 접근 금지
- src/server/에서 React 관련 코드 작성 금지

### 경계 규칙
- 백엔드 작업 시(app/api/, src/server/) 프론트엔드(src/client/) 코드 수정 금지
- 프론트엔드 작업 시(src/client/) 백엔드(app/api/, src/server/) 코드 수정 금지
- 양쪽에 영향을 주는 변경은 src/shared/ 먼저 수정 후 각각 반영

### TDD 사이클 규칙
- Red 단계: 테스트 코드만 작성, 구현 코드 생성 금지
- Green 단계: 테스트를 통과하는 최소한의 코드만 작성, 테스트 코드 수정 금지
- Refactor 단계: 코드 개선만, 새 기능 추가 금지, 테스트는 반드시 통과 유지
- 테스트와 구현을 한 번에 작성하지 말 것 — 반드시 단계별로 진행
- 테스트 실패 시 구현을 수정할 것, 테스트를 수정하지 말 것 (명세 오류인 경우 명세 먼저 수정)
