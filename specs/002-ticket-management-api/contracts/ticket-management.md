# Contracts: Ticket Management API

기준 문서: [docs/API_SPEC.md](../../../docs/API_SPEC.md) §2 ~ §7. 아래는 API_SPEC에 spec.md Clarifications와 research
결정을 더한 것이며, 구현 전에 API_SPEC에 동일하게 반영한다. 응답 본문 예시는 API_SPEC을 참조한다.

공통 에러 형식: `{ "error": { "code": string, "message": string } }`

| Status | code | message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | 아래 각 표의 메시지 |
| 404 | TICKET_NOT_FOUND | 티켓을 찾을 수 없습니다 |
| 500 | INTERNAL_ERROR | 서버 내부 오류가 발생했습니다 |

## GET /api/tickets — 보드 조회

- Request: 없음
- **200**: `{ "board": { "BACKLOG": TicketWithMeta[], "TODO": [], "IN_PROGRESS": [], "DONE": [] }, "total": number }`
  - 네 키가 항상 존재, 칼럼 내 position 오름차순
  - `DONE`은 `completedAt`이 24시간 이내인 티켓만, `total`은 표시되는 티켓 수
  - `TicketWithMeta` = Ticket + `isOverdue: boolean`

## GET /api/tickets/:id — 상세 조회

- **200**: `TicketWithMeta`
- **400**: id가 양의 정수가 아님 → "요청 형식이 올바르지 않습니다" **(신규)**
- **404**

## PATCH /api/tickets/:id — 수정

- Request (모든 필드 선택): `{ title?, description?: string | null, priority?, plannedStartDate?: string | null, dueDate?: string | null }`
  - 그 외 필드(status, position, startedAt, completedAt 등)는 무시
  - 바꿀 필드가 없으면 변경 없이 현재 티켓 반환
- **200**: `TicketWithMeta` (수정 후)
- **400**:

| 조건 | message |
|------|---------|
| id 형식 오류, 본문 해석 불가, 자료형 불일치, 날짜 형식 오류 | 요청 형식이 올바르지 않습니다 |
| 제목 빈 값·공백만 | 제목을 입력해주세요 |
| 제목 200자 초과 | 제목은 200자 이내로 입력해주세요 |
| 설명 1000자 초과 | 설명은 1000자 이내로 입력해주세요 |
| 잘못된 우선순위 | 우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요 |
| 종료예정일이 오늘 또는 과거 | 종료예정일은 오늘 이후 날짜를 선택해주세요 |

- **404**

## PATCH /api/tickets/:id/complete — 완료

- Request: 본문 없음 (본문이 있어도 읽지 않음)
- **200**: `Ticket` (`isOverdue` 없음) — `status: "DONE"`, `completedAt`: 현재 시각, `position`: Done 맨 위
  - 이미 DONE이면 변경 없이 현재 티켓 **(신규)**
- **400**: id 형식 오류 / **404**

## DELETE /api/tickets/:id — 삭제

- **204**: 본문 없음
- **400**: id 형식 오류 / **404**

## PATCH /api/tickets/reorder — 상태·순서 변경

- Request: `{ "ticketId": number, "status": "BACKLOG" | "TODO" | "IN_PROGRESS", "position": number }`
  - `position` = 대상 칼럼에서 이동 티켓을 제외한 목록 기준 **인덱스**(0부터). 칼럼 길이 이상이면 맨 뒤 **(명확화)**
- **200**: `{ "ticket": Ticket, "affected": [{ "id": number, "position": number }] }`
  - `ticket.position`은 서버가 계산한 순서 값 (인덱스가 아님)
  - `affected`: 재정렬로 순서 값이 바뀐 다른 티켓. 재정렬이 없으면 `[]`
- **400**:

| 조건 | message |
|------|---------|
| status가 BACKLOG·TODO·IN_PROGRESS 아님 (DONE 포함), 누락 | 상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요 |
| 본문 해석 불가, ticketId·position이 누락되었거나 형식 오류(ticketId 양의 정수, position 0 이상 정수) | 요청 형식이 올바르지 않습니다 |

- **404**: ticketId에 해당하는 티켓 없음
