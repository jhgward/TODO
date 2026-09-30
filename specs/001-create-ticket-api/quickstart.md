# Quickstart: 티켓 생성 검증 가이드

구현이 명세를 만족하는지 확인하는 절차. 요청·응답 형식은 [contracts/post-tickets.md](./contracts/post-tickets.md),
검증 규칙은 [data-model.md](./data-model.md) 참조.

## 사전 조건

- 로컬 PostgreSQL 실행 중 (`nc -z localhost 5432`)
- `.env.local`(tika_dev), `.env.test`(tika_test)에 `DATABASE_URL`
- 두 DB 모두 마이그레이션 적용:
  ```bash
  npm run db:migrate                                          # tika_dev
  (set -a; . ./.env.test; set +a; npx drizzle-kit migrate)    # tika_test
  ```
- 테스트 DB 데이터는 지우지 않는다 (constitution Guardrails). 테스트는 누적 데이터에 영향받지 않도록 작성되어 있다.

## 1. 자동 테스트

```bash
npx jest __tests__/api/tickets.test.ts            # TC-API-001 통합 (tika_test)
npx jest __tests__/services/ticketService.test.ts # position 계산 단위 (DB 불필요)
npx jest -t "001-10"                              # 단일 시나리오
```

기대 결과: 전부 통과. 테스트 종료 후 약 10초 뒤 Jest 종료(`Jest did not exit` 경고는 DB 유휴 연결 때문으로 정상).

## 2. 품질 게이트 (constitution)

```bash
npx tsc --noEmit && npm run lint && npm run test && npm run build
```

## 3. 수동 확인 (개발 서버)

```bash
npm run dev
```

| 요청 본문 | 기대 |
|-----------|------|
| `{"title":"테스트 할일"}` | 201, `status` BACKLOG, `priority` MEDIUM |
| 같은 요청 한 번 더 | 201, `position`이 직전 응답보다 1024 작음 |
| `{"title":"   "}` | 400, 제목을 입력해주세요 |
| `{"title":"ok","dueDate":"<오늘>"}` | 400, 종료예정일은 오늘 이후 날짜를 선택해주세요 |
| `{"title":"ok","dueDate":"<내일>"}` | 201 |
| `{"title":123}` | 400, 요청 형식이 올바르지 않습니다 |
| 본문 `not json` | 400, 요청 형식이 올바르지 않습니다 |

예시:

```bash
curl -s -X POST localhost:3000/api/tickets -H 'Content-Type: application/json' -d '{"title":"테스트 할일"}'
curl -s -X POST localhost:3000/api/tickets -H 'Content-Type: application/json' -d 'not json'
```

## 4. 명세 일치 확인

- docs/REQUIREMENTS.md FR-001, docs/API_SPEC.md §1, docs/TEXT_CASES.md TC-API-001이 contracts/post-tickets.md와
  같은 메시지·규칙을 담고 있는지 확인한다.
