#!/bin/bash
# 이 템플릿(builder-toy)의 하네스 변경을 다른 프로젝트로 가져간다.
#
# 사용: bash scripts/sync-harness.sh <대상 저장소 폴더> [--base <템플릿 커밋>] [--dry-run]
#   예: bash scripts/sync-harness.sh ~/projects/ajd-map --dry-run
#
# 왜 필요한가: 하네스는 템플릿에서만 고치고, 프로젝트는 받아 쓴다.
# 프로젝트마다 고친 곳(이름, Builder 수, 소개 등)이 있어서 파일을 통째로 덮으면 그 내용이 사라진다.
# 그래서 "마지막으로 받은 템플릿 커밋 → 지금 템플릿 HEAD" 사이의 변경만 패치로 적용한다.
#
# 마지막으로 받은 커밋은 대상의 .claude/harness.lock 에 적는다 (TEMPLATE_COMMIT=<sha>).
# 처음 받을 때는 lock 이 없으므로 --base 로 그 프로젝트를 복사해 온 템플릿 커밋을 준다.
#
# 파일마다:
#   이미 같은 변경이 있음  → 건너뜀
#   그대로 적용됨          → 적용
#   충돌                    → <파일>.rej 를 남김. 손으로 맞춘 뒤 .rej 를 지운다
# 템플릿 HEAD 와 대상 파일이 이미 같으면 건너뜀.
#
# 가져가는 것: .claude/ 의 commands·roles·skills·agents·rules·hooks·settings.json,
#   scripts/test-hooks.sh, scripts/reset-session.sh, CLAUDE.md
# 가져가지 않는 것: .claude/project.conf, .claude/settings.local.json, .claude/state/, docs/, README.md, 이 스크립트
#
# 대상에서는 브랜치를 만들지도, 커밋하지도 않는다. 결과를 보고 대상 저장소의 chore/* 브랜치에서 커밋한다.
#
# 종료 코드:
#   0 완료 (충돌 없음)
#   1 사용법 오류, 대상이 git 저장소가 아님, base 를 모름, 대상에 커밋 안 한 하네스 변경이 있음
#   4 충돌 있음 (.rej 확인)

SELF="scripts/sync-harness.sh"
PATHS=(
  .claude/commands .claude/roles .claude/skills .claude/agents .claude/rules .claude/hooks
  .claude/settings.json scripts/test-hooks.sh scripts/reset-session.sh CLAUDE.md
)
LOCK=".claude/harness.lock"

TARGET=""
BASE=""
DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -*) echo "모르는 옵션: $1" >&2; exit 1 ;;
    *) TARGET="$1"; shift ;;
  esac
done

if [ -z "$TARGET" ]; then
  echo "사용: bash $SELF <대상 저장소 폴더> [--base <템플릿 커밋>] [--dry-run]" >&2
  exit 1
fi

TEMPLATE="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$(cd "$TARGET" 2>/dev/null && pwd)"
if [ -z "$TARGET" ] || ! git -C "$TARGET" rev-parse --git-dir >/dev/null 2>&1; then
  echo "대상이 git 저장소가 아닙니다" >&2
  exit 1
fi
if [ "$TARGET" = "$TEMPLATE" ]; then
  echo "대상이 템플릿 자신입니다" >&2
  exit 1
fi

if [ -z "$BASE" ] && [ -f "$TARGET/$LOCK" ]; then
  BASE="$(sed -n 's/^TEMPLATE_COMMIT=//p' "$TARGET/$LOCK")"
fi
if [ -z "$BASE" ]; then
  echo "$TARGET/$LOCK 이 없습니다. 처음이면 --base <그 프로젝트를 복사해 온 템플릿 커밋>을 주세요" >&2
  exit 1
fi
if ! git -C "$TEMPLATE" cat-file -e "$BASE^{commit}" 2>/dev/null; then
  echo "템플릿에 커밋 $BASE 가 없습니다" >&2
  exit 1
fi
HEAD="$(git -C "$TEMPLATE" rev-parse HEAD)"

if [ -n "$(git -C "$TARGET" status --porcelain -- "${PATHS[@]}")" ]; then
  echo "대상에 커밋하지 않은 하네스 변경이 있습니다. 먼저 커밋하거나 치워 주세요:" >&2
  git -C "$TARGET" status --short -- "${PATHS[@]}" >&2
  exit 1
fi

echo "템플릿 $(git -C "$TEMPLATE" rev-parse --short "$BASE") → $(git -C "$TEMPLATE" rev-parse --short "$HEAD")"
[ "$DRY" = 1 ] && echo "(--dry-run: 대상 파일은 바꾸지 않음)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
CONFLICT=0
N=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  N=$((N + 1))
  # 템플릿 HEAD와 이미 같으면 (지운 파일이면 대상에도 없으면) 건너뜀
  if git -C "$TEMPLATE" cat-file -e "$HEAD:$f" 2>/dev/null; then
    git -C "$TEMPLATE" show "$HEAD:$f" > "$TMP/head"
    if [ -f "$TARGET/$f" ] && cmp -s "$TMP/head" "$TARGET/$f"; then
      echo "  같음      $f"; continue
    fi
  elif [ ! -e "$TARGET/$f" ]; then
    echo "  같음      $f (지운 파일)"; continue
  fi
  git -C "$TEMPLATE" diff --binary "$BASE" "$HEAD" -- "$f" > "$TMP/p"
  if git -C "$TARGET" apply --check -R "$TMP/p" 2>/dev/null; then
    echo "  이미 있음 $f"
  elif git -C "$TARGET" apply --check "$TMP/p" 2>/dev/null; then
    echo "  적용      $f"
    [ "$DRY" = 1 ] || git -C "$TARGET" apply "$TMP/p"
  else
    echo "  충돌      $f"
    CONFLICT=1
    [ "$DRY" = 1 ] || git -C "$TARGET" apply --reject "$TMP/p" 2>/dev/null
  fi
done < <(git -C "$TEMPLATE" diff --name-only "$BASE" "$HEAD" -- "${PATHS[@]}")

[ "$N" = 0 ] && echo "  바뀐 하네스 파일 없음"

if [ "$DRY" = 0 ]; then
  printf 'TEMPLATE_COMMIT=%s\n' "$HEAD" > "$TARGET/$LOCK"
  echo "$LOCK 갱신: $(git -C "$TEMPLATE" rev-parse --short "$HEAD")"
fi

if [ "$CONFLICT" = 1 ]; then
  echo "충돌이 있습니다. 대상에서 *.rej 를 보고 손으로 맞춘 뒤 지워 주세요"
  exit 4
fi
exit 0
