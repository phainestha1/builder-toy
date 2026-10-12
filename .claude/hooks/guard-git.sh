#!/bin/bash
# PreToolUse(Bash) hook: 위험한 git 명령을 막는다. 기본 브랜치(MAIN_BRANCH)에는 PR 머지로만 반영한다.
# - force push는 항상 차단
# - 기본 브랜치로 push 차단 (어느 브랜치에서든). --all·--mirror 도 기본 브랜치를 포함하므로 차단
# - 기본 브랜치에서 commit·merge 차단 (작업 브랜치를 만들어 PR로 반영)
# - worktree에서 기본 브랜치 checkout/switch 차단 (worktree가 기본 브랜치를 잡으면 원본 폴더와 충돌)
# 대상 저장소는 `git -C <dir>` → 선행 `cd <dir> &&` → 세션 cwd 순으로 판단한다.

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
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // ""')
CWD=${CWD:-$(pwd)}

# 판정용 명령: heredoc 본문과, 공백이 든 따옴표 문자열(메시지·본문)을 뺀다.
# 메시지 안의 "git merge" 같은 글자를 실제 명령으로 오인하지 않기 위해서다.
# 공백 없는 따옴표 토큰("main" 등)은 남겨서 우회를 막는다.
CLEAN=$(printf '%s\n' "$CMD" | awk '
  h != "" { if ($0 == h) h = ""; next }
  match($0, /<<-?[ ]*["'\'']?[A-Za-z_]+["'\'']?/) {
    t = substr($0, RSTART, RLENGTH); gsub(/<<-?[ ]*/, "", t); gsub(/["'\'']/, "", t); h = t
  }
  { print }' | awk -v sq="'" -v dq='"' '
  # 따옴표 짝을 왼쪽부터 차례로 맞춘다 (여러 줄에 걸친 메시지도 한 덩어리로 본다).
  # 큰따옴표 안의 \" 는 닫는 따옴표로 보지 않는다. 공백이 든 덩어리만 지운다.
  BEGIN { RS = "\001" }
  {
    s = $0; out = ""; n = length(s); i = 1
    while (i <= n) {
      c = substr(s, i, 1)
      if (c == sq || c == dq) {
        j = i + 1
        while (j <= n) {
          d = substr(s, j, 1)
          if (c == dq && d == "\\") { j += 2; continue }
          if (d == c) break
          j++
        }
        seg = substr(s, i, j - i + 1)
        if (seg !~ /[ \t\n]/) out = out seg
        i = j + 1
      } else { out = out c; i++ }
    }
    printf "%s", out
  }')

echo "$CLEAN" | grep -qE '(^|[^[:alnum:]_-])git([[:space:]]|$)' || exit 0

block() {
  echo "[hook] git 보호: $1" >&2
  echo "→ $MAIN_BRANCH 에는 PR 머지로만 반영합니다. 작업 브랜치(docs/*, chore/*, contract/*, feat/*)에서 커밋하고 PR을 올리세요." >&2
  exit 2
}

# 명령 단어 경계: 앞은 줄 시작이나 git 다음 공백, 뒤는 공백·줄 끝 (merge-base, commit-tree 같은 다른 명령과 구분).
GIT_PREFIX='(^|[^[:alnum:]_-])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+'

if echo "$CLEAN" | grep -qE "${GIT_PREFIX}push([[:space:]].*)?[[:space:]](--force|--force-with-lease|-f)([[:space:]=]|$)"; then
  block "force push 금지"
fi

# --all·--mirror 는 기본 브랜치까지 push 한다. (--tags 단독은 허용)
if echo "$CLEAN" | grep -qE "${GIT_PREFIX}push([[:space:]].*)?[[:space:]](--all|--mirror|--branches)([[:space:]=]|$)"; then
  block "push --all/--mirror 는 $MAIN_BRANCH 도 포함"
fi

DIR=$(echo "$CMD" | sed -nE 's/.*git[[:space:]]+-C[[:space:]]+([^[:space:]]+).*/\1/p' | head -1)
[ -z "$DIR" ] && DIR=$(echo "$CMD" | sed -nE 's/^[[:space:]]*cd[[:space:]]+([^[:space:];&]+).*/\1/p' | head -1)
DIR=${DIR:-$CWD}
DIR=${DIR/#\~/$HOME}
case "$DIR" in /*) ;; *) DIR="$CWD/$DIR" ;; esac

BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)

# git push: 대상 ref에 기본 브랜치가 있으면 차단. refspec이 없거나 HEAD면 현재 브랜치가 대상이다.
# macOS sed는 \b를 지원하지 않으므로 공백으로 경계를 잡는다.
if echo "$CLEAN" | grep -qE "${GIT_PREFIX}push([[:space:]]|$)"; then
  PUSH_ARGS=$(echo "$CLEAN" | sed -nE 's/.*git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push([^;&|]*).*/\2/p' | head -1)
  POS=()
  set -f
  for a in $PUSH_ARGS; do
    case "$a" in -*) ;; *) POS+=("$a") ;; esac
  done
  set +f
  REFS=()
  [ ${#POS[@]} -gt 1 ] && REFS=("${POS[@]:1}")
  [ ${#REFS[@]} -eq 0 ] && REFS=("$BRANCH")
  for r in "${REFS[@]}"; do
    DST=${r##*:}
    DST=${DST//[\"\']/}
    [ "$DST" = "HEAD" ] && DST=$BRANCH
    DST=${DST#refs/heads/}
    DST=${DST#+}
    [ "$DST" = "$MAIN_BRANCH" ] && block "$MAIN_BRANCH 으로 push"
  done
fi

if [ "$BRANCH" = "$MAIN_BRANCH" ]; then
  if echo "$CLEAN" | grep -qE "${GIT_PREFIX}(commit|merge)([[:space:]]|$)"; then
    block "$MAIN_BRANCH 브랜치에서 commit/merge"
  fi
  exit 0
fi

# worktree(원본 폴더가 아닌 곳)에서만 기본 브랜치 checkout을 막는다.
GIT_DIR=$(cd "$DIR" 2>/dev/null && git rev-parse --absolute-git-dir 2>/dev/null)
COMMON_DIR=$(cd "$DIR" 2>/dev/null && cd "$(git rev-parse --git-common-dir 2>/dev/null)" 2>/dev/null && pwd -P)
if [ -n "$GIT_DIR" ] && [ "$(cd "$GIT_DIR" && pwd -P)" != "$COMMON_DIR" ]; then
  if echo "$CLEAN" | grep -qE "${GIT_PREFIX}(checkout|switch)[[:space:]]+${MAIN_BRANCH}([[:space:]]|$)"; then
    block "worktree에서 $MAIN_BRANCH checkout"
  fi
fi

exit 0
