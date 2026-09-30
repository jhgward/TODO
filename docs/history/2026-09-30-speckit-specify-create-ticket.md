# 2026-09-30 /speckit.specify — 티켓 생성(POST /api/tickets) 명세

## 결과
- `specs/001-create-ticket-api/spec.md`: User Story 3개(P1 제목만 등록, P2 상세 정보, P3 형식 오류), FR 13개, SC 5개
- `specs/001-create-ticket-api/checklists/requirements.md`: 품질 체크리스트 (NEEDS CLARIFICATION 3개로 1개 항목 미통과)
- `.specify/feature.json`: 후속 명령(/speckit-plan 등)이 찾을 feature 디렉터리 기록
- 상태: 사용자 답변 대기 (Q1~Q3)

## 발견한 명세 충돌·공백
1. 빈 Backlog의 첫 position — REQUIREMENTS.md "0" vs API_SPEC.md 응답 예시 "-1024" (충돌)
2. 종료예정일 "오늘 이후"에 오늘 포함 여부 (모호)
3. 본문 해석 불가·자료형·날짜 형식 오류 시 메시지 (명세 없음)

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `cat .claude/skills/speckit-specify/SKILL.md` | Spec Kit specify 명령의 실행 절차 확인 |
| `ls .specify/extensions.yml` / `ls specs` / `cat .specify/init-options.json` | hook 유무, 기존 spec 번호, 번호 방식(sequential) 확인 → 001 |
| `.specify/scripts/bash/resolve-template.sh spec-template --json \| python3 -c ...` | 적용할 spec 템플릿 확정 후 JSON에서 본문만 출력 |
| `sed -n '1,25p' .specify/memory/constitution.md` | 수정된 constitution 반영 여부 확인 |
| `sed -n '10,45p;220,250p' docs/REQUIREMENTS.md` | FR-001, US-001/002 원문 확인 (position=0 규칙 발견) |
| `mkdir -p specs/001-create-ticket-api/checklists` + `printf ... > .specify/feature.json` | spec 디렉터리 생성, feature 경로 기록 |
