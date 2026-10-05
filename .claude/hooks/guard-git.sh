#!/bin/bash
# PreToolUse(Bash) hook: 위험한 git 명령을 막는다.
# - force push는 항상 차단
# - main이 아닌 브랜치(worktree)에서 main으로 push 차단
# - main이 아닌 브랜치에서 main을 checkout/switch 차단 (worktree가 main을 잡으면 원본과 충돌)
# 대상 리포는 `git -C <dir>` → 선행 `cd <dir> &&` → 세션 cwd 순으로 판단한다.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')

echo "$CMD" | grep -qE '\bgit\b' || exit 0

block() {
  echo "[hook] git 보호: $1" >&2
  echo "→ 머지와 main 반영은 Orchestrator가 /merge 로 합니다." >&2
  exit 2
}

if echo "$CMD" | grep -qE '\bgit\b.*\bpush\b.*(--force|-f\b|--force-with-lease)'; then
  block "force push 금지"
fi

DIR=$(echo "$CMD" | sed -nE 's/.*git[[:space:]]+-C[[:space:]]+([^[:space:]]+).*/\1/p' | head -1)
[ -z "$DIR" ] && DIR=$(echo "$CMD" | sed -nE 's/^[[:space:]]*cd[[:space:]]+([^[:space:];&]+).*/\1/p' | head -1)
DIR=${DIR:-$CWD}
DIR=${DIR/#\~/$HOME}
case "$DIR" in /*) ;; *) DIR="$CWD/$DIR" ;; esac

BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)
[ "$BRANCH" = "main" ] && exit 0

if echo "$CMD" | grep -qE '\bgit\b.*\bpush\b.*(\s|:)main(\s|$)'; then
  block "main이 아닌 브랜치(${BRANCH:-detached})에서 main으로 push"
fi
if echo "$CMD" | grep -qE '\bgit\b.*\b(checkout|switch)\b[[:space:]]+main(\s|$)'; then
  block "worktree에서 main checkout"
fi

exit 0
