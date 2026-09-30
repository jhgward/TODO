# Implementation Plan: 티켓 조회·수정·완료·삭제·이동 (Ticket Management API)

**Branch**: `002-ticket-management-api` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-ticket-management-api/spec.md`

## Summary

API_SPEC.md의 7개 엔드포인트 중 미구현 6개(보드 조회, 상세 조회, 수정, 완료, 삭제, 순서 변경)를 구현한다.
001에서 만든 구조(Zod 스키마 → `validateBody` → 서비스 → `errorResponse`)를 그대로 확장한다.
비즈니스 규칙(오버듀, Done 24시간 필터, 시작일·종료일 전이, 순서 값 계산·재정렬)은 서비스 계층의 **순수 함수**로
분리해 DB 없이 단위 테스트하고, DB를 다루는 서비스 함수와 Route Handler는 tika_test 통합 테스트로 검증한다.
상세 결정은 [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node.js ≥ 20

**Primary Dependencies**: Next.js 15.5 (App Router Route Handlers, 동적 세그먼트 `params`는 Promise), Zod 3.25,
Drizzle ORM 0.38 (`postgres` 드라이버, `db.transaction`)

**Storage**: PostgreSQL `tickets` 테이블 — 스키마 변경·마이그레이션 없음

**Testing**: Jest 29 (`next/jest`) server 프로젝트 — `__tests__/services`(순수 함수 단위), `__tests__/api`(tika_test 통합)

**Target Platform**: Vercel Serverless (로컬: Node + 로컬 PostgreSQL)

**Project Type**: web-service (Next.js 풀스택 중 백엔드 계층)

**Performance Goals**: API 응답 p95 < 300ms (NFR-001). 보드 조회 쿼리 1회, 이동은 트랜잭션 1회(조회 1 + 갱신 1~N)

**Constraints**: 단일 사용자, "오늘" = Asia/Seoul, position은 INTEGER, 테스트 DB에 TRUNCATE·조건 없는 DELETE 금지

**Scale/Scope**: 엔드포인트 6개(Route 파일 3개 신규 + 1개 수정), 서비스 함수 6개 + 순수 함수 5개, 테스트 시나리오 47개(+ 엣지 케이스)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 게이트 | 사전 | 설계 후 |
|------|--------|------|---------|
| I. Strict Mode | `any`·`@ts-ignore` 없음, 타입은 `src/shared/types` | PASS | PASS — 응답 타입(`BoardResponse`, `ReorderResult`)을 shared types에 추가 |
| II. API Spec Fidelity | 응답 형식이 API_SPEC §2~7과 일치 | **조건부** — Clarifications 3건과 식별자 형식 오류 메시지가 명세 문서에 없음 | PASS — Phase 1에서 명세 문서 선행 수정 |
| III. Uniform Error | 400/404/500 모두 `{ error: { code, message } }` | PASS | PASS — `notFoundResponse()` 추가, 모든 Route가 try/catch → `handleUnexpectedError` |
| IV. Zod Validation | 본문과 경로 파라미터 모두 서비스 호출 전 검증 | PASS | PASS — `ticketIdSchema`, `updateTicketSchema`, `reorderTicketSchema`를 shared에 정의 |
| V. Services | 전이·순서·오버듀·24시간 필터가 서비스에만 존재 | PASS | PASS — Route는 검증 → 호출 → 응답만 |
| Guardrails | TRUNCATE·조건 없는 DELETE·raw SQL 없음 | PASS | PASS — 삭제는 `WHERE id = ?` 한 건, 테스트는 DB를 비우지 않음 |
| 설정 변경 승인 | 의존성·설정 변경은 사용자 확인 | **확인 필요** | `package.json` test 스크립트에 `--runInBand` 추가 (research R8) — 이 계획 승인으로 갈음 |
| Quality Gates | tsc · test · build · 명세 일치 | — | quickstart.md에 포함 |

정당화가 필요한 위반은 없다.

## Project Structure

### Documentation (this feature)

```text
specs/002-ticket-management-api/
├── plan.md              # 이 문서
├── research.md          # Phase 0: 설계 결정
├── data-model.md        # Phase 1: 전이 규칙·순서 값 계산·파생 필드
├── quickstart.md        # Phase 1: 검증 시나리오·명령어
├── contracts/
│   └── ticket-management.md   # Phase 1: 6개 엔드포인트 요청·응답·에러 계약
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
docs/
├── API_SPEC.md            # [수정] reorder position=인덱스·재정렬 조건·startedAt 규칙, 재완료, id 형식 오류, PATCH dueDate
├── REQUIREMENTS.md        # [수정] FR-004·005·007 동일 내용
├── DATA_MODEL.md          # [수정] §5.1 Backlog 이동 시 startedAt, §5.5 빈 칼럼 0·중간값 내림
└── TEXT_CASES.md          # [수정] 엣지 케이스 시나리오 추가 (재완료, id 형식, 빈 수정, 인덱스 경계 등)

src/shared/
├── types/index.ts                    # [수정] BoardResponse, ReorderResult, AffectedTicket 추가
└── validations/
    ├── common.ts                     # [수정] ticketIdSchema (양의 정수 문자열 → number)
    └── tickets.ts                    # [수정] updateTicketSchema, reorderTicketSchema, 상태 메시지 상수

src/server/
├── middleware/
│   ├── errorHandler.ts               # [수정] notFoundResponse()
│   └── validate.ts                   # [수정] validateTicketId(params)
└── services/
    ├── ticketRules.ts                # [신규] 순수 함수: isOverdue, isDoneVisible, groupBoard,
    │                                 #        getTimestampChanges, calculateInsertPosition
    └── ticketService.ts              # [수정] getBoard, getById, update, complete, remove, reorder

app/api/tickets/
├── route.ts                          # [수정] GET 추가
├── [id]/route.ts                     # [신규] GET, PATCH, DELETE
├── [id]/complete/route.ts            # [신규] PATCH
└── reorder/route.ts                  # [신규] PATCH

__tests__/
├── helpers/ticketFixtures.ts         # [신규] 테스트용 티켓 직접 insert (과거 dueDate·과거 completedAt 등 API로 못 만드는 상태)
├── services/ticketRules.test.ts      # [신규] 순수 함수 단위 (002-1, 002-5·6, 008-1~7, 007-3~8)
├── api/tickets.test.ts               # [추가] GET 보드 (002-2~4, 7, 8)
├── api/ticketDetail.test.ts          # [신규] 003, 004, 006
├── api/ticketComplete.test.ts        # [신규] 005
└── api/ticketReorder.test.ts         # [신규] 007

package.json                          # [수정] "test": "jest --runInBand" (research R8)
```

**Structure Decision**: TRD §3 구조 그대로. 서비스가 커지므로 DB 없는 규칙을 `ticketRules.ts`로 분리한다(같은
`src/server/services/` 안 — constitution V의 "비즈니스 로직은 services에만"을 유지). 기존
`getNextTopPosition`은 `ticketService.ts`에 그대로 둔다(기존 테스트가 그 경로에서 import).

## Implementation Order (SDD / TDD)

1. **Spec** — 명세 문서 4개 선행 수정
2. **Foundational** — shared types·스키마·미들웨어 헬퍼·테스트 fixture·`--runInBand` (기존 25개 테스트 유지)
3. **US1 보드 조회** (P1, MVP) → **US2 상세** → **US3 수정** → **US4 완료** → **US5 이동** → **US6 삭제**
   각 스토리: Red(테스트) → 실패 확인 → Green(규칙 함수 → 서비스 → Route) → 통과 확인
4. **Polish** — Refactor, 품질 게이트(`tsc` · lint · test · build), quickstart 수동 확인, 문서·기록

US2(상세 조회)는 US3·US4·US6 테스트가 결과 확인에 사용하므로 그보다 먼저 구현한다.

## Complexity Tracking

해당 없음.
