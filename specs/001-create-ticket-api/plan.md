# Implementation Plan: 티켓 생성 (Create Ticket)

**Branch**: `001-create-ticket-api` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-create-ticket-api/spec.md`

## Summary

`POST /api/tickets`로 새 티켓을 Backlog 맨 위에 생성한다. 이미 동작하는 최소 구현(TC 001-1, 2, 3, 6, 8, 9)을
명세 전체로 확장한다: 제목 trim·공백 거부, 설명 1000자, 날짜 형식, 종료예정일 "내일부터", 형식 오류 공통 메시지,
position 규칙(빈 칼럼 0, 이후 최솟값 − 1024), 처리되지 않은 예외의 500 변환.
세 계층으로 책임을 나눈다 — **Zod 스키마**(`src/shared/validations`)가 입력 규칙과 메시지를, **Route Handler**
(`app/api/tickets/route.ts`)가 본문 파싱·검증·응답 변환만을, **Service**(`src/server/services/ticketService.ts`)가
status·position 등 비즈니스 규칙과 DB 저장을 맡는다. 상세 결정은 [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node.js ≥ 20

**Primary Dependencies**: Next.js 15.5 (App Router Route Handlers), Zod 3.25, Drizzle ORM 0.38 (`postgres` 드라이버)

**Storage**: PostgreSQL — `tickets` 테이블 (DATA_MODEL.md §3, 스키마 변경 없음 · 마이그레이션 불필요)

**Testing**: Jest 29 (`next/jest`) — server 프로젝트(node): `__tests__/api`(tika_test DB 통합), `__tests__/services`(DB 없는 단위)

**Target Platform**: Vercel Serverless (로컬: Node + 로컬 PostgreSQL)

**Project Type**: web-service (Next.js 풀스택 중 백엔드 계층)

**Performance Goals**: API 응답 p95 < 300ms (TRD §10) — 쿼리 2회(최솟값 조회 + insert)로 충족

**Constraints**: 단일 사용자(동시 생성 경합 없음), "오늘" = Asia/Seoul, 테스트 DB에 TRUNCATE·조건 없는 DELETE 금지

**Scale/Scope**: 엔드포인트 1개, 신규·수정 소스 약 7개 파일, 테스트 케이스 약 15개 추가

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 게이트 | 사전 | 설계 후 |
|------|--------|------|---------|
| I. Strict Mode | `any`·`@ts-ignore` 없음, 도메인 타입은 `src/shared/types`에 정의 | PASS | PASS — `TicketStatus`/`TicketPriority` const 객체 + 스키마 `.$type<>()` |
| II. API Spec Fidelity | 응답 필드·상태 코드가 API_SPEC §1과 일치 | **조건부** — 새 메시지·dueDate 규칙이 명세 문서에 없음 | PASS — T001에서 명세 문서를 먼저 갱신 |
| III. Uniform Error | 모든 에러가 `{ error: { code, message } }`, 영어 기본 메시지·500 원문 노출 없음 | **FAIL(현재 코드)** — JSON 파싱 실패 시 500, 비문자열 제목에 Zod 영어 메시지 | PASS — 파싱 실패 400, `invalid_type_error` 한국어, 예외 → 500 `INTERNAL_ERROR` |
| IV. Zod Validation | 서비스 호출 전 모든 입력 검증, 스키마는 shared | PASS | PASS — 알 수 없는 필드는 Zod strip으로 제거(FR-013) |
| V. Services | status·position 규칙이 서비스에만 존재 | **FAIL(현재 코드)** — status를 DB 기본값에 의존, position 미구현 | PASS — 서비스에서 status 명시, position 순수 함수 |
| Guardrails | 테스트가 DB를 비우지 않음 | PASS | PASS — 빈 칼럼 규칙은 DB 없는 단위 테스트로 검증 |
| Quality Gates | tsc · test · build · 명세 일치 | — | quickstart.md에 포함 |

현재 코드의 FAIL 항목은 이 계획의 구현 대상이며, 정당화가 필요한 위반(Complexity Tracking)은 없다.

## Project Structure

### Documentation (this feature)

```text
specs/001-create-ticket-api/
├── plan.md              # 이 문서
├── research.md          # Phase 0: 설계 결정
├── data-model.md        # Phase 1: Ticket 엔티티·검증 규칙
├── quickstart.md        # Phase 1: 검증 시나리오·명령어
├── contracts/
│   └── post-tickets.md  # Phase 1: POST /api/tickets 요청·응답·에러 계약
├── checklists/
│   └── requirements.md  # /speckit-specify 품질 체크리스트
└── tasks.md             # Phase 2 (/speckit-tasks — 이 명령에서 생성하지 않음)
```

### Source Code (repository root)

```text
docs/
├── REQUIREMENTS.md                    # [수정] FR-001: 공통 형식 오류 메시지, 종료예정일 "내일부터" 명시
├── API_SPEC.md                        # [수정] §1 에러 표·dueDate 제약 동기화
└── TEXT_CASES.md                      # [수정] TC-API-001에 오늘 마감·형식 오류·경계값 시나리오 추가

src/shared/
├── types/index.ts                     # [신규] TICKET_STATUS, TICKET_PRIORITY, Ticket, CreateTicketInput (DATA_MODEL §4)
└── validations/tickets.ts             # [수정] createTicketSchema 전체 규칙 + 메시지 상수

src/server/
├── db/schema.ts                       # [수정] status/priority에 .$type<>() (DB 변경 없음)
├── middleware/
│   ├── validate.ts                    # [신규] 요청 본문 JSON 파싱 + Zod 검증 → 성공 데이터 | 에러 응답
│   └── errorHandler.ts                # [신규] errorResponse(code, message, status), 예외 → 500 INTERNAL_ERROR
└── services/ticketService.ts          # [수정] create(): status 명시, getNextTopPosition() 순수 함수

app/api/tickets/route.ts               # [수정] POST: validate → ticketService.create → 201, try/catch → errorHandler

__tests__/
├── api/tickets.test.ts                # [추가] 001-4, 5, 7, 10, 11 · 오늘 마감 · 형식 오류 · 경계값 (기존 6개 유지)
└── services/ticketService.test.ts     # [신규] position 계산 단위 테스트 (빈 칼럼 0, 최솟값 − 1024)
```

**Structure Decision**: TRD §3의 Next.js 단일 프로젝트 구조를 그대로 쓴다. Route Handler는 `app/api/`,
백엔드 로직은 `src/server/`, 공유 계약은 `src/shared/`. 새 디렉터리는 없고, TRD에 이미 정의된
`src/server/middleware/{validate,errorHandler}.ts`를 이번에 처음 채운다.

## Implementation Order (SDD / TDD)

1. **Spec** — T001: REQUIREMENTS·API_SPEC·TEXT_CASES 갱신 (Clarifications 3건 반영)
2. **Shared** — `src/shared/types` 정의 (동작 변화 없음, 기존 테스트 유지)
3. **Red** — API 테스트 추가 + 서비스 단위 테스트 신규 → 실패 확인
4. **Green** — validations → middleware → service → route 순으로 최소 구현
5. **Refactor** — 메시지 상수화, 스키마 `.$type<>()`, 타입 정리
6. **Gate** — `npx tsc --noEmit` · `npm run lint` · `npm run test` · `npm run build`

## Complexity Tracking

해당 없음 — Constitution Check에 정당화가 필요한 위반이 없다.
