# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요
Tika는 티켓 기반 칸반 보드 TODO 앱이다 (단일 사용자 MVP, 4개 칼럼: Backlog / TODO / In Progress / Done).
**SDD(Spec-Driven Development)** 로 개발한다: `docs/`의 명세가 단일 진실 공급원(Single Source of Truth)이며, 코드는 명세 → 테스트 → 구현 순서로만 만들어진다.
Next.js App Router 기반으로 프론트엔드와 백엔드를 디렉토리 수준에서 분리하고, `src/shared/`에서 타입과 검증 스키마를 공유한다.

### 진행 현황
- 개발 순서: 백엔드(TC-API) → 프론트엔드(TC-COMP, TC-INT)
- FR-001 티켓 생성: **완료** — TC-API-001 전체(001-1 ~ 001-19), Spec Kit 산출물은 `specs/001-create-ticket-api/`
- FR-002 ~ FR-008 (보드 조회, 상세, 수정, 완료, 삭제, 이동, 오버듀): **완료** — TC-API-002 ~ 008, `specs/002-ticket-management-api/`
- **백엔드 API 7개 엔드포인트 모두 구현됨.** 다음: 프론트엔드 (TC-COMP, TC-INT — `src/client/`)
- 백엔드 구조:
  - Route Handler는 `withErrorHandler`로 감싸고 `validateTicketId`·`validateBody` → 서비스 → `notFoundResponse`/JSON 응답 (`src/server/middleware/`)
  - DB 없는 규칙(오버듀, Done 24시간, position 계산·재정렬, 시작일·종료일 전이)은 `src/server/services/ticketRules.ts` 순수 함수, DB 작업은 `ticketService.ts`
  - 스키마·메시지 상수는 `src/shared/validations/tickets.ts`(`TICKET_ERROR_MESSAGES`), 공통 형식 오류·id·날짜 검사는 `common.ts`
- reorder의 `position`은 **칼럼 내 인덱스**(0부터)이고 실제 position 값은 서버가 계산한다
- 테스트: API 통합 테스트는 `__tests__/helpers/ticketFixtures.ts`의 `insertTicket`으로 상태를 만들고 "내가 만든 id" 기준으로만 단언한다 (tika_test는 비우지 않음 — constitution Guardrails). 빈 칼럼·재정렬·시간 경계는 `__tests__/services/`의 단위 테스트로 검증

## 프로젝트 구조
```
app/api/          백엔드 진입점 (Route Handlers: 요청 파싱 → 검증 → 서비스 호출 → 응답)
app/(board)/      프론트엔드 페이지 그룹 (메인 보드)
src/server/       백엔드 로직 — services/, db/(schema, 연결), middleware/
src/client/       프론트엔드 로직 — components/, hooks/, api/ticketApi.ts
src/shared/       공유 코드 — types/, validations/(Zod), constants
__tests__/        api/, services/ (Node 환경) · components/, hooks/ (jsdom 환경)
drizzle/          마이그레이션 SQL (drizzle-kit generate 결과, Git 관리)
docs/             명세 문서, docs/history/ 작업 기록
```
- import 방향: `src/server` ↔ `src/client` 상호 import 금지, 양쪽 모두 `src/shared`만 참조 (ESLint `no-restricted-imports`로 강제, `app/api`는 server 규칙 적용)
- 경로 별칭: `@/*` → `src/*`, 예외로 `@/app/*` → `app/*` (tsconfig paths + jest moduleNameMapper)
- 요청 흐름: `app/api/tickets/route.ts` → `src/server/services/ticketService.ts` → `src/server/db` (Drizzle)

## 기술 스택
- Framework: Next.js 15 (App Router), React 19
- Language: TypeScript 5 (strict mode)
- Styling: Tailwind CSS 4 (CSS 기반 설정 — `tailwind.config.ts` 없음, `postcss.config.mjs` + `app/globals.css`)
- Drag & Drop: @dnd-kit/core 6 + @dnd-kit/sortable 8
- ORM: Drizzle ORM 0.38 + drizzle-kit 0.30
- DB: PostgreSQL — `postgres` 드라이버(`drizzle-orm/postgres-js`), 로컬 개발 DB tika_dev / 테스트 DB tika_test
- Validation: Zod 3
- Testing: Jest 29 (`next/jest`) + React Testing Library + jest-dom
- Lint/Format: ESLint 9 (flat config) + Prettier
- Deployment: Vercel

## 명령어
```bash
npm run dev            # 개발 서버 (http://localhost:3000)
npm run build          # 프로덕션 빌드
npm run lint           # ESLint (eslint .)
npm run format         # Prettier
npx tsc --noEmit       # 타입 검사 (Jest는 SWC 변환만 하므로 타입 검사를 하지 않음)
npm run test           # 전체 테스트 (jest --runInBand: API 테스트가 같은 tika_test를 쓰므로 직렬 실행)
npm run test:watch     # 감시 모드
npx jest __tests__/api/tickets.test.ts   # 단일 파일 (여러 API 테스트 파일을 함께 돌릴 때는 --runInBand)
npx jest -t "001-3"                      # TC ID로 단일 테스트

npm run db:generate    # schema.ts → drizzle/ 마이그레이션 SQL 생성
npm run db:migrate     # .env.local의 DB(tika_dev)에 적용
npm run db:studio      # Drizzle Studio
npm run db:seed        # src/server/db/seed.ts (미작성)
(set -a; . ./.env.test; set +a; npx drizzle-kit migrate)   # 테스트 DB(tika_test)에 적용
```
- 환경 변수 `DATABASE_URL`: `.env.local`(개발), `.env.test`(테스트 — Jest 실행 시 next/jest가 자동 로드). 템플릿은 `.env.example`.
- drizzle.config.ts는 dotenv로 `.env.local`을 읽지만 이미 설정된 환경 변수를 덮어쓰지 않으므로 위 방식으로 테스트 DB를 지정할 수 있다.
- DB 연결은 `idle_timeout: 10` 때문에 테스트 종료 후 약 10초 뒤 Jest가 종료된다 (`Jest did not exit` 경고는 정상).

## 명세 문서 (반드시 참조)
| 문서 | 역할 | 참조 시점 |
|------|------|-----------|
| docs/PRD.md | 제품 요구사항, 시나리오 | 기능 범위 판단 |
| docs/REQUIREMENTS.md | FR / NFR / US, 검증 에러 메시지, 추적 매트릭스 | 모든 기능 구현, 에러 메시지 |
| docs/TRD.md | 아키텍처, 디렉터리 구조, 계층 경계 | 파일 위치·구조 결정 |
| docs/API_SPEC.md | 7개 엔드포인트 요청/응답/에러 | API 구현·테스트 |
| docs/DATA_MODEL.md | 스키마, 타입, 비즈니스 규칙(§5) | DB·타입·서비스 로직 |
| docs/COMPONENT_SPEC.md | 컴포넌트 계층, Props, Hook | 프론트엔드 구현 |
| docs/TEXT_CASES.md | TC-API / TC-COMP / TC-INT 시나리오 | Red 단계 테스트 작성 (다른 문서에서는 `TEST_CASES.md`로 표기됨) |

### 알려진 명세-코드 불일치 (수정 시 명세부터 갱신)
- TRD·README: DB 드라이버 `@vercel/postgres`, 환경 변수 `POSTGRES_URL` → 실제는 `postgres` 드라이버, `DATABASE_URL`
- TRD: Zod 스키마 파일 `validations/ticket.ts` → 실제는 `validations/tickets.ts`
- TRD: `tailwind.config.ts` → Tailwind 4라 없음
- DATA_MODEL: position DB 기본값 1 → 서비스가 항상 직접 지정하므로 사용되지 않음 (빈 칼럼 0, 이후 최솟값 − 1024)

## 핵심 도메인 규칙 (상세는 DATA_MODEL.md §5, API_SPEC.md)
- **상태 이동 API 분리**: Done으로의 이동은 `PATCH /api/tickets/:id/complete`, 그 외 모든 이동(Done에서 나가는 것 포함)은 `PATCH /api/tickets/reorder` (status에 DONE 불가).
- **시스템 관리 타임스탬프** (사용자 입력 불가): `startedAt`은 TODO 이동 시 설정·TODO→BACKLOG 시 null, `completedAt`은 complete 시 설정·DONE에서 나갈 때 null.
- **날짜**: 사용자 입력(`plannedStartDate`, `dueDate`)은 `YYYY-MM-DD` 문자열(DATE), "오늘"은 Asia/Seoul 기준.
- **파생/필터** (`GET /api/tickets`에서 서버 계산, DB 저장 안 함): `isOverdue` = dueDate < 오늘 && status ≠ DONE, Done 칼럼은 completedAt 24시간 이내만.
- **position**: 칼럼 내 오름차순. 새 티켓은 BACKLOG `min(position) - 1024`, DnD는 인접 카드 중간값, 간격 ≤ 1이면 칼럼 전체를 1024 간격으로 재정렬.
- status/priority는 PostgreSQL ENUM이 아닌 VARCHAR + Zod 검증.

## 코딩 컨벤션

### TypeScript (공통)
- strict 모드, `any` 금지 (`unknown` + 타입 가드)
- 인터페이스는 I 접두사 없이 명사 (예: `Ticket`, `BoardData`)
- enum 대신 const 객체 + `typeof` 패턴 (DATA_MODEL.md §4의 `TICKET_STATUS`, `TICKET_PRIORITY`)
- 공유 타입은 `@/shared/types`에서 import

### 백엔드 (app/api/ + src/server/)
- Route Handler는 얇게: 요청 파싱 → Zod 검증 → 서비스 호출 → 응답 반환
- 비즈니스 로직은 `src/server/services/`에만 작성
- Zod 스키마는 `@/shared/validations`에서 import (프론트 폼과 공유)
- 에러 응답: `{ error: { code, message } }`, code는 `VALIDATION_ERROR` / `TICKET_NOT_FOUND` / `INTERNAL_ERROR`
- 에러 메시지는 REQUIREMENTS.md 문구를 그대로 사용
- HTTP 상태 코드: 200, 201, 204, 400, 404, 500
- DB 쿼리는 Drizzle ORM으로만 (raw SQL 금지), React 관련 코드 금지

### 프론트엔드 (src/client/)
- 함수 컴포넌트 + 화살표 함수, Props 타입은 컴포넌트 파일 내 정의
- API 호출은 `src/client/api/ticketApi.ts`를 통해서만, DB 직접 접근 금지
- 파일명 PascalCase (예: `TicketCard.tsx`)

### 테스트
- 테스트 이름은 TC ID로 시작 (예: `it('001-3: 제목이 누락되면 400 ...')`), `describe`는 `TC-API-001: ...` 형식
- 날짜는 하드코딩하지 말고 Asia/Seoul 기준 오늘 ± N일로 계산 (명세 예시 날짜는 이미 지났을 수 있음)

### 공통
- `console.log` 커밋 금지, 테스트 삭제·skip 금지, 명세에 없는 기능 임의 추가 금지

## SDD 워크플로 규칙

### 1. 명세 확인 (Spec)
- 작업 시작 시 대상 FR / US / TC ID를 먼저 특정한다 (TEXT_CASES.md 추적 매트릭스).
- 관련 명세(REQUIREMENTS → API_SPEC / DATA_MODEL / COMPONENT_SPEC → TEXT_CASES)를 읽고 구현 핵심 사항을 정리한다.
- 명세에 공백·모순이 있으면 **추측해서 구현하지 않고** 사용자에게 확인한다. 결정되면 명세 문서를 먼저 수정한다.

### 2. Red — 테스트 작성
- TEXT_CASES.md의 시나리오를 테스트로 옮긴다. 테스트 코드만 작성하고 구현 코드는 만들지 않는다.
- 테스트가 실패하는 것을 실행해서 확인한다.

### 3. Green — 최소 구현
- 테스트를 통과하는 최소한의 코드만 작성한다. 테스트 코드는 수정하지 않는다.
- 테스트가 다루지 않는 명세는 구현하지 않고 "미구현"으로 기록한 뒤, 다음 Red 사이클에서 테스트부터 추가한다.

### 4. Refactor
- 동작을 바꾸지 않는 개선만 한다 (새 기능·새 검증 규칙 추가 금지). 테스트는 계속 통과해야 한다.

### 5. 변경 전파 순서
- 명세 변경: REQUIREMENTS/PRD → API_SPEC·DATA_MODEL·COMPONENT_SPEC → TEXT_CASES → 코드
- 코드 변경: `src/shared/types` → `src/shared/validations` → `src/server` / `src/client`
- 테스트 실패 시 구현을 고친다. 명세 오류라면 명세를 먼저 고친 뒤 테스트 → 구현 순으로 반영한다.

### 6. 작업 범위 경계
- 백엔드 작업(app/api/, src/server/) 중 src/client/ 수정 금지, 프론트엔드 작업 중 app/api/·src/server/ 수정 금지.
- 요청받은 작업 범위 밖(설정 파일, 의존성, 다른 계층)을 바꿔야 하면 먼저 사용자에게 확인한다.

### 7. 작업 기록
- 각 작업을 `docs/history/YYYY-MM-DD-task-name.md`로 자동 저장한다.
- 변경 파일, 결정 사항, 미구현·후속 과제, 실행한 bash 명령어와 그 의미·사용 이유를 포함한다.
- git 반영 단위의 이력은 사용자가 `/changelog "요약"`을 입력할 때만 기록한다 (`.claude/skills/changelog/`). 프롬프트·변경 파일과 라인 수·브랜치·시각·테스트 결과를 `CHANGELOG.md` 맨 위에 추가하고 아래 "최근 변경사항"을 갱신한다. 자동으로 실행하거나 커밋하지 않는다.

## 최근 변경사항

`/changelog`가 관리하는 구역이다. 최근 14일의 요약만 남고 상세 내용은 `CHANGELOG.md`에 있다. 마커 사이는 직접 고치지 않는다.

<!-- changelog:recent:start -->
- 09-30 18:25 [feat/ticket-api] 티켓 API 7개 엔드포인트 구현(TDD), 명세 문서·Spec Kit 산출물 갱신, `/changelog` skill 추가 (파일 102개)
<!-- changelog:recent:end -->
