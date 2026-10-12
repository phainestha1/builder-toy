#!/bin/bash
# SessionStart hook: 이 세션이 어디서 무엇을 하는지 알려 준다.
# 출력은 세션 컨텍스트에 추가된다.

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

ROOT="${CLAUDE_PROJECT_DIR:-}"
[ -z "$ROOT" ] && ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
ROOT=${ROOT:-$(pwd)}

# git 저장소가 아니면 브랜치가 빈 값이라 detached HEAD 와 구분해야 한다.
IN_GIT=""
git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 && IN_GIT=1
BRANCH=$(git -C "$ROOT" branch --show-current 2>/dev/null)
CONTRACT=$(git -C "$ROOT" describe --tags --match 'contract-v*' --abbrev=0 2>/dev/null)
PANE="${HERDR_PANE_ID:-없음}"

if [ -z "$IN_GIT" ]; then
  BRANCH_SHOW="없음 (git 저장소 아님)"
  ROLE="git 저장소가 아님. 브랜치로 역할을 추정할 수 없음. /role 로 역할을 정하세요."
else
  BRANCH_SHOW="${BRANCH:-detached}"
  case "$BRANCH" in
  "$MAIN_BRANCH") ROLE="$MAIN_BRANCH. 직접 커밋할 수 없음. Orchestrator라면 docs/*·chore/*·contract/* 브랜치를 만들어 작업." ;;
  docs/*|chore/*) ROLE="Orchestrator 작업 브랜치. 계약 파일 잠금 중. PR로 $MAIN_BRANCH 에 반영." ;;
  contract/*)     ROLE="Orchestrator 계약 브랜치. 계약 수정 가능. PR로 $MAIN_BRANCH 에 반영." ;;
  feat/a-*)       ROLE="Builder A 위치 (worktree). 계약 파일 잠금 중." ;;
  feat/b-*)       ROLE="Builder B 위치 (worktree). 계약 파일 잠금 중." ;;
  feat/*)         ROLE="Builder 위치 (worktree). 계약 파일 잠금 중." ;;
  review/*)       ROLE="Checker 리뷰 위치. 코드 수정 금지. 지적만 보고." ;;
  "")             ROLE="detached HEAD — Checker 리뷰 위치로 보임. 코드 수정 금지." ;;
  *)              ROLE="알 수 없는 브랜치. 역할을 확인하세요." ;;
  esac
fi

echo "## 세션 컨텍스트 ($PROJECT_NAME)"
echo "- 브랜치: $BRANCH_SHOW · herdr pane: $PANE · 계약 버전: ${CONTRACT:-아직 없음}"
echo "- 추정 위치: $ROLE"
echo "- 역할이 배정되지 않았다면 사용자에게 묻거나 /role 로 불러오세요."

BOARD="$ROOT/docs/board.md"
if [ -f "$BOARD" ]; then
  ROWS=$(awk -v p="| $TASK_ID_PREFIX" 'index($0, p) == 1' "$BOARD" \
    | grep -E '\|[[:space:]]*(doing|review|blocked)[[:space:]]*\|' | cut -d'|' -f2,3,4,5 | head -10)
  if [ -n "$ROWS" ]; then
    echo "- 진행 중 작업 (docs/board.md):"
    echo "$ROWS" | sed 's/^/  /'
  else
    echo "- 진행 중 작업 (docs/board.md): 없음"
  fi
fi

HANDOFF="$ROOT/.claude/state/handoff.md"
if [ -f "$HANDOFF" ]; then
  echo "- 인계 메모 (.claude/state/handoff.md, 최대 30줄):"
  head -30 "$HANDOFF" | sed 's/^/  /'
fi
# Orchestrator 자기 비우기 결과. 끝났는데(exit 줄 있음) 0 이 아니면 보여 준다.
# /clear 뒤 /role 이 오지 않은 경우에도 여기서 알 수 있다.
RESET_LOG="$ROOT/.claude/state/reset.log"
if [ -f "$RESET_LOG" ]; then
  LAST=$(grep -v '^[[:space:]]*$' "$RESET_LOG" | tail -1)
  case "$LAST" in
    "exit 0") ;;
    exit\ [0-9]*)
      echo "- 직전 세션 비우기 실패 (.claude/state/reset.log, $LAST, 마지막 15줄):"
      tail -15 "$RESET_LOG" | sed 's/^/  /'
      echo "  → .claude/roles/orchestrator.md 의 종료 코드 표와 위 복구 명령대로 처리. 해결하면 이 파일을 지우세요." ;;
  esac
fi
exit 0
