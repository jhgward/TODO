# 2026-09-30 `/changelog` skill 추가

## 목적
프롬프트 → 코드 수정 → git 반영 흐름에서, 사용자가 원할 때 `/changelog "요약"`으로 변경 이력을 남긴다 (Hook이 아닌 Skill).

## 만든 파일
- `.claude/skills/changelog/SKILL.md`: 실행 절차 (수집 → 프롬프트 인용 → 변경 분류 → 테스트 결과 → CHANGELOG.md 추가 → CLAUDE.md 요약 갱신 → 보고). `disable-model-invocation: true`로 사용자가 입력할 때만 실행
- `.claude/skills/changelog/scripts/collect-changes.sh`: 브랜치·시각·파일별 상태와 +/- 라인 수를 읽기 전용 git 명령으로 수집
- `CHANGELOG.md`: 머리말만 있는 빈 파일 (첫 항목은 사용자가 실행할 때 생김)

## 수정한 파일
- `CLAUDE.md`: "7. 작업 기록"에 `/changelog` 설명 한 줄, 끝에 `## 최근 변경사항` 섹션과 마커(`<!-- changelog:recent:start/end -->`) 추가

## 설계 결정
- 라인 수·브랜치·시각은 스크립트 출력만 사용 (추측 방지)
- 미커밋 변경이 있으면 HEAD 대비 작업 트리, 없으면 마지막 커밋 기준으로 기록
- 프롬프트는 이번 대화의 요청을 원문 그대로 인용. 새 세션이라 요청이 없으면 "기록 없음"으로 적고 지어내지 않음
- 테스트 결과는 그 대화에서 실제로 실행한 것만 기록, 기록을 위해 새로 돌리지 않음
- skill은 커밋하지 않음. CLAUDE.md는 마커 사이만 수정, 14일 지난 줄 삭제
- 요청 형식의 `### Chnages`는 오타로 보고 `### Changes`로 표기, `**Summary**`·`### Tests`·`Deleted` 분류를 추가

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `sed -n '1,12p' .claude/skills/speckit-tasks/SKILL.md` | 기존 프로젝트 skill의 frontmatter 형식 확인 |
| `git rev-parse --abbrev-ref HEAD` / `git log --oneline` / `git status --porcelain \| wc -l` | 브랜치·커밋·미커밋 변경 수 확인 |
| `chmod +x …/collect-changes.sh` | 스크립트 실행 권한 부여 |
| `bash …/collect-changes.sh` + `git diff HEAD --numstat -- <파일>` / `wc -l` | 스크립트가 낸 라인 수를 git·wc 결과와 대조 |
| scratchpad에 임시 저장소 `git init -b feature/x` → 커밋 → 수정·삭제·바이너리 추가 | 빈 저장소 / 미커밋 변경 / 깨끗한 작업 트리(마지막 커밋) 세 경우 검증 후 임시 저장소 삭제 |
| `bash -n …/collect-changes.sh` | 스크립트 문법 검사 |
| `npm run lint` / `npx prettier --check .` | 새 파일이 검사를 깨지 않는지 확인 |

## 검증 결과
- 현재 저장소: `BRANCH=main`, `SOURCE=working-tree`, 파일 100개, 라인 수가 `git diff`·`wc -l`과 일치
- 임시 저장소: 수정(+2/-1), 삭제, 바이너리(`-`), 공백이 든 파일명, CHANGELOG.md 제외, 마지막 커밋 분기 모두 정상
- 발견·수정: 커밋 없는 저장소에서 브랜치명이 두 줄로 출력 → `git symbolic-ref --short`로 변경

## 참고
- 새 skill은 세션 시작 시 읽히므로 `/changelog`는 다음 세션부터 인식될 수 있다
- `npx prettier --check .` 경고에 `src/server/db/seed.ts`가 새로 나타남 (사용자가 추가한 파일, 이번 작업과 무관)
