# 2026-09-30 /speckit.plan — POST /api/tickets 구현 계획

## Clarifications 결정 (spec.md에 반영)
- Q1 빈 Backlog 첫 position = 0. API_SPEC 예시(-1024)는 이후 "최솟값 − 1024" 적용 사례 → 명세 수정 불필요
- Q2 종료예정일은 내일부터 허용 (오늘 거부) → 현재 구현(`>=`)은 변경 필요
- Q3 형식 오류는 공통 메시지 "요청 형식이 올바르지 않습니다"

## 생성한 산출물 (specs/001-create-ticket-api/)
- `plan.md`: Technical Context, Constitution Check(현재 코드의 III·V FAIL은 구현 대상), 파일별 변경 계획, SDD 순서
- `research.md`: R1 계층 분리, R2 형식 오류, R3 다중 오류, R4 내일부터 판정, R5 position 순수 함수, R6 500 처리, R7 타입 위치
- `data-model.md`: 생성 시 필드별 출처·초기값, 검증 규칙 적용 순서와 메시지
- `contracts/post-tickets.md`: 요청·201 응답·에러 표 (신규 메시지 2개 표시)
- `quickstart.md`: 사전 조건, 테스트·품질 게이트 명령, 수동 curl 확인

## 주요 설계 결정
- 빈 칼럼 position 규칙은 DB 없는 순수 함수 `getNextTopPosition` 단위 테스트로 검증 — tika_test는 데이터가 누적되고 constitution Guardrails가 TRUNCATE·조건 없는 DELETE를 금지하기 때문
- `src/server/middleware/{validate,errorHandler}.ts` 신설 (TRD §3에 정의된 위치)
- 타입은 `src/shared/types`로 이동 (constitution Single Source of Truth)

## 명세 문서 선행 수정 필요 (T001)
- REQUIREMENTS FR-001·API_SPEC §1: 공통 형식 오류 메시지, 종료예정일 "내일부터", 500 메시지 문구
- TEXT_CASES TC-API-001: 오늘 마감·형식 오류·경계값 시나리오 추가

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `cat .claude/skills/speckit-plan/SKILL.md` | plan 명령 실행 절차 확인 (미해결 clarification 시 ERROR 규칙 확인) |
| `grep -c "NEEDS CLARIFICATION" spec.md` | 답변 반영 후 남은 표시가 0개인지 확인 |
| `sed -i '' 's/.../.../' checklists/requirements.md` | 체크리스트의 미통과 항목을 해결됨으로 갱신 (macOS sed는 `-i ''` 필요) |
| `.specify/scripts/bash/setup-plan.sh --json` | plan 템플릿을 feature 디렉터리에 복사하고 경로(FEATURE_SPEC, IMPL_PLAN 등) 반환 |
