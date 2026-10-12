#!/bin/bash
# PostToolUse(Bash) hook: 테스트를 돌렸는데 실행 건수가 보이지 않거나 0건이면 경고를 주입한다.
# 교훈: 캐시나 필터 오타로 테스트가 한 건도 안 돌았는데 "전체 통과"로 보고되는 일이 생긴다.
# 대상: project.conf 의 CHECK_CMD, 그리고 흔한 테스트 러너(vitest, jest, playwright test,
#       npm/pnpm/yarn/bun test, pytest, go test, cargo test, mvn/gradle test 등).

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
[ -z "$CMD" ] && exit 0

# 판정용 명령: guard-git.sh 와 같은 방식으로 heredoc 본문과, 공백이 든 따옴표 문자열을 뺀다.
# 메시지나 본문 안의 러너 이름·$CHECK_CMD 글자를 실제 실행으로 오인하지 않기 위해서다.
# 공백 없는 따옴표 토큰("$CHECK_CMD" 등)은 남는다. 그래서 eval "$CHECK_CMD" 는 계속 검사 명령으로 본다.
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
# echo/printf 뒤의 인자는 실행이 아니므로 뺀다 (예: echo "$CHECK_CMD").
CLEAN=$(printf '%s\n' "$CLEAN" | sed -E 's/(^|[;&|(]|[[:space:]])(echo|printf)([[:space:]][^;&|)]*)?/\1/g')

IS_TEST=""
if [ -n "$CHECK_CMD" ]; then
  case "$CLEAN" in *"$CHECK_CMD"*) IS_TEST=1 ;; esac
fi
# 문서 안내처럼 conf를 읽어 `eval "$CHECK_CMD"` 로 돌리는 경우: 명령에 값 대신 변수 참조만 보인다.
# 참조가 실행 위치에 있을 때만 검사 명령으로 본다.
#   - eval, sh -c, bash -c 바로 뒤
#   - 명령 위치: 줄 처음, &&·||·;·|·( 뒤
# grep '$CHECK_CMD' 파일 처럼 다른 명령의 인자로 쓰인 참조는 실행이 아니다.
if [ -z "$IS_TEST" ]; then
  REF_RE='(^|[;&|(]|(^|[^[:alnum:]_])eval[[:space:]]|(^|[^[:alnum:]_])(ba)?sh[[:space:]]+-c[[:space:]])[[:space:]]*["'"'"']?\$(CHECK_CMD|\{CHECK_CMD\})'
  printf '%s\n' "$CLEAN" | grep -qE "$REF_RE" && IS_TEST=1
fi
if [ -z "$IS_TEST" ]; then
  B='(^|[[:space:];&|(/])'
  E='([[:space:];&|)]|$)'
  RUNNERS="vitest|jest|pytest|playwright[[:space:]]+test|(npm|pnpm|yarn|bun)([[:space:]]+run)?[[:space:]]+test|go[[:space:]]+test|cargo[[:space:]]+(test|nextest)|python[0-9.]*[[:space:]]+-m[[:space:]]+(pytest|unittest)|(mvn|mvnw|gradle|gradlew)([[:space:]]+[^;&|]*)?[[:space:]]+test|dotnet[[:space:]]+test|make[[:space:]]+(test|check)"
  echo "$CLEAN" | grep -qE "${B}(${RUNNERS})${E}" && IS_TEST=1
fi
[ -z "$IS_TEST" ] && exit 0

OUT=$(printf '%s' "$INPUT" | jq -r '(.tool_response.stdout // "") + "\n" + (.tool_response.stderr // "")')

# 실행 건수를 모두 더한다. 형식이 여럿 섞여 있어도 한 곳이라도 1 이상이면 실행된 것으로 본다.
# - vitest "Tests  12 passed (12)", jest "Tests: 1 failed, 11 passed", playwright "3 passed",
#   pytest "3 passed in 0.1s", cargo "test result: ok. 5 passed; 0 failed"  → "N passed" / "N failed"
# - maven/gradle "Tests run: N"
# - python unittest "Ran N tests"
# - go: "--- PASS"/"--- FAIL" 줄 수, 없으면 "ok  <패키지>" 줄 수
TOTAL=0
for n in $(echo "$OUT" | grep -oE '[0-9]+ (passed|failed)' | grep -oE '^[0-9]+'); do
  TOTAL=$((TOTAL + n))
done
for n in $(echo "$OUT" | grep -oE 'Tests run: [0-9]+' | grep -oE '[0-9]+$'); do
  TOTAL=$((TOTAL + n))
done
for n in $(echo "$OUT" | grep -oE 'Ran [0-9]+ tests?' | grep -oE '[0-9]+'); do
  TOTAL=$((TOTAL + n))
done
GO_CASES=$(echo "$OUT" | grep -cE '^[[:space:]]*--- (PASS|FAIL)')
if [ "$GO_CASES" -gt 0 ]; then
  TOTAL=$((TOTAL + GO_CASES))
else
  GO_PKGS=$(echo "$OUT" | grep -cE '^ok[[:space:]]+[^[:space:]]+')
  TOTAL=$((TOTAL + GO_PKGS))
fi

if [ "$TOTAL" -eq 0 ]; then
  MSG="[hook] 테스트 실행 건수를 출력에서 찾지 못했거나 0건입니다. 테스트가 실제로 실행됐는지 확인하기 전에는 '통과'라고 보고하지 마세요. (캐시, 컴파일 실패, 필터 오타, 출력 형식 차이를 의심하세요)"
  jq -n --arg m "$MSG" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$m}}'
fi
exit 0
