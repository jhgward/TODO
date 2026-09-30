# Quickstart: Ticket Management API 검증 가이드

요청·응답 형식은 [contracts/ticket-management.md](./contracts/ticket-management.md), 규칙은 [data-model.md](./data-model.md) 참조.

## 사전 조건

- 로컬 PostgreSQL 실행 중, `.env.local`(tika_dev)·`.env.test`(tika_test)에 `DATABASE_URL`, 두 DB 모두 마이그레이션 적용됨
  (이 기능은 스키마 변경이 없어 새 마이그레이션이 없다)
- 테스트 DB 데이터는 지우지 않는다 (constitution Guardrails)

## 1. 자동 테스트

```bash
npm run test                                      # 전체 (--runInBand 직렬 실행)
npx jest __tests__/services/ticketRules.test.ts   # 규칙 순수 함수 (DB 불필요)
npx jest __tests__/api/ticketReorder.test.ts      # 이동 통합
npx jest -t "007-5"                               # 단일 시나리오
```

기대 결과: 전부 통과. 종료 후 약 10초 뒤 Jest 종료(DB 유휴 연결, 정상).

## 2. 품질 게이트 (constitution)

```bash
npx tsc --noEmit && npm run lint && npm run test && npm run build
```

build 출력에 다음 라우트가 모두 보여야 한다: `/api/tickets`, `/api/tickets/[id]`, `/api/tickets/[id]/complete`,
`/api/tickets/reorder`.

## 3. 수동 확인 (개발 서버, tika_dev)

```bash
npx next dev -p 3100
B=http://localhost:3100/api/tickets; H='Content-Type: application/json'
```

| 순서 | 요청 | 기대 |
|------|------|------|
| 1 | `curl -s $B` | 200, `board`에 네 칼럼, `total` |
| 2 | `curl -s -X POST $B -H "$H" -d '{"title":"흐름 확인"}'` | 201, id 확인 (이하 `$ID`) |
| 3 | `curl -s $B/$ID` | 200, `isOverdue: false` |
| 4 | `curl -s -X PATCH $B/$ID -H "$H" -d '{"priority":"HIGH","status":"DONE"}'` | 200, priority HIGH, status는 BACKLOG 그대로 |
| 5 | `curl -s -X PATCH $B/reorder -H "$H" -d "{\"ticketId\":$ID,\"status\":\"TODO\",\"position\":0}"` | 200, status TODO, startedAt 설정, affected [] |
| 6 | `curl -s -X PATCH $B/$ID/complete` | 200, status DONE, completedAt 설정 |
| 7 | 6을 한 번 더 | 200, completedAt·updatedAt 그대로 |
| 8 | `curl -s -X PATCH $B/reorder -H "$H" -d "{\"ticketId\":$ID,\"status\":\"BACKLOG\",\"position\":0}"` | 200, completedAt null, startedAt null |
| 9 | `curl -s -X PATCH $B/reorder -H "$H" -d "{\"ticketId\":$ID,\"status\":\"DONE\",\"position\":0}"` | 400, 상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요 |
| 10 | `curl -s -o /dev/null -w '%{http_code}' -X DELETE $B/$ID` | 204 |
| 11 | `curl -s $B/$ID` | 404, 티켓을 찾을 수 없습니다 |
| 12 | `curl -s $B/abc` | 400, 요청 형식이 올바르지 않습니다 |

수동 확인용 티켓은 10번에서 스스로 삭제되므로 tika_dev에 남지 않는다.

## 4. 명세 일치 확인

docs/API_SPEC.md §2~7, REQUIREMENTS.md FR-002~008, DATA_MODEL.md §5, TEXT_CASES.md TC-API-002~008이
contracts/ticket-management.md와 같은 규칙·메시지를 담고 있는지 확인한다.
