# Data Model: 티켓 생성 (Create Ticket)

테이블 정의는 [docs/DATA_MODEL.md](../../docs/DATA_MODEL.md) §2~3을 따르며 이 기능에서 DB 스키마 변경은 없다.
여기서는 생성 시점의 입력 규칙과 초기값만 정리한다.

## Entity: Ticket

| 필드 | 생성 시 출처 | 생성 시 값 / 규칙 |
|------|-------------|-------------------|
| id | 시스템 | 자동 증가 |
| title | 입력(필수) | trim 후 1~200자 |
| description | 입력(선택) | 최대 1000자, 미입력 시 `null` |
| status | 시스템 | 항상 `BACKLOG` (입력 무시) |
| priority | 입력(선택) | `LOW` \| `MEDIUM` \| `HIGH`, 미입력 시 `MEDIUM` |
| position | 시스템 | BACKLOG 최솟값 − 1024, BACKLOG가 비어 있으면 `0` (입력 무시) |
| plannedStartDate | 입력(선택) | 유효한 `YYYY-MM-DD`, 미입력 시 `null`, 과거·종료예정일 이후여도 허용 |
| dueDate | 입력(선택) | 유효한 `YYYY-MM-DD`, Asia/Seoul 기준 **내일 이후**, 미입력 시 `null` |
| startedAt | 시스템 | `null` (입력 무시) |
| completedAt | 시스템 | `null` (입력 무시) |
| createdAt / updatedAt | 시스템 | 현재 시각 |

## 검증 규칙과 메시지 (적용 순서)

순서는 스키마 키 순서이며, 여러 오류 중 첫 번째만 응답한다.

| # | 대상 | 조건 | 메시지 |
|---|------|------|--------|
| 0 | 본문 | JSON 해석 불가, 객체가 아님 | 요청 형식이 올바르지 않습니다 |
| 1 | title | 누락(undefined) | 제목을 입력해주세요 |
| 2 | title | 문자열 아님 | 요청 형식이 올바르지 않습니다 |
| 3 | title | trim 후 빈 문자열 | 제목을 입력해주세요 |
| 4 | title | trim 후 200자 초과 | 제목은 200자 이내로 입력해주세요 |
| 5 | description | 문자열 아님 | 요청 형식이 올바르지 않습니다 |
| 6 | description | 1000자 초과 | 설명은 1000자 이내로 입력해주세요 |
| 7 | priority | 허용 값 아님(타입 무관) | 우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요 |
| 8 | plannedStartDate | 문자열 아님, 형식·달력 오류 | 요청 형식이 올바르지 않습니다 |
| 9 | dueDate | 문자열 아님, 형식·달력 오류 | 요청 형식이 올바르지 않습니다 |
| 10 | dueDate | 오늘(Asia/Seoul) 또는 과거 | 종료예정일은 오늘 이후 날짜를 선택해주세요 |

알 수 없는 필드(`status`, `position`, `startedAt`, `completedAt` 등)는 검증 단계에서 제거된다.

## State

생성은 상태 전이가 아니라 초기 상태 진입이다: (없음) → `BACKLOG`.
이후 전이는 DATA_MODEL.md §5.1~5.2 (reorder / complete) 범위이며 이 기능에 포함되지 않는다.

## 공유 타입 (src/shared/types)

DATA_MODEL.md §4 정의를 그대로 사용한다: `TICKET_STATUS`, `TicketStatus`, `TICKET_PRIORITY`, `TicketPriority`,
`Ticket`, `CreateTicketInput`.
