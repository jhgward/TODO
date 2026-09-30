# Research: 티켓 조회·수정·완료·삭제·이동

Phase 0 결과. spec.md Clarifications 3건을 구현하기 위한 기술 선택과, 명세에 없어 기본값으로 정한 사항.

## R1. 규칙은 순수 함수, DB는 서비스

- **Decision**: `src/server/services/ticketRules.ts`에 DB를 모르는 함수만 둔다 — `isOverdue(ticket, today)`,
  `isDoneVisible(ticket, now)`, `groupBoard(tickets, now)`, `getTimestampChanges(from, to, now)`,
  `calculateInsertPosition(columnPositions, index)`. `ticketService.ts`는 조회·트랜잭션·저장만 하고 규칙은 이 함수들을 호출한다.
- **Rationale**: tika_test는 데이터가 누적되고 비울 수 없어(Guardrails) "빈 보드", "24시간 경계", "간격 1 재정렬" 같은
  상태를 DB로 재현하기 어렵다. 현재 시각·오늘 날짜를 인자로 받으면 시간 의존 규칙도 결정적으로 테스트된다.
- **Alternatives**: 모든 규칙을 통합 테스트로만 검증 → 재현 불가능한 경우가 있어 기각. Jest fake timers → DB 드라이버
  타이머와 충돌 위험, 기각.

## R2. 순서 변경: 인덱스 → 순서 값 (Clarification Q1)

- **Decision**: `calculateInsertPosition(others: {id, position}[], index)` — `others`는 대상 칼럼에서 이동 티켓을
  뺀 오름차순 목록.
  - 빈 칼럼 → 0 / `index <= 0` → `others[0].position - 1024` / `index >= length` → `last.position + 1024`
  - 사이 → `Math.floor((prev + next) / 2)`. 단 `next - prev <= 1`이면 **재정렬**: 이동 티켓을 index에 끼운 전체
    목록을 `i * 1024`(0부터)로 다시 매기고, 값이 바뀐 다른 티켓을 `affected`로 반환.
  - 반환: `{ position, affected: {id, position}[] }` (재정렬 아니면 `affected: []`)
- **Rationale**: API_SPEC 처리 규칙(맨 앞 −1024, 맨 뒤 +1024, 중간값, 재정렬)과 응답의 `affected`를 모두 만족.
  position이 INTEGER라 중간값은 내림, 간격 1에는 사이 정수가 없으므로 DATA_MODEL의 "간격 1 이하"를 채택.
- **Alternatives**: position을 실수형으로 변경 → 스키마·마이그레이션 변경이 필요하고 명세(INTEGER) 위반, 기각.

## R3. 시작일·종료일 전이 (Clarification Q3)

- **Decision**: `getTimestampChanges(from, to, now)` → `{ startedAt?, completedAt? }` (키가 없으면 변경 없음)
  - `from !== to && to === TODO` → `startedAt: now`
  - `from !== to && to === BACKLOG` → `startedAt: null`
  - `from === DONE && to !== DONE` → `completedAt: null`
  - 같은 칼럼 내 이동 → 변경 없음
- **Rationale**: TC 007-3 ~ 007-7과 Clarification(Backlog 이동 시 항상 null) 일치.

## R4. 재완료 (Clarification Q2)와 완료 position

- **Decision**: `complete(id)` — 없으면 `null`, 이미 DONE이면 조회한 티켓 그대로 반환(갱신 없음), 아니면
  `status: DONE`, `completedAt: now`, `position: getNextTopPosition(min(DONE position))`.
- **Rationale**: 기존 `getNextTopPosition`(빈 칼럼 0, 아니면 min − 1024) 재사용. 최솟값은 24시간이 지나 숨겨진 Done
  티켓도 포함해 계산한다(숨김은 표시 규칙일 뿐 칼럼 소속은 유지).

## R5. 없는 티켓 처리

- **Decision**: 서비스 함수는 대상이 없으면 `null`(삭제는 `false`)을 반환하고, Route가 `notFoundResponse()`
  (404 `TICKET_NOT_FOUND` "티켓을 찾을 수 없습니다")로 변환한다.
- **Rationale**: 서비스가 HTTP를 모르게 유지. 예외 클래스를 도입할 만큼 오류 종류가 많지 않다.
- **Alternatives**: `TicketNotFoundError` throw → try/catch 분기가 Route마다 늘어 기각.

## R6. 경로 파라미터 검증

- **Decision**: `ticketIdSchema = z.string().regex(/^[1-9]\d*$/).transform(Number)` + 안전 정수 범위 확인, 실패 시
  "요청 형식이 올바르지 않습니다". `validateTicketId(params)`가 `{ success, id } | { success: false, response }` 반환.
  Next.js 15에서 `params`는 Promise이므로 Route에서 `await` 후 전달.
- **Rationale**: constitution IV(경로 파라미터도 Zod). 메시지는 001에서 정한 형식 오류 공통 메시지 재사용(TC 003-3은
  코드만 지정).

## R7. 수정(PATCH)

- **Decision**: `updateTicketSchema` — 생성 스키마의 필드 규칙을 재사용하되 모두 optional, `description`·
  `plannedStartDate`·`dueDate`는 nullable. 알 수 없는 키(status 등)는 Zod strip으로 제거(TC 004-9 "무시").
  서비스는 전달된 키만 `set`하고, 키가 하나도 없으면 갱신 없이 현재 티켓을 반환. `updatedAt`은 스키마의
  `$onUpdate`가 갱신.
- **Rationale**: 빈 `set`은 Drizzle에서 오류이고 의미상 변경도 없다. priority에는 기본값을 두지 않는다(생략 시 유지).
- **응답 형식**: 상세 조회와 같음 → `isOverdue` 포함.

## R8. 테스트 격리: `jest --runInBand`

- **Decision**: `package.json`의 `"test": "jest --runInBand"`, `"test:watch": "jest --watch --runInBand"`.
- **Rationale**: API 테스트 파일이 1개 → 4개로 늘면 Jest가 파일을 병렬 워커로 실행해 같은 tika_test를 동시에 쓴다.
  기존 001-10(연속 생성 시 position 차이 = 1024)과 이동 테스트는 그 사이에 다른 파일이 같은 칼럼을 바꾸면 깨진다.
  직렬 실행이 가장 단순하고, 테스트 수가 적어 시간 손실이 작다.
- **Alternatives**: 모든 API 테스트를 한 파일에 → 800줄 이상이 되어 기각. 파일별 스키마/DB 분리 → 설정 과함, 기각.
- **Note**: 설정 변경이므로 계획 승인 시 함께 승인받는다.

## R9. 테스트 데이터 준비

- **Decision**: `__tests__/helpers/ticketFixtures.ts`의 `insertTicket(overrides)`가 Drizzle로 tika_test에 직접
  insert한다(과거 `dueDate`, 25시간 전 `completedAt`, 특정 `status`처럼 API로 만들 수 없는 상태). 삭제·정리는 하지
  않는다. 보드 조회 테스트는 "내가 넣은 id가 어느 칼럼에 있는가/없는가"로 단언한다.
- **Rationale**: Guardrails(조건 없는 DELETE·TRUNCATE 금지, 삭제는 사용자 승인). 누적 데이터와 무관한 단언만 쓴다.
- **Note**: 삭제 기능(US6) 테스트는 자신이 만든 티켓 한 건을 DELETE API로 지운다 — 기능 자체의 검증이며
  `WHERE id = ?` 단건 삭제다.

## R10. 보드 조회

- **Decision**: `getBoard(now = new Date())` — `select * order by position` 1회 후 `groupBoard`가 칼럼별로 나누고,
  Done 24시간 필터·`isOverdue`·`total`을 계산. 응답 `{ board, total }`.
- **Rationale**: 단일 사용자 규모에서 쿼리 1회가 가장 단순하다. 필터·파생 값은 서비스 계층 계산(constitution V).
- **24시간 경계**: `now - completedAt <= 24h`이면 표시(DATA_MODEL §5.4 `diff <= 24h`).

## R11. 트랜잭션 (reorder)

- **Decision**: `db.transaction(async (tx) => …)` 안에서 대상 티켓 조회 → 대상 칼럼의 다른 티켓 조회 → 계산 →
  이동 티켓 update → 재정렬 대상 update(있을 때).
- **Rationale**: FR-022 원자성. postgres-js 드라이버는 Drizzle 트랜잭션을 지원한다.
