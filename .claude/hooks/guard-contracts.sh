#!/bin/bash
# PreToolUse(Edit|Write|MultiEdit|NotebookEdit) hook: 계약 파일 잠금.
# 계약 파일은 main 브랜치(Orchestrator)에서만 고칠 수 있다.
# worktree(feat/*)나 detached HEAD(Checker)에서 수정하려 하면 차단한다.

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // ""')
[ -z "$FILE" ] && exit 0

case "$FILE" in
  */docs/glossary.md|*/src/modules/shared/events/*|*/src/modules/*/ports/*) ;;
  *) exit 0 ;;
esac

# 아직 없는 파일이면 존재하는 상위 폴더에서 브랜치를 판단한다.
DIR=$(dirname "$FILE")
while [ ! -d "$DIR" ] && [ "$DIR" != "/" ]; do DIR=$(dirname "$DIR"); done
BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)

[ "$BRANCH" = "main" ] && exit 0

echo "[hook] 계약 잠금: $FILE 은(는) 계약 파일입니다 (현재 브랜치: ${BRANCH:-detached})." >&2
echo "→ 직접 고치지 말고 /contract-change 로 Orchestrator에게 변경을 요청하세요." >&2
exit 2
