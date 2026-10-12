#!/bin/bash
# PreToolUse(Edit|Write|MultiEdit|NotebookEdit) hook: 계약 파일 잠금.
# 계약 파일(project.conf 의 CONTRACT_PATTERNS)은 contract/* 브랜치에서만 고칠 수 있고,
# (Orchestrator, 또는 계약 작업을 배정받은 Builder의 contract/* worktree)
# PR로 기본 브랜치에 반영한다. 그 밖의 브랜치(기본 브랜치, feat/*, docs/*, chore/*, detached HEAD)에서는 차단한다.

# 설정: 기본값을 정하고 .claude/project.conf 를 읽는다.
# 찾는 순서: $CLAUDE_PROJECT_DIR → git 최상위 → 현재 폴더. 없으면 기본값 그대로.
PROJECT_NAME="my-project"
MAIN_BRANCH="main"
CHECK_CMD="npm run check"
CONTRACT_PATTERNS="docs/glossary.md src/modules/shared/events/* src/modules/*/ports/*"
TASK_ID_PREFIX="T-"

CONF_ROOT=""
for _d in "${CLAUDE_PROJECT_DIR:-}" "$(git rev-parse --show-toplevel 2>/dev/null)" "$(pwd)"; do
  if [ -n "$_d" ] && [ -f "$_d/.claude/project.conf" ]; then
    CONF_ROOT="$_d"
    # shellcheck disable=SC1090
    . "$_d/.claude/project.conf"
    break
  fi
done
unset _d

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // ""')
[ -z "$FILE" ] && exit 0
case "$FILE" in /*) ;; *) FILE="$(pwd)/$FILE" ;; esac

# 아직 없는 파일이면 존재하는 상위 폴더에서 저장소와 브랜치를 판단한다.
DIR=$(dirname "$FILE")
while [ ! -d "$DIR" ] && [ "$DIR" != "/" ]; do DIR=$(dirname "$DIR"); done

# 저장소 루트 기준 상대경로를 만든다. 심볼릭 링크(/tmp → /private/tmp 등)를 풀어서 비교한다.
REAL_DIR=$(cd "$DIR" 2>/dev/null && pwd -P)
SUFFIX=${FILE#"$DIR"}
FULL="$REAL_DIR$SUFFIX"
TOP=$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null)
[ -n "$TOP" ] && TOP=$(cd "$TOP" 2>/dev/null && pwd -P)
if [ -z "$TOP" ] && [ -n "$CONF_ROOT" ]; then
  TOP=$(cd "$CONF_ROOT" 2>/dev/null && pwd -P)
fi
[ -z "$TOP" ] && exit 0
case "$FULL" in "$TOP"/*) ;; *) exit 0 ;; esac
REL=${FULL#"$TOP"/}

# 패턴의 *가 파일 이름으로 펼쳐지지 않도록 glob을 끈다.
set -f
MATCH=""
for PAT in $CONTRACT_PATTERNS; do
  # shellcheck disable=SC2254
  case "$REL" in $PAT) MATCH="$PAT"; break ;; esac
done
set +f
[ -z "$MATCH" ] && exit 0

BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)
case "$BRANCH" in contract/*) exit 0 ;; esac

echo "[hook] 계약 잠금: $REL 은(는) 계약 파일입니다 (패턴: $MATCH, 현재 브랜치: ${BRANCH:-detached})." >&2
echo "→ 계약은 contract/* 브랜치에서만 고칩니다. Orchestrator나 계약 작업을 배정받은 Builder가 $MAIN_BRANCH 에서 contract/<작업ID> 브랜치(worktree)를 만들어 고칩니다." >&2
echo "→ 배정받지 않은 Builder는 /contract-change 로 Orchestrator에게 요청하세요." >&2
exit 2
