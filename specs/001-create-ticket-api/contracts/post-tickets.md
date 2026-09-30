# Contract: POST /api/tickets

기준 문서: [docs/API_SPEC.md](../../../docs/API_SPEC.md) §1. 이 계약은 API_SPEC에 Clarifications(2026-09-30)를
더한 것이며, T001에서 API_SPEC에 동일하게 반영한다.

## Request

`Content-Type: application/json`

```json
{
  "title": "string (필수, trim 후 1~200자)",
  "description": "string (선택, ≤1000자)",
  "priority": "LOW | MEDIUM | HIGH (선택, 기본 MEDIUM)",
  "plannedStartDate": "YYYY-MM-DD (선택)",
  "dueDate": "YYYY-MM-DD (선택, Asia/Seoul 기준 내일 이후)"
}
```

그 외 필드는 무시한다.

## Response 201 Created

생성된 티켓 전체. `isOverdue`는 포함하지 않는다.

```json
{
  "id": 1,
  "title": "API 설계 문서 작성",
  "description": null,
  "status": "BACKLOG",
  "priority": "MEDIUM",
  "position": 0,
  "plannedStartDate": null,
  "dueDate": null,
  "startedAt": null,
  "completedAt": null,
  "createdAt": "2026-09-30T00:00:00.000Z",
  "updatedAt": "2026-09-30T00:00:00.000Z"
}
```

- `position`: BACKLOG가 비어 있으면 `0`, 아니면 BACKLOG 최솟값 − 1024.
- 날짜: `plannedStartDate`/`dueDate`는 `YYYY-MM-DD` 또는 `null`, 시스템 시각은 ISO 8601 UTC.

## Error Responses

형식: `{ "error": { "code": string, "message": string } }` — 메시지는 첫 번째 오류 하나.

| Status | code | 조건 | message |
|--------|------|------|---------|
| 400 | VALIDATION_ERROR | 제목 누락·빈 값·공백만 | 제목을 입력해주세요 |
| 400 | VALIDATION_ERROR | 제목 200자 초과 | 제목은 200자 이내로 입력해주세요 |
| 400 | VALIDATION_ERROR | 설명 1000자 초과 | 설명은 1000자 이내로 입력해주세요 |
| 400 | VALIDATION_ERROR | 잘못된 우선순위 값 | 우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요 |
| 400 | VALIDATION_ERROR | 종료예정일이 오늘 또는 과거 | 종료예정일은 오늘 이후 날짜를 선택해주세요 |
| 400 | VALIDATION_ERROR | 본문 해석 불가, 자료형 불일치, 날짜 형식 오류 | 요청 형식이 올바르지 않습니다 **(신규)** |
| 500 | INTERNAL_ERROR | 예상하지 못한 서버 오류 | 서버 내부 오류가 발생했습니다 **(신규 문구)** |
