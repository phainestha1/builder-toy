#!/bin/bash
# 훅 자체 검사. 임시 git 저장소에서 모의 JSON 입력으로 각 훅을 돌리고 종료 코드·출력을 대조한다.
# 막아야 할 것과 통과시켜야 할 것을 둘 다 확인한다.
# 사용: bash scripts/test-hooks.sh
# 임시 폴더 위치를 바꾸려면 TEST_TMP_BASE=<폴더> 를 준다 (기본: $TMPDIR 또는 /tmp).
# 필요: bash, git, jq

HERE=$(cd "$(dirname "$0")/.." && pwd)
HOOKS="$HERE/.claude/hooks"
BASE="${TEST_TMP_BASE:-${TMPDIR:-/tmp}}"
BASE=${BASE%/}
T=$(mktemp -d "$BASE/hooktest.XXXXXX") || { echo "임시 폴더를 만들 수 없음"; exit 1; }
T=$(cd "$T" && pwd -P)
trap 'rm -rf "$T"' EXIT

for c in git jq; do
  command -v "$c" >/dev/null 2>&1 || { echo "필요한 명령 없음: $c"; exit 1; }
done

RUN=0
PASS=0
FAILS=""

g() { git -c user.name=hooktest -c user.email=hooktest@example.com -c init.defaultBranch=main "$@"; }

# ---------- 준비: 저장소 ----------
# R: main 체크아웃 (conf 없음 → 기본값)
# R/.worktrees/builder-a: feat/a-x worktree, R/.worktrees/orch: contract/x worktree
R="$T/repo"
mkdir -p "$R"
g -C "$R" init -q -b main
mkdir -p "$R/docs" "$R/src/modules/shared/events" "$R/src/modules/foo/ports" "$R/api"
echo "# glossary" > "$R/docs/glossary.md"
echo "x" > "$R/src/modules/foo/ports/a.ts"
echo "x" > "$R/src/app.ts"
echo "x" > "$R/api/x.proto"
g -C "$R" add -A
g -C "$R" commit -q -m init
g -C "$R" branch feat/a-x
g -C "$R" branch contract/x
g -C "$R" worktree add -q "$R/.worktrees/builder-a" feat/a-x
g -C "$R" worktree add -q "$R/.worktrees/orch" contract/x
WA="$R/.worktrees/builder-a"
WC="$R/.worktrees/orch"

# C: CONTRACT_PATTERNS 를 바꾼 저장소 (main)
C="$T/custom"
mkdir -p "$C/.claude" "$C/docs" "$C/api"
g -C "$C" init -q -b main
echo "# glossary" > "$C/docs/glossary.md"
echo "x" > "$C/api/x.proto"
cat > "$C/.claude/project.conf" <<'EOF'
CONTRACT_PATTERNS="api/*.proto"
EOF
g -C "$C" add -A
g -C "$C" commit -q -m init

# K: MAIN_BRANCH=trunk 저장소
K="$T/trunkrepo"
mkdir -p "$K/.claude"
g -C "$K" init -q -b trunk
cat > "$K/.claude/project.conf" <<'EOF'
MAIN_BRANCH="trunk"
EOF
g -C "$K" add -A
g -C "$K" commit -q -m init

# ---------- 도우미 ----------
# run_hook <hook> <project_dir> <json>  → OUT, CODE 설정
run_hook() {
  OUT=$(cd "$2" && printf '%s' "$3" | CLAUDE_PROJECT_DIR="$2" bash "$HOOKS/$1" 2>/dev/null)
  CODE=$?
}

record() { # record <이름> <성공 여부 0/1> <설명>
  RUN=$((RUN + 1))
  if [ "$2" = "0" ]; then
    PASS=$((PASS + 1))
    echo "  ok   $1"
  else
    FAILS="$FAILS\n  - $1 ($3)"
    echo "  FAIL $1 ($3)"
  fi
}

# expect_code <이름> <기대 코드> <hook> <project_dir> <json>
expect_code() {
  run_hook "$3" "$4" "$5"
  [ "$CODE" = "$2" ]; record "$1" $? "기대 $2, 실제 $CODE"
}

edit_json() { jq -n --arg f "$1" '{tool_name:"Edit",tool_input:{file_path:$f}}'; }
bash_json() { jq -n --arg c "$1" --arg d "$2" '{tool_name:"Bash",tool_input:{command:$c},cwd:$d}'; }
post_json() { jq -n --arg c "$1" --arg o "$2" '{tool_name:"Bash",tool_input:{command:$c},tool_response:{stdout:$o,stderr:""}}'; }

# ---------- guard-contracts ----------
echo "[guard-contracts]"
H=guard-contracts.sh
expect_code "main 에서 계약 파일 수정 → 차단"        2 $H "$R"  "$(edit_json "$R/docs/glossary.md")"
expect_code "feat/a-x 에서 계약 파일 수정 → 차단"    2 $H "$WA" "$(edit_json "$WA/src/modules/foo/ports/a.ts")"
expect_code "contract/x 에서 계약 파일 수정 → 허용"  0 $H "$WC" "$(edit_json "$WC/docs/glossary.md")"
expect_code "계약 아닌 파일 수정 → 허용"             0 $H "$R"  "$(edit_json "$R/src/app.ts")"
expect_code "아직 없는 계약 경로(main) → 차단"       2 $H "$R"  "$(edit_json "$R/src/modules/foo/ports/new.ts")"
expect_code "아직 없는 폴더의 이벤트 파일 → 차단"    2 $H "$R"  "$(edit_json "$R/src/modules/shared/events/sub/x.ts")"
expect_code "worktree 의 contract/x 에서 아직 없는 계약 경로 → 허용" 0 $H "$WC" "$(edit_json "$WC/src/modules/foo/ports/new.ts")"
expect_code "conf 패턴(api/*.proto) 적용 → 차단"     2 $H "$C"  "$(edit_json "$C/api/x.proto")"
expect_code "conf 에서 빠진 기본 패턴 → 허용"        0 $H "$C"  "$(edit_json "$C/docs/glossary.md")"

# ---------- guard-git ----------
echo "[guard-git]"
H=guard-git.sh
expect_code "force push → 차단"                      2 $H "$WA" "$(bash_json "git push --force origin feat/a-x" "$WA")"
expect_code "force push -f → 차단"                   2 $H "$WA" "$(bash_json "git push -f" "$WA")"
expect_code "git push origin main → 차단"            2 $H "$WA" "$(bash_json "git push origin main" "$WA")"
expect_code "git push origin HEAD:main → 차단"       2 $H "$WA" "$(bash_json "git push origin HEAD:main" "$WA")"
expect_code "main 에서 commit → 차단"                2 $H "$R"  "$(bash_json "git commit -m 'msg here'" "$R")"
expect_code "main 에서 merge → 차단"                 2 $H "$R"  "$(bash_json "git merge feat/a-x" "$R")"
expect_code "main 에서 git merge-base → 허용"        0 $H "$R"  "$(bash_json "git merge-base main HEAD" "$R")"
expect_code "커밋 메시지 안의 'git merge' → 허용"    0 $H "$WA" "$(bash_json "git commit -m \"docs: git merge 뒤 git push --force origin main 금지\"" "$WA")"
expect_code "heredoc 메시지 안의 git push --force → 허용" 0 $H "$WA" "$(bash_json "git commit -F - <<'MSG'
note: git push --force origin main
MSG" "$WA")"
expect_code "빈 따옴표 '' 뒤 메시지 안의 git push --force → 허용" 0 $H "$WA" "$(bash_json "sed -i '' 's/a b/git push --force origin main/' f" "$WA")"
expect_code "여러 줄 메시지 안의 git push --force → 허용" 0 $H "$WA" "$(bash_json "git commit -m \"first line
git push --force origin main\"" "$WA")"
expect_code "따옴표 붙은 \"main\" 으로 push → 차단"  2 $H "$WA" "$(bash_json "git push origin \"main\"" "$WA")"
expect_code "git push --all origin → 차단"          2 $H "$WA" "$(bash_json "git push --all origin" "$WA")"
expect_code "git push --mirror → 차단"              2 $H "$WA" "$(bash_json "git push --mirror" "$WA")"
expect_code "git push --tags 단독 → 허용"           0 $H "$WA" "$(bash_json "git push --tags" "$WA")"
expect_code "worktree 에서 git switch -C review/1 origin/feat/a-1 → 허용" 0 $H "$WA" "$(bash_json "git switch -C review/1 origin/feat/a-1" "$WA")"
expect_code "feat 브랜치 push → 허용"               0 $H "$WA" "$(bash_json "git push -u origin feat/a-x" "$WA")"
expect_code "-C 로 main 저장소 지정 후 commit → 차단" 2 $H "$WA" "$(bash_json "git -C $R commit -m x" "$WA")"
expect_code "cd 로 main 저장소 이동 후 commit → 차단" 2 $H "$WA" "$(bash_json "cd $R && git commit -m x" "$WA")"
expect_code "worktree 에서 git switch main → 차단"   2 $H "$WA" "$(bash_json "git switch main" "$WA")"
expect_code "원본 폴더에서 git checkout feat → 허용" 0 $H "$R"  "$(bash_json "git checkout feat/a-x" "$R")"
expect_code "git 아닌 명령 → 허용"                   0 $H "$R"  "$(bash_json "ls -la" "$R")"
expect_code "MAIN_BRANCH=trunk: trunk 에서 commit → 차단" 2 $H "$K" "$(bash_json "git commit -m x" "$K")"
expect_code "MAIN_BRANCH=trunk: push origin trunk → 차단" 2 $H "$K" "$(bash_json "git push origin trunk" "$K")"
expect_code "MAIN_BRANCH=trunk: push origin main → 허용"  0 $H "$K" "$(bash_json "git push origin main" "$K")"

# ---------- check-test-count ----------
echo "[check-test-count]"
H=check-test-count.sh
# expect_warn <이름> <yes|no> <명령> <출력>
expect_warn() {
  run_hook "$H" "$R" "$(post_json "$3" "$4")"
  if [ "$2" = "yes" ]; then
    printf '%s' "$OUT" | jq -e '.hookSpecificOutput.additionalContext | length > 0' >/dev/null 2>&1
    record "$1" $? "경고 JSON 기대, 실제: ${OUT:-빈 출력}"
  else
    [ -z "$OUT" ] && [ "$CODE" = "0" ]
    record "$1" $? "출력 없음 기대, 실제: $OUT"
  fi
}
expect_warn "vitest 0건 → 경고"                       yes "npx vitest run"   "No test files found, exiting with code 0"
expect_warn "npm test 'Tests  0 passed (0)' → 경고"   yes "npm test"         " Tests  0 passed (0)"
expect_warn "vitest 'Tests  12 passed (12)' → 없음"   no  "npx vitest run"   " Test Files  3 passed (3)
      Tests  12 passed (12)"
expect_warn "jest 'Tests: 1 failed, 4 passed' → 없음" no  "npx jest"         "Tests:       1 failed, 4 passed, 5 total"
expect_warn "pytest '3 passed in 0.1s' → 없음"        no  "pytest -q"        "...
3 passed in 0.1s"
expect_warn "cargo 'test result: ok. 5 passed' → 없음" no "cargo test"       "test result: ok. 5 passed; 0 failed; 0 ignored"
expect_warn "go test ok 줄 → 없음"                    no  "go test ./..."    "ok  	example.com/pkg	0.012s"
expect_warn "go test 출력 없음 → 경고"                yes "go test ./..."    "?   	example.com/pkg	[no test files]"
expect_warn "CHECK_CMD(npm run check) 0건 → 경고"     yes "npm run check"    "lint ok"
expect_warn "conf source 후 eval \"\$CHECK_CMD\" 0건 → 경고" yes '(source .claude/project.conf && eval "$CHECK_CMD")' "lint ok"
expect_warn "conf source 후 eval \"\$CHECK_CMD\" 12건 → 없음" no '(source .claude/project.conf && eval "$CHECK_CMD")' "      Tests  12 passed (12)"
expect_warn "\${CHECK_CMD} 참조 0건 → 경고"          yes 'bash -c "${CHECK_CMD}"' "done"
expect_warn "unittest 'Ran 5 tests' → 없음"          no  "python -m unittest" "Ran 5 tests in 0.01s

OK"
expect_warn "unittest 'Ran 0 tests' → 경고"          yes "python3 -m unittest discover" "Ran 0 tests in 0.000s

NO TESTS RAN"
expect_warn "heredoc 본문의 \$CHECK_CMD → 없음"       no  'cat > note.md <<'"'"'EOF'"'"'
run: eval "$CHECK_CMD"
EOF' "lint ok"
expect_warn "echo \"\$CHECK_CMD\" → 없음"             no  'echo "$CHECK_CMD"' "npm run check"
expect_warn "printf 뒤 \${CHECK_CMD} → 없음"           no  'printf "%s\n" ${CHECK_CMD}' "x"
expect_warn "커밋 메시지 안의 러너 이름 → 없음"       no  'git commit -m "fix pytest 설정"' "1 file changed"
expect_warn "grep -rn '\$CHECK_CMD' .claude → 없음"   no  "grep -rn '\$CHECK_CMD' .claude" "x.md: eval"
expect_warn "grep -n \"\\\$CHECK_CMD\" x.md → 없음"  no  'grep -n "\$CHECK_CMD" x.md' "1: eval"
expect_warn "&& 뒤 \$CHECK_CMD 직접 실행 0건 → 경고"  yes 'source .claude/project.conf && $CHECK_CMD' "lint ok"
expect_warn "테스트 명령 아님 → 없음"                 no  "ls -la"           "0 passed"

# ---------- session-context ----------
echo "[session-context]"
H=session-context.sh
mkdir -p "$R/.claude/state"
cat > "$R/docs/board.md" <<'EOF'
| ID | 작업 | 담당 | 상태 | 완료 기준 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|
| T-01 | 첫 작업 | Builder A | doing | - | - | - |
| T-02 | 끝난 작업 | Builder B | done | - | - | - |
EOF
echo "다음 할 일: HANDOFF-MARKER-123" > "$R/.claude/state/handoff.md"
run_hook "$H" "$R" '{}'
echo "$OUT" | grep -q "HANDOFF-MARKER-123"; record "handoff.md 내용 출력" $? "인계 메모 없음"
echo "$OUT" | grep -q "## 세션 컨텍스트 (my-project)"; record "기본 PROJECT_NAME 제목" $? "제목 다름"
echo "$OUT" | grep -q "T-01"; record "doing 작업 표시" $? "T-01 없음"
echo "$OUT" | grep -q "T-02"; [ $? -ne 0 ]; record "done 작업 숨김" $? "T-02 보임"
rm -f "$R/.claude/state/handoff.md"
run_hook "$H" "$R" '{}'
echo "$OUT" | grep -q "인계 메모"; [ $? -ne 0 ]; record "handoff.md 없으면 인계 메모 없음" $? "인계 메모 줄 보임"
g -C "$WA" checkout -q -b review/x
run_hook "$H" "$WA" '{}'
echo "$OUT" | grep -q "Checker"; record "review/* 브랜치 → Checker 추정" $? "Checker 없음"
RL="$R/.claude/state/reset.log"
printf '%s\n' "2026-01-01 10:00" "시간 초과: /clear 뒤 30초 안에 세션 ID가 바뀌지 않았습니다 (w9:p3)." "    - 또는 pane_id 로 다시 실행: RECOVER-MARKER" "exit 3" > "$RL"
run_hook "$H" "$R" '{}'
echo "$OUT" | grep -q "reset.log" && echo "$OUT" | grep -q "exit 3" && echo "$OUT" | grep -q "RECOVER-MARKER"
record "reset.log 마지막 줄 exit 3 → 내용과 복구 명령 표시" $? "출력: $OUT"
printf '%s\n' "2026-01-01 10:00" "완료: ..." "exit 0" > "$RL"
run_hook "$H" "$R" '{}'
! echo "$OUT" | grep -q "reset.log"; record "reset.log 가 exit 0 → 표시 안 함" $? "출력: $OUT"
printf '%s\n' "2026-01-01 10:00" > "$RL"
run_hook "$H" "$R" '{}'
! echo "$OUT" | grep -q "reset.log"; record "reset.log 에 exit 줄 없음(아직 실행 중) → 표시 안 함" $? "출력: $OUT"
rm -f "$RL"
run_hook "$H" "$R" '{}'
! echo "$OUT" | grep -q "reset.log"; record "reset.log 없음 → 표시 안 함" $? "출력: $OUT"
g -C "$WA" checkout -q --detach
run_hook "$H" "$WA" '{}'
echo "$OUT" | grep -q "detached HEAD — Checker"; record "git 저장소의 detached HEAD → Checker 추정" $? "출력: $OUT"
NG="$T/nogit"
mkdir -p "$NG"
run_hook "$H" "$NG" '{}'
! echo "$OUT" | grep -q "Checker\|detached" && echo "$OUT" | grep -q "브랜치: 없음 (git 저장소 아님)" && echo "$OUT" | grep -q "/role"
record "git 저장소 아님 → Checker·detached 대신 안내" $? "출력: $OUT"

# ---------- reset-session ----------
echo "[reset-session]"
RS="$HERE/scripts/reset-session.sh"
FB="$T/fakebin"
LOG="$T/herdr.log"
ST="$T/herdr-state"
mkdir -p "$FB" "$T/nobin"
cat > "$FB/herdr" <<'EOF'
#!/bin/bash
# 가짜 herdr: 호출 인자를 기록하고, 실제 herdr와 같은 모양으로 응답한다.
# 상태: $HERDR_STATE/name (현재 이름), cleared (/clear 받음), renames (rename 횟수)
# 조절: FAKE_STATUS(idle|blocked), FAKE_WAIT_RC, FAKE_PROMPT_ERR(오류 코드), FAKE_PROMPT_ERR_ON(clear|role),
#       FAKE_SID_STUCK=1 (/clear 뒤에도 세션 ID 그대로), FAKE_RENAME_FAIL=N (처음 N번 rename 무시)
{ printf '%s|' "$@"; echo; } >> "$HERDR_LOG"
S="$HERDR_STATE"
NAME=$(cat "$S/name" 2>/dev/null)
case "$1 $2" in
  "agent get")
    if [ "$3" = "w9:p3" ] || { [ -n "$NAME" ] && [ "$3" = "$NAME" ]; }; then
      SID="3ec8dd9c-old"
      [ -f "$S/cleared" ] && [ -z "$FAKE_SID_STUCK" ] && SID="2fd395a1-new"
      if [ -n "$NAME" ]; then NJ="\"$NAME\""; else NJ=null; fi
      printf '{"id":"cli:agent:get","result":{"agent":{"agent":"claude","agent_session":{"kind":"id","value":"%s"},"agent_status":"%s","name":%s,"pane_id":"w9:p3"},"type":"agent_info"}}\n' \
        "$SID" "${FAKE_STATUS:-idle}" "$NJ"
      exit 0
    fi
    printf '{"error":{"code":"agent_not_found","message":"agent target %s not found"},"id":"cli:agent:get"}\n' "$3"
    exit 1 ;;
  "agent wait")
    exit "${FAKE_WAIT_RC:-0}" ;;
  "agent prompt")
    KIND=role; [ "$4" = "/clear" ] && KIND=clear
    if [ -n "$FAKE_PROMPT_ERR" ] && [ "$FAKE_PROMPT_ERR_ON" = "$KIND" ]; then
      printf '{"error":{"code":"%s","message":"rejected"},"id":"cli:agent:prompt"}\n' "$FAKE_PROMPT_ERR"
      exit 1
    fi
    if [ "$KIND" = clear ]; then touch "$S/cleared"; : > "$S/name"; fi
    echo '{"id":"cli:agent:prompt","result":{"type":"ok"}}'
    exit 0 ;;
  "agent rename")
    N=$(( $(cat "$S/renames" 2>/dev/null || echo 0) + 1 )); echo "$N" > "$S/renames"
    [ "$N" -le "${FAKE_RENAME_FAIL:-0}" ] || echo "$4" > "$S/name"
    echo '{"id":"cli:agent:rename","result":{"type":"ok"}}'
    exit 0 ;;
esac
exit 0
EOF
chmod +x "$FB/herdr"

# reset_run <인자...>  (FAKE_* 환경변수는 호출 앞에 붙인다) → ROUT, RC. 매번 로그·상태 초기화
reset_run() {
  : > "$LOG"; rm -rf "$ST"; mkdir -p "$ST"; echo "builder-a" > "$ST/name"
  ROUT=$(HERDR_PANE_ID="${SELF_PANE:-}" HERDR_LOG="$LOG" HERDR_STATE="$ST" RESET_SLEEP=0 RESET_POLL_S=0.2 PATH="$FB:$PATH" bash "$RS" "$@" 2>&1)
  RC=$?
}
# in_order <줄1> <줄2> ...  : 로그에 이 줄들이 이 순서로 (사이에 다른 줄이 있어도) 나오는가
in_order() {
  local want i=1 line
  want=$#
  while IFS= read -r line; do
    [ $i -gt $want ] && break
    eval "cur=\${$i}"
    [ "$line" = "$cur" ] && i=$((i + 1))
  done < "$LOG"
  [ $i -gt $want ]
}
log1() { tr '\n' ' ' < "$LOG"; }

reset_run builder-a checker "이어서 작업"
[ "$RC" = "0" ] && echo "$ROUT" | grep -q "^완료"; record "정상 실행 → exit 0, 완료" $? "exit $RC, 출력: $ROUT"
in_order 'agent|get|builder-a|' \
  'agent|wait|w9:p3|--until|idle|--until|done|--until|blocked|--timeout|600000|' \
  'agent|prompt|w9:p3|/clear|' 'agent|get|w9:p3|' 'agent|rename|w9:p3|checker|' 'agent|get|checker|' \
  'agent|prompt|w9:p3|/role checker 이어서 작업|'
record "순서 get → wait(blocked·timeout) → /clear → 세션 폴링 → rename → 확인 → /role" $? "실제: $(log1)"
# /clear 뒤 wait·prompt·rename 의 TARGET 은 pane_id 여야 한다. get 은 pane_id 폴링이나 역할 이름 확인만 허용.
BAD=$(awk 'f && (($2 != "get" && $3 != "w9:p3") || ($2 == "get" && $3 != "w9:p3" && $3 != "checker")) { print } /\/clear\|$/ { f = 1 }' FS='|' "$LOG")
[ -z "$BAD" ]; record "/clear 뒤 TARGET 은 pane_id" $? "이름으로 호출: $BAD"

reset_run w9:p3 orchestrator
head -1 "$LOG" | grep -q '^agent|wait|w9:p3|'; record "pane_id 로 주면 첫 get 생략" $? "첫 호출: $(head -1 "$LOG")"
grep -qx 'agent|prompt|w9:p3|/role orchestrator|' "$LOG"; record "세 번째 인자 없으면 /role 만 보냄" $? "로그: $(log1)"

reset_run ghost checker
[ "$RC" = "1" ] && echo "$ROUT" | grep -q "herdr agent list"; record "없는 대상(agent_not_found) → exit 1, 복구 안내" $? "exit $RC, 출력: $ROUT"

ROUT=$(PATH="$T/nobin:/usr/bin:/bin" /bin/bash "$RS" builder-a checker 2>&1)
RC=$?
[ "$RC" = "2" ] && echo "$ROUT" | grep -q "herdr가 없습니다"; record "herdr 없으면 exit 2 와 안내" $? "exit $RC, 출력: $ROUT"

FAKE_STATUS=blocked reset_run builder-a checker
[ "$RC" = "3" ] && ! grep -q '/clear' "$LOG" && echo "$ROUT" | grep -q "blocked"
record "blocked 대상 → exit 3, /clear 미전송" $? "exit $RC, 로그: $(log1)"

FAKE_WAIT_RC=1 reset_run builder-a checker
[ "$RC" = "3" ] && ! grep -q '/clear' "$LOG"; record "wait 시간 초과 → exit 3, /clear 미전송" $? "exit $RC, 로그: $(log1)"

FAKE_PROMPT_ERR=agent_blocked FAKE_PROMPT_ERR_ON=clear reset_run builder-a checker
[ "$RC" = "3" ] && ! grep -q '|rename|' "$LOG" && echo "$ROUT" | grep -q "agent_blocked"
record "/clear 가 agent_blocked 로 거부 → exit 3, rename 안 함" $? "exit $RC, 출력: $ROUT"

FAKE_PROMPT_ERR=agent_blocked FAKE_PROMPT_ERR_ON=role reset_run builder-a checker
[ "$RC" = "3" ] && ! echo "$ROUT" | grep -q "^완료"; record "/role 이 agent_blocked 로 거부 → exit 3, 완료 아님" $? "exit $RC, 출력: $ROUT"

FAKE_SID_STUCK=1 RESET_CLEAR_TIMEOUT_S=1 reset_run builder-a checker
[ "$RC" = "3" ] && ! grep -q '|rename|' "$LOG" && echo "$ROUT" | grep -q "bash scripts/reset-session.sh w9:p3 checker"
record "세션 ID 안 바뀜 → exit 3, pane_id 재실행 명령 안내" $? "exit $RC, 출력: $ROUT"

echo "$ROUT" | grep -q "이미 들어갔을 수" && echo "$ROUT" | grep -q "pane_id"
record "/clear 뒤 시간 초과 → 이름이 풀렸을 수 있으니 pane_id 명령으로 다시 실행 안내" $? "출력: $ROUT"

FAKE_SID_STUCK=1 RESET_CLEAR_TIMEOUT_S=1 reset_run builder-a checker "인계 메모를 읽고 이어서"
echo "$ROUT" | grep -qF "bash scripts/reset-session.sh w9:p3 checker '인계 메모를 읽고 이어서'"
record "복구 명령에 세 번째 인자를 따옴표로 포함" $? "출력: $ROUT"
FAKE_SID_STUCK=1 RESET_CLEAR_TIMEOUT_S=1 reset_run builder-a checker "it's \$HOME"
echo "$ROUT" | grep -qF "bash scripts/reset-session.sh w9:p3 checker 'it'\\''s \$HOME'"
record "세 번째 인자의 작은따옴표·\$ 도 복사해 쓸 수 있게 감쌈" $? "출력: $ROUT"
FAKE_SID_STUCK=1 RESET_CLEAR_TIMEOUT_S=1 reset_run builder-a checker
echo "$ROUT" | grep -q "bash scripts/reset-session.sh w9:p3 checker$"
record "세 번째 인자 없으면 복구 명령에도 없음" $? "출력: $ROUT"

! echo "$ROUT" | grep -q "nohup"; record "남의 pane 이면 복구 명령은 포그라운드 형태" $? "출력: $ROUT"
SELF_PANE=w9:p3 FAKE_SID_STUCK=1 RESET_CLEAR_TIMEOUT_S=1 reset_run w9:p3 orchestrator "it's 이어서"
NL=$(echo "$ROUT" | grep -o "nohup .*")
NL_REST=${NL% > .claude/state/reset.log 2>&1 &}
[ "$NL_REST" != "$NL" ] && eval "set -- $NL_REST" && [ "$1 $2 $3" = "nohup bash -c" ] \
  && [ "$4" = "date; bash scripts/reset-session.sh w9:p3 orchestrator 'it'\\''s 이어서'; echo \"exit \$?\"" ]
record "자기 pane 이면 복구 명령은 nohup 백그라운드 형태(reset.log 기록)" $? "출력: $ROUT"

FAKE_RENAME_FAIL=1 reset_run builder-a checker
[ "$RC" = "0" ] && [ "$(grep -c '|rename|' "$LOG")" = "2" ]; record "rename 1회 실패 후 재시도 성공 → exit 0" $? "exit $RC, rename $(grep -c '|rename|' "$LOG")회"

FAKE_RENAME_FAIL=9 reset_run builder-a checker
[ "$RC" = "1" ] && [ "$(grep -c '|rename|' "$LOG")" = "3" ] && ! grep -q '/role' "$LOG" && echo "$ROUT" | grep -q "herdr agent rename"
record "rename 3회 모두 실패 → exit 1, /role 미전송, 복구 안내" $? "exit $RC, 출력: $ROUT"

# ---------- 결과 ----------
echo
if [ -n "$FAILS" ]; then
  printf '실패 목록:%b\n' "$FAILS"
fi
echo "실행 $RUN / 통과 $PASS"
[ "$RUN" = "$PASS" ] || exit 1
exit 0
