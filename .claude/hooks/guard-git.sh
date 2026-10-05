#!/bin/bash
# PreToolUse(Bash) hook: 위험한 git 명령을 막는다. main에는 PR 머지로만 반영한다.
# - force push는 항상 차단
# - main으로 push 차단 (어느 브랜치에서든)
# - main 브랜치에서 commit·merge 차단 (작업 브랜치를 만들어 PR로 반영)
# - worktree에서 main checkout/switch 차단 (worktree가 main을 잡으면 원본 폴더와 충돌)
# 대상 리포는 `git -C <dir>` → 선행 `cd <dir> &&` → 세션 cwd 순으로 판단한다.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')

# 판정용 명령: heredoc 본문과, 공백이 든 따옴표 문자열(메시지·본문)을 뺀다.
# 메시지 안의 "git merge" 같은 글자를 실제 명령으로 오인하지 않기 위해서다.
# 공백 없는 따옴표 토큰("main" 등)은 남겨서 우회를 막는다.
CLEAN=$(printf '%s\n' "$CMD" | awk '
  h != "" { if ($0 == h) h = ""; next }
  match($0, /<<-?[ ]*["'\'']?[A-Za-z_]+["'\'']?/) {
    t = substr($0, RSTART, RLENGTH); gsub(/<<-?[ ]*/, "", t); gsub(/["'\'']/, "", t); h = t
  }
  { print }' | sed -E "s/'[^']*[[:space:]][^']*'//g; s/\"[^\"]*[[:space:]][^\"]*\"//g")

echo "$CLEAN" | grep -qE '\bgit\b' || exit 0

block() {
  echo "[hook] git 보호: $1" >&2
  echo "→ main에는 PR 머지로만 반영합니다. 작업 브랜치(docs/*, chore/*, contract/*, feat/*)에서 커밋하고 PR을 올리세요." >&2
  exit 2
}

if echo "$CLEAN" | grep -qE '\bgit\b.*\bpush\b.*(--force|-f\b|--force-with-lease)'; then
  block "force push 금지"
fi

DIR=$(echo "$CMD" | sed -nE 's/.*git[[:space:]]+-C[[:space:]]+([^[:space:]]+).*/\1/p' | head -1)
[ -z "$DIR" ] && DIR=$(echo "$CMD" | sed -nE 's/^[[:space:]]*cd[[:space:]]+([^[:space:];&]+).*/\1/p' | head -1)
DIR=${DIR:-$CWD}
DIR=${DIR/#\~/$HOME}
case "$DIR" in /*) ;; *) DIR="$CWD/$DIR" ;; esac

BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)

# git push: 대상 ref에 main이 있으면 차단. refspec이 없거나 HEAD면 현재 브랜치가 대상이다.
# macOS sed는 \b를 지원하지 않으므로 공백으로 경계를 잡는다.
PUSH_ARGS=$(echo "$CLEAN" | sed -nE 's/.*git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push([^;&|]*).*/\2/p' | head -1)
if echo "$CLEAN" | grep -qE '\bgit\b([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push\b'; then
  POS=()
  for a in $PUSH_ARGS; do
    case "$a" in -*) ;; *) POS+=("$a") ;; esac
  done
  REFS=("${POS[@]:1}")
  [ ${#REFS[@]} -eq 0 ] && REFS=("$BRANCH")
  for r in "${REFS[@]}"; do
    DST=${r##*:}
    DST=${DST//[\"\']/}
    [ "$DST" = "HEAD" ] && DST=$BRANCH
    DST=${DST#refs/heads/}
    [ "$DST" = "main" ] && block "main으로 push"
  done
fi

if [ "$BRANCH" = "main" ]; then
  if echo "$CLEAN" | grep -qE '\bgit\b([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+(commit|merge)\b'; then
    block "main 브랜치에서 commit/merge"
  fi
  exit 0
fi

# worktree(원본 폴더가 아닌 곳)에서만 main checkout을 막는다.
GIT_DIR=$(cd "$DIR" 2>/dev/null && git rev-parse --absolute-git-dir 2>/dev/null)
COMMON_DIR=$(cd "$DIR" 2>/dev/null && cd "$(git rev-parse --git-common-dir 2>/dev/null)" 2>/dev/null && pwd -P)
if [ -n "$GIT_DIR" ] && [ "$(cd "$GIT_DIR" && pwd -P)" != "$COMMON_DIR" ]; then
  if echo "$CLEAN" | grep -qE '\bgit\b.*\b(checkout|switch)\b[[:space:]]+main(\s|$)'; then
    block "worktree에서 main checkout"
  fi
fi

exit 0
