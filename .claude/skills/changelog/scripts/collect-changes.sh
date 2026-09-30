#!/usr/bin/env bash
# /changelog skill용 변경 내역 수집 스크립트 (읽기 전용 git 명령만 사용)
#
# 출력:
#   BRANCH=<브랜치명>
#   DATETIME=<YYYY-MM-DD HH:MM>
#   HEAD=<짧은 커밋 해시 | none>
#   SOURCE=working-tree | last-commit | none
#   FILES=<파일 수>
#   ---
#   <상태 A|M|D><TAB><추가 라인><TAB><삭제 라인><TAB><경로>   (바이너리는 라인 수가 -)
#
# 작업 트리에 미커밋 변경이 있으면 HEAD 대비 변경(새 파일 포함)을,
# 깨끗하면 마지막 커밋의 변경을 보여 준다. CHANGELOG.md 자신은 제외한다.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

EXCLUDE='CHANGELOG.md'

# symbolic-ref는 커밋이 없는 저장소에서도 브랜치명을 준다. detached HEAD면 짧은 해시를 쓴다
branch=$(git symbolic-ref --short -q HEAD || git rev-parse --short HEAD 2>/dev/null || echo "unknown")
if git rev-parse --verify --quiet HEAD >/dev/null; then
  head=$(git rev-parse --short HEAD)
else
  head="none"
fi

# numstat(추가·삭제 라인)과 name-status(상태)를 경로 기준으로 합친다
join_stats() {
  local status_file=$1 numstat_file=$2
  awk -F'\t' '
    NR == FNR { status[$2] = substr($1, 1, 1); next }
    { printf "%s\t%s\t%s\t%s\n", (($3 in status) ? status[$3] : "M"), $1, $2, $3 }
  ' "$status_file" "$numstat_file"
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
: >"$tmp/files"

if [ -n "$(git status --porcelain)" ]; then
  source_kind="working-tree"
  if [ "$head" != "none" ]; then
    git diff HEAD --no-renames --name-status >"$tmp/status"
    git diff HEAD --no-renames --numstat >"$tmp/numstat"
    join_stats "$tmp/status" "$tmp/numstat" >>"$tmp/files"
  fi
  # 아직 git이 추적하지 않는 새 파일 (.gitignore 대상 제외)
  git ls-files --others --exclude-standard | while IFS= read -r path; do
    if [ -f "$path" ] && grep -Iq . "$path" 2>/dev/null; then
      lines=$(wc -l <"$path" | tr -d ' ')
      printf 'A\t%s\t0\t%s\n' "$lines" "$path"
    else
      printf 'A\t-\t-\t%s\n' "$path"
    fi
  done >>"$tmp/files"
elif [ "$head" != "none" ]; then
  source_kind="last-commit"
  git show --no-renames --format= --name-status HEAD >"$tmp/status"
  git show --no-renames --format= --numstat HEAD >"$tmp/numstat"
  join_stats "$tmp/status" "$tmp/numstat" >>"$tmp/files"
else
  source_kind="none"
fi

awk -F'\t' -v exclude="$EXCLUDE" '$4 != exclude' "$tmp/files" | sort -t "$(printf '\t')" -k4 >"$tmp/filtered"

echo "BRANCH=$branch"
echo "DATETIME=$(date '+%Y-%m-%d %H:%M')"
echo "HEAD=$head"
echo "SOURCE=$source_kind"
echo "FILES=$(wc -l <"$tmp/filtered" | tr -d ' ')"
echo "---"
cat "$tmp/filtered"
