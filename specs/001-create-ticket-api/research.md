# Research: 티켓 생성 (Create Ticket)

Phase 0 결과. spec.md의 NEEDS CLARIFICATION 3건은 2026-09-30 Clarifications 세션에서 해결되었고,
아래는 그 결정을 구현하기 위한 기술 선택이다.

## R1. 계층 책임 분리

- **Decision**: Zod 스키마(shared) = 입력 형식·제약·메시지 / Route Handler = 본문 파싱 → 검증 → 서비스 호출 →
  응답 변환 / Service = status·position 규칙 + DB 저장 / middleware = 파싱·검증·에러 응답 공통 함수.
- **Rationale**: constitution V("Route Handler는 파싱·검증·호출·응답만"), IV("스키마는 shared에서 프론트와
  공유"). 7개 엔드포인트가 같은 파싱·에러 처리를 쓰게 되므로 TRD §3에 이미 정의된 middleware에 둔다.
- **Alternatives**: 검증을 서비스 안에서 수행 → 서비스가 HTTP 에러 형식을 알게 되어 기각. 에러 헬퍼를 route
  안에 인라인 → 엔드포인트마다 중복되어 기각.

## R2. 형식 오류 처리 ("요청 형식이 올바르지 않습니다")

- **Decision**:
  - `request.json()` 실패 → middleware에서 잡아 400 `VALIDATION_ERROR` + 공통 메시지.
  - 본문이 객체가 아님(배열·문자열·null) → 루트 `invalid_type` → 공통 메시지.
  - 각 필드 `invalid_type_error`를 공통 메시지로 지정. 단 title **누락**(`undefined`)은 `required_error`
    "제목을 입력해주세요" (명세상 "제목 누락").
  - 날짜: `^\d{4}-\d{2}-\d{2}$` + 실제 달력 날짜 여부(예: 2026-02-30 거부) → 실패 시 공통 메시지.
  - priority의 잘못된 값은 기존 명세 메시지(`errorMap`)를 유지한다. 문자열이 아닌 priority도 "잘못된 우선순위
    값"으로 본다.
- **Rationale**: Clarification Q3(공통 메시지 하나). 영어 기본 메시지 노출 금지(constitution III).
- **Alternatives**: `z.setErrorMap` 전역 설정 → 프론트 폼 검증에도 전역 영향이 있어 기각.

## R3. 여러 오류가 동시에 있을 때

- **Decision**: `result.error.issues[0].message` — Zod는 스키마 키 순서(title → description → priority →
  plannedStartDate → dueDate)대로 이슈를 쌓으므로 첫 번째가 곧 입력 순서상 첫 오류.
- **Rationale**: 응답 형식이 메시지 1개(API_SPEC 공통 규칙). spec Edge Cases와 일치.

## R4. 종료예정일 "내일부터" 판정

- **Decision**: `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })`로 오늘을 `YYYY-MM-DD`로 구하고
  문자열 비교 `dueDate > today`. (현재 구현은 `>=` → 변경 필요)
- **Rationale**: Clarification Q2. `YYYY-MM-DD`는 사전순 = 날짜순이라 문자열 비교로 충분하고 서버 타임존(UTC)
  영향을 받지 않는다.
- **Alternatives**: `Date` 객체 비교 → 서버 로컬 타임존에 따라 자정 전후 오판 가능, 기각.
- **Note**: 기존 테스트 001-2는 오늘 + 7일을 쓰므로 영향 없음.

## R5. position 계산

- **Decision**: 서비스에 순수 함수 `getNextTopPosition(minPosition: number | null): number`
  (`null` → 0, 그 외 → `minPosition - 1024`). `create()`는 `min(position) where status = BACKLOG` 조회 후
  이 함수로 계산하고 `status: BACKLOG`와 함께 insert.
- **Rationale**: Clarification Q1(빈 칼럼 0). tika_test는 데이터가 누적되고 constitution Guardrails가
  TRUNCATE·조건 없는 DELETE를 금지하므로, "빈 칼럼" 경우는 DB 없이 순수 함수 단위 테스트로 검증한다.
  "연속 생성 시 더 작은 값"(001-10)은 API 통합 테스트로 검증한다.
- **Alternatives**: 트랜잭션 + `SELECT ... FOR UPDATE` → 단일 사용자 MVP라 경합이 없어 과함, 기각.
  테스트마다 BACKLOG 삭제 → Guardrails 위반 소지 + 사용자 승인 필요, 기각.

## R6. 예외 처리 (500)

- **Decision**: Route Handler를 `try/catch`로 감싸 예상 못 한 예외는 `errorHandler`가
  500 `{ error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다' } }`로 변환.
- **Rationale**: constitution III(처리되지 않은 예외도 규격 형식, 원문 노출 금지).
- **Open**: 500 메시지 문구는 API_SPEC에 코드만 있고 문구가 없다 → T001에서 문구를 명세에 추가한다.

## R7. 타입 단일 정의 위치

- **Decision**: `src/shared/types/index.ts`에 DATA_MODEL §4의 `TICKET_STATUS`, `TICKET_PRIORITY`, `Ticket`,
  `CreateTicketInput`을 정의. Zod enum은 `Object.values(TICKET_PRIORITY)`에서 파생, DB 스키마는
  `.$type<TicketStatus>()`로 좁혀 서비스 반환 타입을 `Ticket`으로 맞춘다.
- **Rationale**: constitution Architecture Constraints "타입: `src/shared/types/`" (Single Source of Truth),
  원칙 I(const 객체 패턴). 현재 `CreateTicketInput`은 `z.infer`로 validations에 있어 위치 위반.
- **Note**: README는 상수를 `src/shared/constants.ts`에 둔다고 하나 DATA_MODEL §4가 types에 정의하므로 types를 따른다.
