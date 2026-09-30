---

description: "Task list for 002-ticket-management-api (GET/PATCH/DELETE endpoints)"
---

# Tasks: 티켓 조회·수정·완료·삭제·이동 (Ticket Management API)

**Input**: Design documents from `/specs/002-ticket-management-api/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ticket-management.md, quickstart.md

**Tests**: 포함한다 — CLAUDE.md와 constitution이 TDD(Red → Green → Refactor)를 요구한다.

**Organization**: 사용자 시나리오(spec.md) 단위. 각 스토리는 Red(테스트) → 실패 확인 → Green(구현) → 통과 확인.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 미완료 작업에 의존하지 않음)
- **[Story]**: US1 보드 조회 · US2 상세 조회 · US3 수정 · US4 완료 · US5 이동 · US6 삭제

## Path Conventions

Route Handler `app/api/tickets/`, 규칙·서비스 `src/server/services/`, 공유 `src/shared/`,
테스트 `__tests__/services/`(DB 없는 단위) · `__tests__/api/`(tika_test 통합).

## 현재 상태 (착수 전)

`POST /api/tickets`만 구현됨. 테스트 25개 통과 중(`__tests__/api/tickets.test.ts` 22개, `__tests__/services/ticketService.test.ts` 3개).
기존 테스트는 수정·삭제하지 않는다.

---

## Phase 1: Setup (명세 선행 수정)

**Purpose**: constitution 원칙 II·III — spec.md Clarifications와 research 결정을 코드보다 먼저 명세 문서에 반영

- [X] T001 [P] docs/API_SPEC.md 갱신: §7 position을 "대상 칼럼 내 인덱스(0부터, 이동 티켓 제외 기준, 칼럼 길이 이상이면 맨 뒤)"로 명시 · 재정렬 조건을 "사이에 넣을 정수가 없으면(간격 1 이하)"로 · 중간값 내림 · 빈 칼럼 0 · startedAt 규칙을 "다른 칼럼에서 TODO로 이동 시 현재 시각, 다른 칼럼에서 BACKLOG로 이동 시 null, 그 외 변경 없음"으로 · affected는 재정렬이 없으면 `[]` · §7 에러 표에 형식 오류 "요청 형식이 올바르지 않습니다" 추가 / §5에 "이미 DONE이면 변경 없이 200" 추가, position 규칙에 "Done이 비어 있으면 0" / §3·4·5·6 에러 표에 `400 VALIDATION_ERROR id 형식 오류 "요청 형식이 올바르지 않습니다"` 추가 / §4 dueDate 제약을 "내일 이후(Asia/Seoul)"로, 에러 표에 제목 빈 값·형식 오류 행 추가, "바꿀 필드가 없으면 변경 없이 200" 추가
- [X] T002 [P] docs/REQUIREMENTS.md 갱신: FR-004 dueDate "내일 이후", 제목 빈 값 메시지 / FR-005 재완료 규칙 / FR-007 position 인덱스 의미·재정렬 조건·startedAt 규칙(Backlog 이동 시 항상 null)
- [X] T003 [P] docs/DATA_MODEL.md 갱신: §5.1 표에 "다른 칼럼 → BACKLOG: startedAt = null" 반영 / §5.5 "빈 칼럼이면 0", "중간값은 내림한 정수", "간격 1 이하면 0부터 1024 간격 재정렬"
- [X] T004 docs/TEXT_CASES.md에 엣지 시나리오 추가 (T001~T003 이후): 003-5 id `0`·`-1`·`1.5` → 400 / 004-10 빈 제목 → 400 "제목을 입력해주세요" / 004-11 오늘 종료예정일 → 400 / 004-12 빈 본문 `{}` → 200 변경 없음 / 004-13 응답에 isOverdue 포함 / 005-6 이미 DONE 재완료 → 200, completedAt·updatedAt 유지 / 005-7 Done이 비어 있으면 position 0 (단위) / 007-13 빈 칼럼으로 이동 → position 0 (단위) / 007-14 인덱스가 칼럼 길이 이상 → 맨 뒤 / 007-15 IN_PROGRESS → BACKLOG → startedAt null / 007-16 같은 칼럼 내 이동은 startedAt 유지 / 007-17 position 음수·소수·누락 → 400 "요청 형식이 올바르지 않습니다" / 007-18 재정렬 없는 이동은 affected `[]`

**Checkpoint**: 명세 문서가 contracts/ticket-management.md와 일치

---

## Phase 2: Foundational (공통 기반)

**Purpose**: 모든 스토리가 쓰는 타입·검증·응답 헬퍼·테스트 도구. 기존 25개 테스트가 계속 통과해야 한다.

**⚠️ CRITICAL**: 이 단계가 끝나야 사용자 시나리오 작업을 시작한다

- [X] T005 package.json 스크립트 변경: `"test": "jest --runInBand"`, `"test:watch": "jest --watch --runInBand"` (research R8 — API 테스트 파일이 같은 tika_test를 동시에 쓰지 않게 직렬 실행)
- [X] T006 [P] src/shared/types/index.ts에 추가: `AffectedTicket { id: number; position: number }`, `ReorderResult { ticket: Ticket; affected: AffectedTicket[] }`, `BoardResponse { board: BoardData; total: number }`
- [X] T007 [P] src/shared/validations/common.ts에 `ticketIdSchema` 추가: `/^[1-9]\d*$/` 문자열 → number 변환, 안전 정수 범위, 실패 메시지 "요청 형식이 올바르지 않습니다"
- [X] T008 [P] src/server/middleware/errorHandler.ts에 `notFoundResponse()` 추가: 404 `{ error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' } }`
- [X] T009 src/server/middleware/validate.ts에 `validateTicketId(id: string)` 추가: `ticketIdSchema` 실패 시 400 `VALIDATION_ERROR` 응답, 성공 시 `{ success: true, id: number }` (T007 이후)
- [X] T010 [P] __tests__/helpers/ticketFixtures.ts 생성: `insertTicket(overrides)` — Drizzle로 tika_test에 직접 insert 후 행 반환(기본값 title "fixture", status BACKLOG, position 0), `seoulDate(offsetDays)`, `createJsonRequest(url, method, body?)`. 삭제·정리 함수는 만들지 않는다 (Guardrails)
- [X] T011 기반 검증: `npm run test` 25개 통과 + `npx tsc --noEmit` + `npm run lint`

**Checkpoint**: 기반 준비 완료, 기존 동작 유지

---

## Phase 3: User Story 1 - 칸반 보드 현황 조회 (Priority: P1) 🎯 MVP

**Goal**: `GET /api/tickets` — 네 칼럼 그룹화, position 정렬, Done 24시간 필터, isOverdue, total.

**Independent Test**: fixture로 넣은 티켓들이 올바른 칼럼에만 나타나고, 25시간 전 완료 티켓은 없으며, 과거 종료예정일 미완료 티켓은 `isOverdue: true`.

### Tests for User Story 1 (Red) ⚠️

- [X] T012 [P] [US1] __tests__/services/ticketRules.test.ts 생성: `isOverdue(ticket, today)` — 008-1 TODO+어제 → true, 008-2 DONE+어제 → false, 008-3 dueDate null → false, 008-4 내일 → false, 008-5 오늘 → false, 008-6 BACKLOG+어제 → true, 008-7 IN_PROGRESS+어제 → true / `isDoneVisible(ticket, now)` — 002-5 23시간 전 → true, 002-6 25시간 전 → false, 정확히 24시간 전 → true, completedAt null → false / `groupBoard(tickets, now)` — 002-1 `[]` → 네 칼럼 빈 배열·total 0, 002-2 상태별 그룹화, 002-3 position 오름차순, 002-4 total은 숨겨진 Done 제외, 002-7 각 티켓에 isOverdue boolean
- [X] T013 [P] [US1] __tests__/api/tickets.test.ts에 `describe('TC-API-002: GET /api/tickets')` 추가: 002-2 fixture(BACKLOG·IN_PROGRESS·DONE 23시간 전)가 각 칼럼에만 존재, 002-3 각 칼럼이 position 오름차순, 002-4 total = 네 칼럼 길이 합, 002-5·002-6 23시간 전 Done은 포함·25시간 전 Done은 제외, 002-7 BACKLOG+과거 dueDate fixture는 isOverdue true·모든 티켓에 boolean, 002-8 모든 티켓에 plannedStartDate·dueDate·startedAt·completedAt 키 존재, 네 칼럼 키 항상 존재
- [X] T014 [US1] `npm run test`로 T012·T013 실패 확인 (Red), 기존 25개는 통과 유지

### Implementation for User Story 1 (Green)

- [X] T015 [US1] src/server/services/ticketRules.ts 생성: `todayInSeoul(now)`, `isOverdue(ticket, today)` — "dueDate !== null && status !== DONE && dueDate < 오늘", `isDoneVisible(ticket, now)` — "now − completedAt <= 24시간", `groupBoard(tickets, now): BoardResponse` — `COLUMN_ORDER` 순 네 칼럼, position 오름차순, Done 필터, total
- [X] T016 [US1] src/server/services/ticketService.ts에 `getBoard(now = new Date()): Promise<BoardResponse>` 추가: 전체 조회 1회 후 `groupBoard` (T015 이후)
- [X] T017 [US1] app/api/tickets/route.ts에 `GET` 추가: `ticketService.getBoard()` → 200, try/catch → `handleUnexpectedError()`
- [X] T018 [US1] `npm run test` 전체 통과 확인 (Green)

**Checkpoint**: 보드 조회 단독 동작 (MVP)

---

## Phase 4: User Story 2 - 티켓 상세 조회 (Priority: P2)

**Goal**: `GET /api/tickets/:id` — 전체 항목 + isOverdue, 404, id 형식 오류 400.

**Independent Test**: 생성한 티켓을 id로 조회하면 모든 필드와 isOverdue가 오고, 없는 id는 404, `abc`는 400.

### Tests for User Story 2 (Red) ⚠️

- [X] T019 [US2] __tests__/api/ticketDetail.test.ts 생성, `describe('TC-API-003')`: 003-1 fixture 티켓 조회 → 200, 12개 필드 값 일치, 003-4 `isOverdue` boolean(과거 dueDate fixture는 true), 003-2 존재하지 않는 id(2147483647) → 404 `{ error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' } }`, 003-3 `abc` → 400 `VALIDATION_ERROR` "요청 형식이 올바르지 않습니다", 003-5 `0`·`-1`·`1.5` → 400. Route 호출은 `GET(request, { params: Promise.resolve({ id }) })`
- [X] T020 [US2] `npx jest __tests__/api/ticketDetail.test.ts` 실패 확인 (Red — 모듈 없음)

### Implementation for User Story 2 (Green)

- [X] T021 [US2] src/server/services/ticketService.ts에 `getById(id, now = new Date()): Promise<TicketWithMeta | null>` 추가 (`isOverdue` 계산 포함)
- [X] T022 [US2] app/api/tickets/[id]/route.ts 생성 — `GET`: `validateTicketId(await params.id)` → `getById` → 없으면 `notFoundResponse()`, 있으면 200. try/catch → `handleUnexpectedError()`
- [X] T023 [US2] `npm run test` 전체 통과 확인 (Green)

**Checkpoint**: 상세 조회 단독 동작 — 이후 스토리 테스트가 결과 확인에 사용

---

## Phase 5: User Story 3 - 티켓 내용 수정 (Priority: P2)

**Goal**: `PATCH /api/tickets/:id` — 전달된 필드만 수정, null로 비우기, 시스템 필드 무시.

**Independent Test**: 제목만 수정하면 제목만 바뀌고, `{ description: null }`은 설명을 비우며, `{ status: "DONE" }`은 무시된다.

### Tests for User Story 3 (Red) ⚠️

- [X] T024 [US3] __tests__/api/ticketDetail.test.ts에 `describe('TC-API-004')` 추가: 004-1 `{ title: "새 제목" }` → 200, 제목만 변경·나머지 유지 / 004-2 `{ priority: "LOW" }` / 004-3 `{ description: null }` → null / 004-4 `{ dueDate: null }` → null / 004-5 `{ plannedStartDate: "2026-03-01" }` / 004-6 `{ plannedStartDate: null }` / 004-7 없는 id → 404 / 004-8 수정 후 updatedAt > 이전 updatedAt / 004-9 `{ status: "DONE", title: "x" }` → 200, status 유지 / 004-10 `{ title: "  " }` → 400 "제목을 입력해주세요" / 004-11 dueDate 오늘 → 400 "종료예정일은 오늘 이후 날짜를 선택해주세요", 201자 제목·1001자 설명·`priority: "URGENT"` → 각 메시지 / 004-12 `{}` → 200, updatedAt 유지 / 004-13 응답에 isOverdue 포함 / `{ title: null }`·비 JSON 본문 → 400 "요청 형식이 올바르지 않습니다"
- [X] T025 [US3] `npx jest __tests__/api/ticketDetail.test.ts` 신규 테스트 실패 확인 (Red)

### Implementation for User Story 3 (Green)

- [X] T026 [US3] src/shared/validations/tickets.ts에 `updateTicketSchema` 추가: 생성 스키마의 필드 규칙 재사용 — title optional(trim 후 1~200자), description optional·nullable(최대 1000자), priority optional(기본값 없음), plannedStartDate optional·nullable(유효한 YYYY-MM-DD), dueDate optional·nullable(유효한 YYYY-MM-DD, Asia/Seoul 기준 내일 이후). 알 수 없는 키는 strip. 생성 스키마와 필드 정의 중복 없이 공유
- [X] T027 [US3] src/server/services/ticketService.ts에 `update(id, input: UpdateTicketInput, now = new Date()): Promise<TicketWithMeta | null>` 추가: 없으면 null, 전달된 키가 없으면 갱신 없이 현재 티켓, 있으면 해당 키만 set 후 반환(isOverdue 포함)
- [X] T028 [US3] app/api/tickets/[id]/route.ts에 `PATCH` 추가: `validateTicketId` → `validateBody(request, updateTicketSchema)` → `update` → 404 또는 200
- [X] T029 [US3] `npm run test` 전체 통과 확인 (Green)

**Checkpoint**: 조회·수정이 독립적으로 동작

---

## Phase 6: User Story 4 - 티켓 완료 처리 (Priority: P2)

**Goal**: `PATCH /api/tickets/:id/complete` — DONE 전환, completedAt, Done 맨 위, 재완료는 변경 없음.

**Independent Test**: 완료 후 status DONE·completedAt ≈ 현재, 두 번째로 완료한 티켓의 position이 먼저 완료한 것보다 작고, 재완료는 completedAt이 그대로.

### Tests for User Story 4 (Red) ⚠️

- [X] T030 [US4] __tests__/api/ticketComplete.test.ts 생성, `describe('TC-API-005')`: 005-1 완료 → 200, status DONE, completedAt 문자열, 응답에 isOverdue 없음 / 005-2 completedAt이 현재 시각 ±5초 / 005-3 연속 두 건 완료 시 나중 것의 position = 먼저 것 − 1024 / 005-4 없는 id → 404 / 005-5 updatedAt > 이전 / 005-6 이미 DONE 재완료 → 200, completedAt·updatedAt·position 동일 / id `abc` → 400 / startedAt은 완료 전 값 유지
- [X] T031 [US4] `npx jest __tests__/api/ticketComplete.test.ts` 실패 확인 (Red — 모듈 없음)

### Implementation for User Story 4 (Green)

- [X] T032 [US4] src/server/services/ticketService.ts에 `complete(id, now = new Date()): Promise<Ticket | null>` 추가: 없으면 null, 이미 DONE이면 그대로 반환, 아니면 `status: DONE`, `completedAt: now`, `position: getNextTopPosition(DONE 최솟값)` — "Done 최솟값 − 1024, Done이 비어 있으면 0"
- [X] T033 [US4] app/api/tickets/[id]/complete/route.ts 생성 — `PATCH`: `validateTicketId` → `complete` → 404 또는 200 (본문은 읽지 않음), `.gitkeep` 삭제
- [X] T034 [US4] `npm run test` 전체 통과 확인 (Green)

**Checkpoint**: 완료 처리 단독 동작, US1의 Done 칼럼에서 확인 가능

---

## Phase 7: User Story 5 - 드래그앤드롭으로 상태·순서 변경 (Priority: P2)

**Goal**: `PATCH /api/tickets/reorder` — 인덱스 기반 이동, 순서 값 계산·재정렬, 시작일·종료일 전이, 트랜잭션.

**Independent Test**: Backlog 티켓을 TODO 0번 자리로 옮기면 TODO 맨 위·startedAt 설정, DONE → BACKLOG는 두 날짜 모두 null, status DONE은 400.

### Tests for User Story 5 (Red) ⚠️

- [X] T035 [P] [US5] __tests__/services/ticketRules.test.ts에 추가: `calculateInsertPosition(others, index)` — 007-13 빈 칼럼 → `{ position: 0, affected: [] }`, 맨 앞(index 0) → 첫 값 − 1024, 맨 뒤·007-14 index ≥ 길이 → 마지막 + 1024, 사이(0과 1024 사이) → 512, 홀수 합은 내림, 007-8 간격 1(예: 5와 6 사이) → 전체 `i * 1024` 재정렬·이동 티켓 `index * 1024`·affected에 값이 바뀐 다른 티켓만, 간격 0(같은 값)도 재정렬 / `getTimestampChanges(from, to, now)` — 007-3 BACKLOG→TODO `{ startedAt: now }`, 007-4 TODO→BACKLOG `{ startedAt: null }`, 007-5 DONE→TODO `{ startedAt: now, completedAt: null }`, 007-6 DONE→BACKLOG `{ startedAt: null, completedAt: null }`, 007-7 TODO→IN_PROGRESS `{}`, 007-15 IN_PROGRESS→BACKLOG `{ startedAt: null }`, 007-16 TODO→TODO `{}`, IN_PROGRESS→TODO `{ startedAt: now }`
- [X] T036 [P] [US5] __tests__/api/ticketReorder.test.ts 생성, `describe('TC-API-007')`: 007-1 BACKLOG 티켓을 `{ status: "TODO", position: 0 }` → 200, status TODO, 직후 보드 조회에서 TODO 첫 번째 / 007-2 IN_PROGRESS fixture 두 건에서 뒤의 것을 index 0으로 → status 유지, position이 앞의 것보다 작음 / 007-3 startedAt ≈ 현재 / 007-4 TODO→BACKLOG startedAt null / 007-5 DONE fixture→TODO completedAt null·startedAt 설정 / 007-6 DONE→BACKLOG 둘 다 null / 007-7 TODO→IN_PROGRESS startedAt 동일 / 007-9 `status: "DONE"` → 400 `VALIDATION_ERROR` / 007-10 `status: "INVALID"` → 400 "상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요" / 007-11 없는 ticketId → 404 / 007-12 updatedAt > 이전 / 007-14 position 999999 → 해당 칼럼 마지막 / 007-17 position −1·1.5·누락, ticketId 문자열 → 400 "요청 형식이 올바르지 않습니다" / 007-18 응답 형식 `{ ticket, affected: [] }`, ticket에 isOverdue 없음
- [X] T037 [US5] `npm run test`로 T035·T036 실패 확인 (Red)

### Implementation for User Story 5 (Green)

- [X] T038 [US5] src/server/services/ticketRules.ts에 `calculateInsertPosition`, `getTimestampChanges` 추가 (data-model.md "순서 값 계산"·"상태 전이와 타임스탬프" 표 그대로)
- [X] T039 [P] [US5] src/shared/validations/tickets.ts에 `reorderTicketSchema` 추가: ticketId 양의 정수, status는 BACKLOG·TODO·IN_PROGRESS만(누락·DONE·기타 → "상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요"), position 0 이상의 정수. ticketId·position 오류는 "요청 형식이 올바르지 않습니다"
- [X] T040 [US5] src/server/services/ticketService.ts에 `reorder(input: ReorderTicketInput, now = new Date()): Promise<ReorderResult | null>` 추가: `db.transaction` 안에서 대상 조회(없으면 null) → 대상 칼럼의 다른 티켓 position 오름차순 조회 → `calculateInsertPosition` → `getTimestampChanges` → 이동 티켓 update → affected 각각 update (T038 이후)
- [X] T041 [US5] app/api/tickets/reorder/route.ts 생성 — `PATCH`: `validateBody(request, reorderTicketSchema)` → `reorder` → 404 또는 200 `{ ticket, affected }`, `.gitkeep` 삭제
- [X] T042 [US5] `npm run test` 전체 통과 확인 (Green)

**Checkpoint**: 생성 → 이동 → 완료 → Done에서 되돌리기 흐름 전체 동작

---

## Phase 8: User Story 6 - 티켓 삭제 (Priority: P3)

**Goal**: `DELETE /api/tickets/:id` — 하드 삭제, 204, 없는 id 404.

**Independent Test**: 자신이 만든 티켓을 삭제하면 204이고 재조회는 404.

### Tests for User Story 6 (Red) ⚠️

- [X] T043 [US6] __tests__/api/ticketDetail.test.ts에 `describe('TC-API-006')` 추가: 006-1 fixture 티켓 삭제 → 204·본문 없음, 같은 id 상세 조회 → 404 / 006-2 없는 id → 404 "티켓을 찾을 수 없습니다" / id `abc` → 400
- [X] T044 [US6] `npx jest __tests__/api/ticketDetail.test.ts` 신규 테스트 실패 확인 (Red)

### Implementation for User Story 6 (Green)

- [X] T045 [US6] src/server/services/ticketService.ts에 `remove(id): Promise<boolean>` 추가: `delete … where id = ?` returning으로 삭제 여부 반환 (단건, WHERE 필수)
- [X] T046 [US6] app/api/tickets/[id]/route.ts에 `DELETE` 추가: `validateTicketId` → `remove` → false면 `notFoundResponse()`, true면 `new NextResponse(null, { status: 204 })`
- [X] T047 [US6] `npm run test` 전체 통과 확인 (Green)

**Checkpoint**: 7개 엔드포인트 모두 동작

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T048 Refactor: Route Handler 4개 파일의 반복(try/catch, id 검증, 404 변환)과 서비스의 중복 조회를 정리 (동작 변화 없음, 테스트 통과 유지)
- [X] T049 품질 게이트: `npx tsc --noEmit && npm run lint && npm run test && npm run build` 모두 통과, build 출력에 4개 API 라우트 확인
- [X] T050 specs/002-ticket-management-api/quickstart.md §3 수동 확인 12단계 (`npx next dev -p 3100` + curl, 확인용 티켓은 10단계에서 삭제)
- [X] T051 [P] CLAUDE.md 갱신: 진행 현황(FR-002~008 백엔드 완료, 다음은 프론트엔드), 명령어(`--runInBand`), 공통 기반(`ticketRules.ts`, `validateTicketId`, `notFoundResponse`, 테스트 fixture)
- [X] T052 [P] docs/history/YYYY-MM-DD-ticket-management-implement.md 작업 기록 (변경 파일, 실행 명령어와 의미)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작. T004는 T001~T003 이후
- **Foundational (Phase 2)**: Setup 이후. 모든 스토리를 막는다
- **US1 (Phase 3)**: Foundational 이후. 다른 스토리에 의존하지 않음
- **US2 (Phase 4)**: Foundational 이후. US3·US6과 Route·테스트 파일을 공유하므로 먼저 진행
- **US3 (Phase 5)**, **US6 (Phase 8)**: US2 이후 (같은 `[id]/route.ts`, `ticketDetail.test.ts`)
- **US4 (Phase 6)**: Foundational 이후. 기능상 독립
- **US5 (Phase 7)**: Foundational 이후. 테스트 007-1이 보드 조회(US1)를 사용하므로 US1 이후
- **Polish (Phase 9)**: 모든 스토리 이후

### User Story Dependencies

```text
Foundational ─┬─ US1 (보드) ──────────── US5 (이동)
              ├─ US2 (상세) ─┬─ US3 (수정)
              │              └─ US6 (삭제)
              └─ US4 (완료)
```

`src/server/services/ticketService.ts`를 모든 스토리가 수정하므로 실제 구현은 Phase 순서대로 순차 진행한다.

### Within Each User Story

- 테스트 작성 → 실패 확인(Red) → 구현 → 통과 확인(Green). Green 단계에서 테스트는 수정하지 않는다
- 규칙 함수(ticketRules) → 스키마(shared) → 서비스 → Route Handler

### Parallel Opportunities

- T001 ∥ T002 ∥ T003 (서로 다른 명세 문서)
- T006 ∥ T007 ∥ T008 ∥ T010 (서로 다른 파일)
- T012 ∥ T013 (단위 테스트 파일 vs API 테스트 파일)
- T035 ∥ T036 (단위 vs API), T039는 T038과 다른 파일
- T051 ∥ T052

---

## Parallel Example: User Story 5

```bash
# Red 단계 테스트를 동시에 작성:
Task: "T035 __tests__/services/ticketRules.test.ts에 calculateInsertPosition·getTimestampChanges 단위 테스트"
Task: "T036 __tests__/api/ticketReorder.test.ts에 TC-API-007 통합 테스트"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE**: 보드 조회로 기존에 생성한 티켓이 칼럼별로 보이는지 확인

### Incremental Delivery

1. Setup + Foundational → 기존 25개 테스트 유지
2. US1 보드 조회 (MVP) → 3. US2 상세 → 4. US3 수정 → 5. US4 완료 → 6. US5 이동 → 7. US6 삭제
3. 각 스토리 완료 시점마다 `npm run test` 전체 통과가 체크포인트
4. Polish → 품질 게이트·수동 확인

---

## Notes

- 테스트 DB(tika_test)는 비우지 않는다. 통합 테스트는 "내가 만든 id" 기준으로만 단언한다
- 빈 보드(002-1), 빈 칼럼 position(005-7, 007-13), 재정렬(007-8), 24시간 경계는 DB 없는 단위 테스트로만 검증한다
- 삭제 테스트(006-1)는 자신이 만든 티켓 한 건을 DELETE API로 지운다 (기능 검증, `WHERE id = ?`)
- T005(`--runInBand`)는 설정 변경이다 — 이 계획의 승인으로 진행한다
- 500 경로는 자동 테스트 없이 코드 리뷰로 확인한다
