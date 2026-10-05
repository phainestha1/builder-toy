#!/bin/bash
# SessionStart hook: 이 세션이 어디서 무엇을 하는지 알려 준다.
# 출력은 세션 컨텍스트에 추가된다.

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
BRANCH=$(git -C "$ROOT" branch --show-current 2>/dev/null)
CONTRACT=$(git -C "$ROOT" describe --tags --match 'contract-v*' --abbrev=0 2>/dev/null)
PANE="${HERDR_PANE_ID:-없음}"

case "$BRANCH" in
  main)   ROLE="Orchestrator 위치 (main). 계약 수정 가능." ;;
  feat/*) ROLE="Builder 위치 (worktree). 계약 파일 잠금 중." ;;
  "")     ROLE="detached HEAD — Checker 리뷰 위치로 보임. 코드 수정 금지." ;;
  *)      ROLE="알 수 없는 브랜치. 역할을 확인하세요." ;;
esac

echo "## 세션 컨텍스트 (builder-toy)"
echo "- 브랜치: ${BRANCH:-detached} · herdr pane: $PANE · 계약 버전: ${CONTRACT:-아직 없음}"
echo "- 추정 위치: $ROLE"
echo "- 역할이 배정되지 않았다면 사용자에게 묻거나 /role 로 불러오세요."
if [ -f "$ROOT/docs/board.md" ]; then
  echo "- 진행 중 작업 (docs/board.md):"
  grep -E '^\| T-' "$ROOT/docs/board.md" | grep -E '\| (doing|review|blocked) \|' | cut -d'|' -f2,4,5,6 | sed 's/^/  /' | head -10
fi
exit 0
