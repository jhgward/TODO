# Changelog

`/changelog "요약"`으로 기록하는 변경 이력. 최신 항목이 위에 온다.

## [feat/ticket-api] - 2026-09-30 18:25

**Summary**: 티켓 API 7개 엔드포인트 구현(TDD), 명세 문서·Spec Kit 산출물 갱신, `/changelog` skill 추가

### Prompt
> "/init"

> "위 결과 내용 한국어로 번역해서 다시 알려줘"

> "모드로 변경
>
> 현재 정의한 스펙 문서들을 참고하되 코드는 생성하지 말고 다음의 사항으로 진행해줘.
>
> 요구사항:
> - TDD로 개발할 예정이야. 프로젝트 스캐폴딩만 해줘
> -
>
> 필요한 것:
> - 디렉터리 구조
> - package.json (의존성)
> - 설정 파일들 (tsconfig, jest, drizzle)
>
> 하지 말 것:
> - 컴포넌트, 서비스, API 등 구현 코드
> - 테스트 코드 (내가 직접 Red 단계부터 시작할 거야)"

> "처음 결정 사항 중 생성하지 않기로 결정했던 뼈대 파일을 생성해 줘"

> "FR-001(티켓 생성)을 구현하려고 해.
> API_SPEC.md에서 POST /post/tickets의 명세를 확인하고,
> TEST_CASES.md에서 TC-API-001의 테스트 시나리오를 읽어줘.
> 구현에 필요한 핵심 사항을 정리해줘"

> "TC-API-001의 테스트 시나리오를 기반으로
> __tests__/api/tickets.test.ts에 티켓 생성 API 테스트를 작성해줘
>
> 조건:
> - 아직 API가 구현되지 않았으므로 테스트는 전부 실패해야 함
> - 테스트 케이스 목록:
> 	1. 모든 필드를 포함한 정산 생성 -> 201
> 	2. 제목만으로 최소 생성 -> 201, priority가 MEDIUM
> 	3. 제목 누락 -> 400, "제목을 입력해주세요"
> 	4. 제목 200자 초과 -> 400
> 	5. 과거 마감일 -> 400
> 	6. 잘못된 우선순위 값 -> 400
> - API_SPEC.md의 요청/응답 형식을 정확히 따라줘.
> - 테스트 코드만 작성하고, 구현 코드는 건드리지 마.
> - 작업 범위: __tests__/api/ 디렉터리만"

> "방금 작성한 티켓 생성 API 테스트를 모두 통과하도록 구현해줘.
>
> 구현 위치:
> - Route Handler: app/api/tickets/route.ts의 POST 함수
> - 서비스: src/server/services/ticketService.ts의 create 함수
> - 검증: src/shared/validations/tickets.ts의 createTicketSchema (Zod)
> - DB 스키마: src/server/db/schema.ts의 tickets 테이블
>
> 조건:
> - 테스트가 통과하는 최소한의 코드만 작성해줘.
> - 에러 핸들링이나 로깅 같은 추가 기능은 넣지 마.
> - 테스트 코드는 수정하지 마.
> - 작업 범위: app/api/, src/server/, src/shared/ 디렉터리만"

> "티켓 생성 API의 구현 코드를 리뷰하고,
> 다음 관점에서 개선할 부분이 있으면 제안해줘:
>
> 1. 코드 중복이 있는가?
> 2. 네이밍이 명확한가?
> 3. 에러 메시지가 REQUIREMENTS.md의 명세와 일치하는가?
> 4. Typescript 타입이 올바르게 적용되어 있는가?
> 5. Route Handler가 얇은가? (비즈니스 로직이 서비스에 분리되어 있는가)
>
> 단, 테스트는 수정하지 마. 리팩터링 후에도 테스트가 통과해야 해."

> "TRD.md를 참조해서 Next.js 15 프로젝트를 생성해줘.
> - App Router 기반
> - Typescript stric 모드
> - Tailwind CSS 포함
> - src 디렉터리 사용
>
> 이미 생성된 코드들은 검토해서 필요하면 변경해"

> "Jest 테스트 환경을 구성해줘
> - Next.js 15 App Router와 호환되어야 해.
> - Typescript stric 모드 사용
> - @testing-library/react와 @testing-library/jest-dom 포함
> - 경로 별칭 @/는 src/를 가리켜야해"

> "DATA_MODEL.md 3. Drizzle 스키마 정의 섹션을 참고해서 src/server/db/schema.ts에 구현해줘.
> - 로컬 PostgreSQL 연결 (postgres 드라이버 사용)
> - 환경 변수는 DATABASE_URL 사용 (.env.local 참고)"

> "CLAUDE.md 파일을 SDD 스펙에 맞게 업데이트 해줘.
> - 프로젝트 개요와 구조
> - 기술 스택
> - 명세 문서 경로
> - 코딩 컨벤션
> - SDD 워크플로 규칙"

> "/speckit.constitution 다음 원칙으로 constitution을 생성해줘:
> - Typescript stric 모드 필수
> - API 응답은 API_SPEC.md의 형식을 정확히 따를 것
> - 에러 응답은 { error: { code, message } } 형식
> - Zod로 모든 요청 검증
> - 비즈니스 로직은 src/server/services에 분리"

> "/speckit.specify API_SPEC.md의 POST /api/tickets 명세를 확인하고 구현에 필요한 요구사항을 정리해줘"

> "/speckit.plan POST /api/tickets를 구현할 계획을 세워줘.
> Zod 검증, Route Handler, Service 레이어 분리를 고려해."

> "/speckit.tasks"

> "# 개별 실행
> /speckit.implement Phase 1부터 순서대로 구현해줘.
> 각 Phase 완료 후 다음으로 넘어가.
>
> # 병렬 실행
> /speckit.implement Phase 1의 T001-T005를 병렬로 먼저 확인해줘.
> 5개 확인 작업을 동시에 수행해:
>
> - 프로젝트 구조
> - DB 연결
> - 공유 타입
> - Zod 스키마
> - DB 스키마
>
> 모두 독립적인 동작이 가능한 작업이니깐 parallel 실행해줘."

> "Phase 4-6 계속 진행
> Phase 4-6를 자동으로 진행해줘.
> User Story 2, 3까지 완료하고 전체 검증 수행"

> "Phase 4-6를 자동으로 진행해줘.
> User Story 2, 3까지 완료하고 전체 검증 수행"

> "TEST_CAES.md의 TC-API-001 (티켓 생성)을 Jest 테스트로 변환해줘"

> "API_SPEC.md에 정의된 7개 API 엔드포인트가 코드에 구현되어 있는지 검토하고 미구현 되어 있으면 추가로 구현해줘.
>
> 확인할 API 목록:
> | # | 메서드 | 경로 | 설명 | 관련 FR |
> |---|--------|------|------|---------|
> | 1 | POST | /api/tickets | 티켓 생성 | FR-001 |
> | 2 | GET | /api/tickets | 전체 보드 조회 | FR-002, FR-008 |
> | 3 | GET | /api/tickets/:id | 티켓 상세 조회 | FR-003 |
> | 4 | PATCH | /api/tickets/:id | 티켓 수정 | FR-004 |
> | 5 | PATCH | /api/tickets/:id/complete | 티켓 완료 | FR-005 |
> | 6 | DELETE | /api/tickets/:id | 티켓 삭제 | FR-006 |
> | 7 | PATCH | /api/tickets/reorder | 상태/순서 변경 (DnD) | FR-007 |"

(위 요청은 같은 내용으로 2회 입력됨)

> "이제 각 api 엔드 포인트들의 구현 여부를 체크하고, 테스트케이스로 검증한 뒤 각 사항을 표로 정리해서 api, 명세 내용, 구현 여부, 검증 여부를 보여줘"

(위 요청은 같은 내용으로 2회 입력됨)

> "API_SPEC.md의 에러 응답 형식:
> {"

> "{
>   "error": {
>     "code": "VALIDATION_ERROR | TICKET_NOT_FOUND | INTERNAL_ERROR",
>     "message": "사람이 읽을 수 있는 에러 메시지"
>   }
> }
>
> 모든 API 핸들러가 이 형식을 일관되게 사용하는지 검토하고, 일치하지 않는 부분을 수정해줘"

> "매번 프롬프트 입력 후 코드를 수정하고 git에 반영할 때,
> 다음 내용을 자동으로 기록하는 시스템을 만들어줘:
>
> 1. 내가 입력한 프롬프트 내용
> 2. 변경된 파일 목록과 라인 수
> 3. 작업 날짜/시간, 브랜치명
> 4. 테스트 결과 (있다면)
>
> 요구사항:
> - CHANGELOG.md에 상세 이력 기록
> …(이하 생략)"

(위 요청은 같은 내용으로 2회 입력됨)

### Changes
- **Added**: 보드 조회 `GET /api/tickets` — 4개 칼럼 그룹화, position 정렬, Done 24시간 필터, `isOverdue`, `total` (`app/api/tickets/route.ts`, `src/server/services/ticketRules.ts`)
- **Added**: 상세 조회·수정·삭제 `GET/PATCH/DELETE /api/tickets/:id` (`app/api/tickets/[id]/route.ts`)
- **Added**: 완료 처리 `PATCH /api/tickets/:id/complete` — DONE 전환, `completedAt`, Done 맨 위 배치, 재완료는 변경 없음 (`app/api/tickets/[id]/complete/route.ts`)
- **Added**: 상태·순서 변경 `PATCH /api/tickets/reorder` — 인덱스 기반 이동, position 계산·재정렬, 시작일·종료일 전이, 트랜잭션 (`app/api/tickets/reorder/route.ts`)
- **Added**: DB 없는 비즈니스 규칙 순수 함수 — 오버듀, Done 표시, 보드 구성, 삽입 position 계산, 타임스탬프 전이 (`src/server/services/ticketRules.ts`)
- **Added**: 요청 검증·에러 응답 공통 함수 — `validateBody`, `validateTicketId`, `errorResponse`, `notFoundResponse`, `withErrorHandler` (`src/server/middleware/validate.ts`, `src/server/middleware/errorHandler.ts`)
- **Added**: 공유 타입·상수(DATA_MODEL §4)와 응답 타입 `BoardResponse`, `ReorderResult` (`src/shared/types/index.ts`)
- **Added**: 공통 검증 — 형식 오류 메시지, 날짜 유효성, `ticketIdSchema`, `MAX_TICKET_ID` (`src/shared/validations/common.ts`)
- **Added**: API 통합 테스트 6개 파일, 서비스 단위 테스트 3개 파일, 테스트 fixture (`__tests__/api/ticketBoard.test.ts`, `ticketDetail.test.ts`, `ticketUpdate.test.ts`, `ticketComplete.test.ts`, `ticketDelete.test.ts`, `ticketReorder.test.ts`, `__tests__/services/ticketRules.test.ts`, `ticketReorderRules.test.ts`, `ticketService.test.ts`, `__tests__/helpers/ticketFixtures.ts`)
- **Added**: Spec Kit 산출물 — spec, plan, research, data-model, contracts, quickstart, tasks, checklist (`specs/001-create-ticket-api/`, `specs/002-ticket-management-api/`)
- **Added**: Spec Kit 설치 파일과 constitution (`.specify/`, `.claude/skills/speckit-*/`)
- **Added**: `/changelog` skill과 변경 수집 스크립트 (`.claude/skills/changelog/SKILL.md`, `.claude/skills/changelog/scripts/collect-changes.sh`)
- **Added**: 작업 기록 18건 (`docs/history/`)
- **Added**: 보드 페이지 그룹 레이아웃 (`app/(board)/layout.tsx`)
- **Added**: 시드 스크립트 — 사용자가 추가. 조건 없는 `db.delete(tickets)`와 `console.log` 포함 (`src/server/db/seed.ts`)
- **Modified**: 티켓 생성 `POST /api/tickets` — `validateBody`·`withErrorHandler` 사용, 같은 파일에 `GET` 추가 (`app/api/tickets/route.ts`)
- **Modified**: 서비스 — `create`에 position 규칙(빈 칼럼 0, 아니면 최솟값 − 1024)과 status 명시, `getBoard`, `getById`, `update`, `complete`, `reorder`, `remove` 추가 (`src/server/services/ticketService.ts`)
- **Modified**: Zod 스키마 — 제목 trim·공백 거부, 설명 1000자, 날짜 형식, 종료예정일 내일부터, 형식 오류 공통 메시지, 메시지 상수화, `updateTicketSchema`·`reorderTicketSchema` 추가 (`src/shared/validations/tickets.ts`)
- **Modified**: DB 연결을 `postgres` 드라이버 + `idle_timeout`으로, 스키마 status/priority에 도메인 타입 적용 (`src/server/db/index.ts`, `src/server/db/schema.ts`)
- **Modified**: 티켓 생성 테스트에 US1~US3 시나리오 16개 추가 (`__tests__/api/tickets.test.ts`)
- **Modified**: 명세 — 종료예정일 "내일 이후", 형식 오류 메시지, reorder 인덱스·재정렬·시작일 규칙, 재완료, id 형식 오류, 에러 형식 적용 범위, 테스트 시나리오 추가 (`docs/API_SPEC.md`, `docs/REQUIREMENTS.md`, `docs/DATA_MODEL.md`, `docs/TEXT_CASES.md`)
- **Modified**: 의존성 — `postgres` 추가, `@vercel/postgres` 제거, `lint`를 `eslint .`로, `test`에 `--runInBand` (`package.json`, `package-lock.json`)
- **Modified**: SDD 기준으로 재구성, 진행 현황·백엔드 구조·`/changelog` 안내·최근 변경사항 섹션 추가 (`CLAUDE.md`)
- **Deleted**: 파일이 생긴 폴더의 자리 표시 파일 (`__tests__/services/.gitkeep`, `app/api/tickets/[id]/complete/.gitkeep`, `app/api/tickets/reorder/.gitkeep`)

### Files Modified
- `.claude/skills/changelog/SKILL.md` (+136 lines, new)
- `.claude/skills/changelog/scripts/collect-changes.sh` (+76 lines, new)
- `.claude/skills/speckit-*/` (새 파일 10개, +2485 lines)
- `.specify/` (새 파일 20개, +2805 lines)
- `CLAUDE.md` (+135, -101 lines)
- `__tests__/api/ticketBoard.test.ts` (+99 lines, new)
- `__tests__/api/ticketComplete.test.ts` (+95 lines, new)
- `__tests__/api/ticketDelete.test.ts` (+57 lines, new)
- `__tests__/api/ticketDetail.test.ts` (+79 lines, new)
- `__tests__/api/ticketReorder.test.ts` (+212 lines, new)
- `__tests__/api/ticketUpdate.test.ts` (+175 lines, new)
- `__tests__/api/tickets.test.ts` (+150, -0 lines)
- `__tests__/helpers/ticketFixtures.ts` (+45 lines, new)
- `__tests__/services/.gitkeep` (-0 lines, deleted)
- `__tests__/services/ticketReorderRules.test.ts` (+136 lines, new)
- `__tests__/services/ticketRules.test.ts` (+140 lines, new)
- `__tests__/services/ticketService.test.ts` (+15 lines, new)
- `app/(board)/layout.tsx` (+9 lines, new)
- `app/api/tickets/[id]/complete/.gitkeep` (-0 lines, deleted)
- `app/api/tickets/[id]/complete/route.ts` (+14 lines, new)
- `app/api/tickets/[id]/route.ts` (+34 lines, new)
- `app/api/tickets/reorder/.gitkeep` (-0 lines, deleted)
- `app/api/tickets/reorder/route.ts` (+13 lines, new)
- `app/api/tickets/route.ts` (+11, -10 lines)
- `docs/API_SPEC.md` (+31, -17 lines)
- `docs/DATA_MODEL.md` (+7, -6 lines)
- `docs/REQUIREMENTS.md` (+23, -12 lines)
- `docs/TEXT_CASES.md` (+28, -1 lines)
- `docs/history/` (새 파일 18개, +574 lines)
- `package-lock.json` (+77, -9 lines)
- `package.json` (+4, -6 lines)
- `specs/001-create-ticket-api/checklists/requirements.md` (+36 lines, new)
- `specs/001-create-ticket-api/contracts/post-tickets.md` (+58 lines, new)
- `specs/001-create-ticket-api/data-model.md` (+50 lines, new)
- `specs/001-create-ticket-api/plan.md` (+110 lines, new)
- `specs/001-create-ticket-api/quickstart.md` (+59 lines, new)
- `specs/001-create-ticket-api/research.md` (+68 lines, new)
- `specs/001-create-ticket-api/spec.md` (+163 lines, new)
- `specs/001-create-ticket-api/tasks.md` (+212 lines, new)
- `specs/002-ticket-management-api/checklists/requirements.md` (+36 lines, new)
- `specs/002-ticket-management-api/contracts/ticket-management.md` (+73 lines, new)
- `specs/002-ticket-management-api/data-model.md` (+89 lines, new)
- `specs/002-ticket-management-api/plan.md` (+127 lines, new)
- `specs/002-ticket-management-api/quickstart.md` (+58 lines, new)
- `specs/002-ticket-management-api/research.md` (+96 lines, new)
- `specs/002-ticket-management-api/spec.md` (+262 lines, new)
- `specs/002-ticket-management-api/tasks.md` (+277 lines, new)
- `src/server/db/index.ts` (+5, -2 lines)
- `src/server/db/schema.ts` (+15, -2 lines)
- `src/server/db/seed.ts` (+22 lines, new)
- `src/server/middleware/errorHandler.ts` (+25 lines, new)
- `src/server/middleware/validate.ts` (+45 lines, new)
- `src/server/services/ticketRules.ts` (+87 lines, new)
- `src/server/services/ticketService.ts` (+123, -3 lines)
- `src/shared/types/index.ts` (+107 lines, new)
- `src/shared/validations/common.ts` (+22 lines, new)
- `src/shared/validations/tickets.ts` (+95, -16 lines)

### Tests
- `npx tsc --noEmit` — 통과
- `npm run lint` — 0 errors, 1 warning (`src/server/db/seed.ts` no-console)
- `npm run test` — 10 suites, 124 passed, 0 failed
- `npm run build` — 성공 (API 라우트 4개: `/api/tickets`, `/api/tickets/[id]`, `/api/tickets/[id]/complete`, `/api/tickets/reorder`)
