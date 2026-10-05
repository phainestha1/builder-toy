#!/bin/bash
# PreToolUse(Edit|Write|MultiEdit|NotebookEdit) hook: 계약 파일 잠금.
# 계약 파일은 Orchestrator의 contract/* 브랜치에서만 고칠 수 있고, PR로 main에 반영한다.
# main, worktree(feat/*), docs/*·chore/*, detached HEAD(Checker)에서 수정하려 하면 차단한다.

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

case "$BRANCH" in contract/*) exit 0 ;; esac

echo "[hook] 계약 잠금: $FILE 은(는) 계약 파일입니다 (현재 브랜치: ${BRANCH:-detached})." >&2
echo "→ Builder는 /contract-change 로 Orchestrator에게 요청하세요. Orchestrator는 main에서 contract/<작업ID> 브랜치를 만들어 고칩니다." >&2
exit 2
