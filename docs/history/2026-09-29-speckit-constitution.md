# 2026-09-29 Spec Kit constitution 제정 (v1.0.0)

## 변경 내용
`/speckit.constitution`으로 `.specify/memory/constitution.md`를 빈 템플릿에서 v1.0.0으로 작성했다.
- 핵심 원칙 5개: I. TypeScript Strict Mode, II. API Spec Fidelity, III. Uniform Error Response,
  IV. Zod Validation for Every Request, V. Business Logic in Services
- 추가 섹션: Technology & Architecture Constraints, Development Workflow(SDD/TDD, 품질 게이트), Governance
- 템플릿(`.specify/templates/`)은 수정하지 않음

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `ls -a .claude .specify` / `find ... -iname "*speckit*"` | `/speckit.constitution` 명령이 어디에 설치되어 있는지 확인 → `.claude/skills/speckit-constitution` |
| `cat .claude/skills/speckit-constitution/SKILL.md` | Spec Kit 명령의 실행 절차 확인 |
| `ls .specify/extensions.yml` | 실행 전후 hook 등록 여부 확인 (파일 없음 → hook 없음) |
| `.specify/scripts/bash/resolve-template.sh constitution-template --json` | 프리셋/확장 레이어를 반영한 constitution 템플릿 확정 (skill 필수 단계) |
| `grep -nE "\[[A-Z_0-9]+\]"` / `grep -nE " +$"` | 남은 placeholder·줄 끝 공백 검증 |

## 후속 과제
- POST /api/tickets가 JSON이 아닌 본문에 명세 밖 500 반환 → 원칙 III·IV 위반 여지
- Zod 기본 영어 메시지 노출 가능(title이 문자열이 아닐 때) → 원칙 III
- TRD·README의 DB 드라이버/환경 변수 표기 불일치
