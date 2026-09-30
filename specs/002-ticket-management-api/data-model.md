# Data Model: 티켓 조회·수정·완료·삭제·이동

테이블 정의는 [docs/DATA_MODEL.md](../../docs/DATA_MODEL.md) §2~3 — 이 기능에서 DB 스키마 변경은 없다.
여기서는 기능별로 바뀌는 필드와 규칙만 정리한다.

## 기능별 변경 필드

| 기능 | 바뀌는 필드 | 바뀌지 않는 필드 |
|------|-------------|------------------|
| 수정 | title, description, priority, plannedStartDate, dueDate 중 전달된 것 + updatedAt | status, position, startedAt, completedAt (보내도 무시) |
| 완료 | status=DONE, completedAt=now, position=Done 맨 위, updatedAt | 그 외 전부. 이미 DONE이면 아무것도 바뀌지 않음 |
| 이동 | status, position, (규칙에 따라) startedAt·completedAt, updatedAt + 재정렬 시 같은 칼럼 다른 티켓의 position | 그 외 전부 |
| 삭제 | 행 제거 (하드 삭제) | — |
| 조회 | 없음 | — |

## 상태 전이와 타임스탬프 (이동·완료)

| from → to | 경로 | startedAt | completedAt |
|-----------|------|-----------|-------------|
| * → TODO (다른 칼럼에서) | reorder | now | DONE에서 오면 null, 아니면 유지 |
| * → BACKLOG (다른 칼럼에서) | reorder | null | DONE에서 오면 null, 아니면 유지 |
| * → IN_PROGRESS (다른 칼럼에서) | reorder | 유지 | DONE에서 오면 null, 아니면 유지 |
| 같은 칼럼 내 | reorder | 유지 | 유지 |
| 미완료 → DONE | complete | 유지 | now |
| DONE → DONE | complete | 유지 | 유지 (변경 없음) |
| * → DONE | reorder | 거부 (400) | — |

## 순서 값(position) 계산

`others` = 대상 칼럼에서 이동 티켓을 제외한 티켓들(position 오름차순), `index` = 요청한 자리(0부터).

| 경우 | 새 position | affected |
|------|-------------|----------|
| `others`가 비어 있음 | 0 | [] |
| `index <= 0` | `others[0].position - 1024` | [] |
| `index >= others.length` | `others[last].position + 1024` | [] |
| 사이, `next - prev >= 2` | `floor((prev + next) / 2)` | [] |
| 사이, `next - prev <= 1` | 재정렬: 이동 티켓을 index에 끼운 목록을 `i * 1024`로 다시 매김 → 이동 티켓은 `index * 1024` | 값이 바뀐 다른 티켓들의 `{ id, position }` |

완료 시: `Done 최솟값 - 1024`, Done이 비어 있으면 0 (`getNextTopPosition`, 숨겨진 Done 티켓 포함).

## 파생 값 (저장하지 않음)

| 값 | 규칙 | 포함되는 응답 |
|----|------|---------------|
| isOverdue | `dueDate !== null && status !== DONE && dueDate < 오늘(Asia/Seoul, YYYY-MM-DD)` | 보드 조회, 상세 조회, 수정 |
| Done 표시 여부 | `status === DONE && completedAt !== null && now - completedAt <= 24시간` | 보드 조회의 Done 칼럼·total |
| total | 보드에 표시되는 티켓 수 (숨겨진 Done 제외) | 보드 조회 |

## 검증 규칙과 메시지

### 경로 파라미터 `id` (상세·수정·완료·삭제)

| 조건 | 상태 | 메시지 |
|------|------|--------|
| 양의 정수 문자열이 아님 (`abc`, `0`, `-1`, `1.5`) | 400 VALIDATION_ERROR | 요청 형식이 올바르지 않습니다 |
| 해당 티켓 없음 | 404 TICKET_NOT_FOUND | 티켓을 찾을 수 없습니다 |

### 수정 본문 (모든 필드 선택, 적용 순서 = 표 순서, 첫 오류만 응답)

| 대상 | 조건 | 메시지 |
|------|------|--------|
| 본문 | JSON 해석 불가, 객체가 아님 | 요청 형식이 올바르지 않습니다 |
| title | 문자열 아님 (null 포함) | 요청 형식이 올바르지 않습니다 |
| title | trim 후 빈 문자열 | 제목을 입력해주세요 |
| title | trim 후 200자 초과 | 제목은 200자 이내로 입력해주세요 |
| description | 문자열·null 아님 | 요청 형식이 올바르지 않습니다 |
| description | 1000자 초과 | 설명은 1000자 이내로 입력해주세요 |
| priority | 허용 값 아님 | 우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요 |
| plannedStartDate / dueDate | 문자열·null 아님, 형식·달력 오류 | 요청 형식이 올바르지 않습니다 |
| dueDate | 오늘(Asia/Seoul) 또는 과거 | 종료예정일은 오늘 이후 날짜를 선택해주세요 |

### 이동 본문

| 대상 | 조건 | 메시지 |
|------|------|--------|
| 본문 | JSON 해석 불가, 객체가 아님 | 요청 형식이 올바르지 않습니다 |
| ticketId | 누락, 양의 정수 아님 | 요청 형식이 올바르지 않습니다 |
| status | 누락, BACKLOG·TODO·IN_PROGRESS 아님 (DONE 포함) | 상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요 |
| position | 누락, 0 이상의 정수 아님 | 요청 형식이 올바르지 않습니다 |
| ticketId | 해당 티켓 없음 | 404 티켓을 찾을 수 없습니다 |

## 공유 타입 추가 (src/shared/types)

- `AffectedTicket`: `{ id: number; position: number }`
- `ReorderResult`: `{ ticket: Ticket; affected: AffectedTicket[] }`
- `BoardResponse`: `{ board: BoardData; total: number }`

기존 `TicketWithMeta`, `UpdateTicketInput`, `ReorderTicketInput`, `ReorderableStatus`, `BoardData`는 001에서 이미 정의됨.
