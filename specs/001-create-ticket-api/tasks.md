---

description: "Task list for 001-create-ticket-api (POST /api/tickets)"
---

# Tasks: 티켓 생성 (Create Ticket)

**Input**: Design documents from `/specs/001-create-ticket-api/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/post-tickets.md, quickstart.md

**Tests**: 포함한다 — CLAUDE.md와 constitution(Development Workflow)이 TDD(Red → Green → Refactor)를 요구한다.
각 스토리의 테스트 작업은 구현 전에 수행하고, 실패(Red)를 확인한 뒤 구현한다.

**Organization**: 사용자 시나리오(spec.md) 단위로 묶어 각 시나리오를 독립적으로 구현·검증할 수 있게 한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (다른 파일, 미완료 작업에 의존하지 않음)
- **[Story]**: 해당 사용자 시나리오 (US1, US2, US3)

## Path Conventions

Next.js 단일 프로젝트 (plan.md Structure Decision): Route Handler `app/api/`, 백엔드 `src/server/`,
공유 `src/shared/`, 테스트 `__tests__/api/`(tika_test 통합) · `__tests__/services/`(DB 없는 단위).

## 현재 상태 (착수 전)

기존 구현·테스트(`__tests__/api/tickets.test.ts` 6개)는 TC 001-1, 2, 3, 6, 8, 9를 다루며 통과 중이다.
기존 테스트는 수정·삭제하지 않고 추가만 한다.

---

## Phase 1: Setup (명세 선행 수정)

**Purpose**: constitution 원칙 II·III — 새 메시지와 규칙을 코드보다 먼저 명세 문서에 반영 (spec.md Clarifications 2026-09-30)

- [X] T001 [P] docs/REQUIREMENTS.md FR-001 갱신: 입력 필드 표의 dueDate 제약을 "내일 이후 날짜 (오늘 불가, Asia/Seoul)"로 명시, 검증 에러 메시지 표에 `본문 해석 불가·자료형 불일치·날짜 형식 오류 | "요청 형식이 올바르지 않습니다"` 행 추가 (position 규칙 "칼럼에 티켓이 없을 경우 position = 0"은 유지)
- [X] T002 [P] docs/API_SPEC.md 갱신: §1 Request Body 표 dueDate 제약을 "YYYY-MM-DD, 내일 이후(Asia/Seoul)"로 수정, §1 에러 응답 표에 `400 | VALIDATION_ERROR | 형식 오류(본문 해석 불가·자료형 불일치·날짜 형식) | "요청 형식이 올바르지 않습니다"` 추가, 공통 규칙 에러 코드 표에 INTERNAL_ERROR 메시지 "서버 내부 오류가 발생했습니다" 명시
- [X] T003 docs/TEXT_CASES.md TC-API-001에 시나리오 추가 (T001, T002 이후): 001-12 오늘 종료예정일 → 400 "종료예정일은 오늘 이후 날짜를 선택해주세요", 001-13 내일 종료예정일 → 201, 001-14 JSON이 아닌 본문 → 400 "요청 형식이 올바르지 않습니다", 001-15 숫자 제목 → 400 "요청 형식이 올바르지 않습니다", 001-16 YYYY-MM-DD가 아닌 날짜(`2026/10/01`, `2026-02-30`) → 400 "요청 형식이 올바르지 않습니다", 001-17 제목 200자·설명 1000자 경계값 → 201, 001-18 status·position 등 알 수 없는 필드 → 무시되고 BACKLOG, 001-19 빈 Backlog의 첫 position = 0 (서비스 단위)

**Checkpoint**: 명세·계약(contracts/post-tickets.md)·테스트 케이스 문서가 일치

---

## Phase 2: Foundational (동작 변화 없는 기반 정리)

**Purpose**: 모든 시나리오가 쓰는 공유 타입·에러 응답 헬퍼. 동작을 바꾸지 않는 리팩터링이므로 기존 테스트 6개가 계속 통과해야 한다.

**⚠️ CRITICAL**: 이 단계가 끝나야 사용자 시나리오 작업을 시작한다

- [X] T004 [P] src/shared/types/index.ts 생성: DATA_MODEL.md §4의 `TICKET_STATUS`(BACKLOG, TODO, IN_PROGRESS, DONE), `TicketStatus`, `TICKET_PRIORITY`(LOW, MEDIUM, HIGH), `TicketPriority`, `Ticket`, `CreateTicketInput`을 const 객체 + `typeof` 패턴으로 정의 (enum 금지)
- [X] T005 [P] src/server/middleware/errorHandler.ts 생성: `errorResponse(code, message, status)` → `NextResponse.json({ error: { code, message } }, { status })`, `handleUnexpectedError()` → 500 `{ error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다' } }` (예외 원문 미노출)
- [X] T006 src/server/db/schema.ts의 `status`에 `.$type<TicketStatus>()`, `priority`에 `.$type<TicketPriority>()` 적용 (T004 이후, DB 변경·마이그레이션 없음)
- [X] T007 src/shared/validations/tickets.ts의 priority enum을 `TICKET_PRIORITY` 값에서 파생하고, `CreateTicketInput` 타입은 `@/shared/types`에서 import하도록 정리 (T004 이후)
- [X] T008 app/api/tickets/route.ts의 인라인 400 응답을 `errorResponse('VALIDATION_ERROR', message, 400)`로 교체 (T005 이후)
- [X] T009 기반 검증: `npx jest __tests__/api` 6개 통과 + `npx tsc --noEmit` 통과 확인

**Checkpoint**: 기반 준비 완료, 기존 동작 유지

---

## Phase 3: User Story 1 - 제목만으로 빠르게 할 일 등록 (Priority: P1) 🎯 MVP

**Goal**: 제목만으로 Backlog 맨 위에 티켓을 만들고, 빈·공백 제목과 200자 초과를 거부한다.

**Independent Test**: 제목만으로 두 번 생성 → 두 번째 position이 1024 작고 status BACKLOG·priority MEDIUM,
빈/공백 제목은 400 "제목을 입력해주세요". `getNextTopPosition(null) === 0`.

### Tests for User Story 1 (Red) ⚠️

- [X] T010 [P] [US1] __tests__/api/tickets.test.ts에 추가: 001-4 `{ title: "" }` → 400 "제목을 입력해주세요", 001-5 `{ title: "   " }` → 400 "제목을 입력해주세요", 001-10 연속 2개 생성 시 나중 티켓 position = 먼저 티켓 position − 1024, 001-11 startedAt·completedAt = null, 001-17(제목) `"a".repeat(200)` → 201, 앞뒤 공백 제목 `"  할일  "` → 201이고 title은 `"할일"`
- [X] T011 [P] [US1] __tests__/services/ticketService.test.ts 생성 (001-19): `getNextTopPosition(null)` → 0, `getNextTopPosition(0)` → −1024, `getNextTopPosition(-1024)` → −2048 (DB 불필요)
- [X] T012 [US1] `npx jest __tests__/api __tests__/services`로 T010·T011 신규 테스트 실패 확인 (Red), 기존 6개는 통과 유지

### Implementation for User Story 1 (Green)

- [X] T013 [US1] src/shared/validations/tickets.ts title 규칙: `required_error: '제목을 입력해주세요'`, `.trim()`, `.min(1, '제목을 입력해주세요')`, `.max(200, '제목은 200자 이내로 입력해주세요')` — 제약 "trim 후 1~200자"
- [X] T014 [US1] src/server/services/ticketService.ts: `getNextTopPosition(minPosition: number | null): number` export (null → 0, 그 외 minPosition − 1024), `create()`는 `min(position) where status = 'BACKLOG'` 조회 → `getNextTopPosition` → `status: TICKET_STATUS.BACKLOG`, `position` 명시해 insert, 반환 타입 `Promise<Ticket>`
- [X] T015 [US1] `npx jest __tests__/api __tests__/services` 전체 통과 확인 (Green)

**Checkpoint**: US1 단독으로 동작·검증 가능 (MVP)

---

## Phase 4: User Story 2 - 상세 정보를 포함해 등록 (Priority: P2)

**Goal**: 설명·우선순위·날짜를 함께 등록하고, 설명 1000자 초과와 오늘·과거 종료예정일을 거부한다.

**Independent Test**: 전체 필드 생성 시 모든 값 반영, 1001자 설명·오늘 종료예정일은 해당 메시지로 400, 내일 종료예정일은 201.

### Tests for User Story 2 (Red) ⚠️

- [X] T016 [US2] __tests__/api/tickets.test.ts에 추가 (T010과 같은 파일이라 순차): 001-7 `{ title: "ok", description: "a".repeat(1001) }` → 400 "설명은 1000자 이내로 입력해주세요", 001-17(설명) `"a".repeat(1000)` → 201, 001-12 dueDate = Asia/Seoul 오늘 → 400 "종료예정일은 오늘 이후 날짜를 선택해주세요", 001-13 dueDate = 내일 → 201. 날짜는 기존 `seoulDate(offset)` 헬퍼로 계산
- [X] T017 [US2] `npx jest __tests__/api` 신규 테스트 실패 확인 (Red)

### Implementation for User Story 2 (Green)

- [X] T018 [US2] src/shared/validations/tickets.ts: description `.max(1000, '설명은 1000자 이내로 입력해주세요')` — 제약 "최대 1000자, 미입력 시 null", dueDate refine을 `date > todayInSeoul()`로 변경 — 제약 "Asia/Seoul 기준 내일 이후"
- [X] T019 [US2] `npx jest __tests__/api` 전체 통과 확인 (Green)

**Checkpoint**: US1, US2 모두 독립적으로 동작

---

## Phase 5: User Story 3 - 형식이 잘못된 요청 처리 (Priority: P3)

**Goal**: 본문 해석 불가·자료형 불일치·날짜 형식 오류를 500이나 영어 메시지 없이 400 공통 메시지로 거부한다.

**Independent Test**: `not json` 본문, `{ title: 123 }`, `dueDate: "2026/10/01"` 모두 400 `{ error: { code: "VALIDATION_ERROR", message: "요청 형식이 올바르지 않습니다" } }`.

### Tests for User Story 3 (Red) ⚠️

- [X] T020 [US3] __tests__/api/tickets.test.ts에 추가: 001-14 본문 `'not json'`(JSON.stringify 없이 NextRequest body 문자열) → 400 공통 메시지, 본문 `[]` → 400 공통 메시지, 001-15 `{ title: 123 }` → 400 공통 메시지, 001-16 `dueDate: "2026/10/01"` · `plannedStartDate: "2026-02-30"` → 400 공통 메시지, 001-18 `{ title: "ok", status: "DONE", position: 999, startedAt: "2026-01-01T00:00:00Z" }` → 201이고 status BACKLOG·startedAt null·position ≠ 999
- [X] T021 [US3] `npx jest __tests__/api` 신규 테스트 실패 확인 (Red)

### Implementation for User Story 3 (Green)

- [X] T022 [US3] src/shared/validations/tickets.ts: 루트 객체와 모든 필드에 `invalid_type_error: '요청 형식이 올바르지 않습니다'` (title 누락은 `required_error` 유지), 날짜 필드는 `^\d{4}-\d{2}-\d{2}$` + 실제 달력 날짜 검사 실패 시 같은 메시지, priority는 타입과 무관하게 "우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요" 유지
- [X] T023 [P] [US3] src/server/middleware/validate.ts 생성: `validateBody(request, schema)` — `request.json()` 예외 시 `errorResponse('VALIDATION_ERROR', '요청 형식이 올바르지 않습니다', 400)`, Zod 실패 시 `issues[0].message`로 400, 성공 시 파싱된 데이터 반환
- [X] T024 [US3] app/api/tickets/route.ts: `validateBody` → `ticketService.create` → 201, 전체를 try/catch로 감싸 예외는 `handleUnexpectedError()` (T022, T023 이후)
- [X] T025 [US3] `npx jest` 전체 통과 확인 (Green)

**Checkpoint**: 모든 사용자 시나리오가 독립적으로 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refactor와 품질 게이트

- [X] T026 Refactor: src/shared/validations/tickets.ts의 에러 메시지를 상수 객체(`TICKET_ERROR_MESSAGES`)로 모아 중복 제거 (동작 변화 없음, 테스트 통과 유지)
- [X] T027 품질 게이트: `npx tsc --noEmit && npm run lint && npm run test && npm run build` 모두 통과 (constitution Quality Gates)
- [X] T028 specs/001-create-ticket-api/quickstart.md §3 수동 확인 (`npm run dev` + curl), 사전에 `npm run db:migrate`로 tika_dev 마이그레이션
- [X] T029 [P] CLAUDE.md "진행 현황"을 FR-001 완료로 갱신
- [X] T030 [P] docs/history/YYYY-MM-DD-create-ticket-implement.md 작업 기록 (변경 파일, 실행 명령어와 의미)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작. T003은 T001·T002 이후
- **Foundational (Phase 2)**: Setup 이후. 모든 사용자 시나리오를 막는다
- **US1 → US2 → US3**: 세 시나리오 모두 `__tests__/api/tickets.test.ts`와 `src/shared/validations/tickets.ts`를
  수정하므로 **우선순위 순서로 순차 진행**한다 (같은 파일 충돌 방지). 기능적으로는 서로 독립이다
- **Polish (Phase 6)**: 모든 시나리오 이후

### User Story Dependencies

- **US1 (P1)**: Foundational 이후, 다른 시나리오에 의존하지 않음
- **US2 (P2)**: Foundational 이후, 기능 의존 없음 (파일 공유로 US1 다음에 진행)
- **US3 (P3)**: Foundational 이후, T005 errorHandler에 의존 (파일 공유로 US2 다음에 진행)

### Within Each User Story

- 테스트 작성 → 실패 확인(Red) → 구현 → 통과 확인(Green)
- 스키마(shared) → 서비스/미들웨어(server) → Route Handler(app/api)
- 테스트 코드는 Green 단계에서 수정하지 않는다

### Parallel Opportunities

- T001 ∥ T002 (다른 명세 문서)
- T004 ∥ T005 (새 파일 2개)
- T010 ∥ T011 (API 테스트 파일 vs 서비스 테스트 파일)
- T023은 T022와 다른 파일이라 병렬 가능
- T029 ∥ T030

---

## Parallel Example: User Story 1

```bash
# Red 단계 테스트를 동시에 작성:
Task: "T010 __tests__/api/tickets.test.ts에 001-4, 5, 10, 11, 제목 경계값 추가"
Task: "T011 __tests__/services/ticketService.test.ts에 getNextTopPosition 단위 테스트 생성"
```

## Parallel Example: Foundational

```bash
Task: "T004 src/shared/types/index.ts 생성"
Task: "T005 src/server/middleware/errorHandler.ts 생성"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup (명세 수정) → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE**: 제목만으로 생성·position·제목 검증 확인
3. 이 시점에 공백 제목 거부와 Backlog 맨 위 배치(001-4, 5, 10, 19)가 완성된다

### Incremental Delivery

1. Setup + Foundational → 기존 6개 테스트 유지
2. US1 → 제목·position 완성 (MVP)
3. US2 → 설명·종료예정일 규칙 완성
4. US3 → constitution 원칙 III·IV 위반(500, 영어 메시지) 해소
5. Polish → 품질 게이트 통과

---

## Notes

- 테스트 DB(tika_test)는 비우지 않는다 (constitution Guardrails: TRUNCATE·조건 없는 DELETE 금지). 모든 API 테스트는 누적 데이터와 무관하게 통과하도록 상대 비교(001-10)나 생성된 티켓만 검사한다
- 빈 Backlog 규칙(001-19)은 DB 없는 서비스 단위 테스트로만 검증한다
- 500 경로(`handleUnexpectedError`)는 자동 테스트로 유발하기 어려워 코드 리뷰로 확인한다
- 작업 범위 밖(설정 파일, 의존성) 변경이 필요하면 먼저 사용자에게 확인한다
