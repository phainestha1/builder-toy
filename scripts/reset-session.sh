#!/bin/bash
# herdr 에이전트 세션을 비우고(/clear) 역할을 다시 불러온다.
#
# 사용: bash scripts/reset-session.sh <이름|pane_id> <역할이름> [이어서 보낼 프롬프트]
#   예: bash scripts/reset-session.sh builder-a builder-a "인계 메모를 읽고 T-03 이어서"
#
# 왜 필요한가: herdr에서 /clear 직후 에이전트 이름이 풀린다(name null).
# 그래서 이름이 살아 있을 때 pane_id(예: w4:p2)를 먼저 잡고, 그 뒤 호출은 pane_id로 한다.
#
# 순서:
#   1) herdr agent get <대상> 으로 pane_id 확인 (대상이 이미 pane_id 형태면 그대로 씀)
#   2) herdr agent wait <pane> --until idle --until done --until blocked --timeout <ms>
#      시간 초과이거나 blocked 면 /clear 를 보내지 않고 멈춘다 (exit 3)
#   3) 세션 ID(.result.agent.agent_session.value)를 읽어 둔다
#   4) herdr agent prompt <pane> "/clear"  (오류 JSON·종료 코드 확인)
#   5) 세션 ID가 바뀔 때까지 짧게 폴링 (= /clear 완료 신호)
#   6) herdr agent rename <pane> <역할이름> → herdr agent get <역할이름> 으로 확인 (실패하면 최대 2번 더)
#   7) herdr agent prompt <pane> "/role <역할이름> [이어서 보낼 프롬프트]"
#
# Orchestrator가 자기 자신을 비울 때: 자기 턴이 끝나야 /clear 가 들어가므로 백그라운드로 실행한다.
#   nohup bash -c 'date; bash scripts/reset-session.sh "$HERDR_PANE_ID" orchestrator "인계 메모를 읽고 이어서"; echo "exit $?"' > .claude/state/reset.log 2>&1 &
# (자기 pane_id는 환경변수 HERDR_PANE_ID 에 있다. 결과는 .claude/state/reset.log 에 실행마다 덮어쓴다.)
#
# 환경변수 (모두 선택):
#   RESET_WAIT_TIMEOUT_MS  하던 일이 끝나기를 기다리는 최대 시간 (기본 600000 = 10분)
#   RESET_CLEAR_TIMEOUT_S  /clear 뒤 세션 ID가 바뀌기를 기다리는 최대 시간 (기본 30초)
#   RESET_POLL_S           폴링·재시도 간격 (기본 1초)
#   RESET_SLEEP            세션 ID를 읽지 못했을 때 /clear 뒤 그냥 기다리는 시간 (기본 3초)
#
# 종료 코드:
#   0 완료 (/role 전송 성공 + 이름 확인)
#   1 대상을 못 찾음, 또는 이름 확인 실패 (재시도 뒤에도)
#   2 herdr 없음
#   3 대상이 blocked 이거나 시간 초과, 또는 전송 거부 (/clear 를 보내지 않았거나 /role 이 들어가지 않음)
# 필요: herdr, jq

TARGET="$1"
ROLE="$2"
EXTRA="$3"
WAIT_MS="${RESET_WAIT_TIMEOUT_MS:-600000}"
CLEAR_TIMEOUT_S="${RESET_CLEAR_TIMEOUT_S:-30}"
POLL_S="${RESET_POLL_S:-1}"
SLEEP_SEC="${RESET_SLEEP:-3}"
SELF="scripts/reset-session.sh"

if [ -z "$TARGET" ] || [ -z "$ROLE" ]; then
  echo "사용: bash $SELF <이름|pane_id> <역할이름> [이어서 보낼 프롬프트]" >&2
  exit 1
fi

if ! command -v herdr >/dev/null 2>&1; then
  echo "herdr가 없습니다. 사용자에게 /clear를 요청하세요"
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq가 없습니다. jq를 설치하거나 사용자에게 /clear를 요청하세요" >&2
  exit 1
fi

PANE=""

# 작은따옴표로 감싸 셸에 그대로 붙여 넣을 수 있게 한다.
sq() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }

# 수동 복구 방법. 실패(1·3)할 때 함께 출력한다.
# 대상이 자기 pane($HERDR_PANE_ID)이면 포그라운드로 돌리면 자기 턴이 안 끝나 idle 이 안 되므로 nohup 형태를 낸다.
recovery() {
  local cmd="bash $SELF ${PANE:-<pane_id>} $ROLE"
  [ -n "$EXTRA" ] && cmd="$cmd $(sq "$EXTRA")"
  echo "  수동 복구:"
  echo "    - herdr agent list 에서 name 이 null 인 pane_id 를 찾아 herdr agent rename <pane_id> $ROLE"
  if [ -n "$PANE" ] && [ "$PANE" = "${HERDR_PANE_ID:-}" ]; then
    echo "    - 또는 pane_id 로 다시 실행 (자기 pane 이라 백그라운드로 걸고 턴을 마침, 결과는 .claude/state/reset.log):"
    echo "      nohup bash -c $(sq "date; $cmd; echo \"exit \$?\"") > .claude/state/reset.log 2>&1 &"
  else
    echo "    - 또는 pane_id 로 다시 실행: $cmd"
  fi
}

fail() { # fail <코드> <메시지>
  echo "$2"
  recovery
  exit "$1"
}

# get 결과에서 필드 하나를 꺼낸다. 오류 JSON이면 빈 값.
agent_field() { # agent_field <대상> <jq 경로>
  herdr agent get "$1" 2>/dev/null | jq -r "$2 // empty" 2>/dev/null
}

# prompt 를 보내고 성공 여부를 돌려준다. 실패하면 ERR_CODE 에 오류 코드를 남긴다.
send_prompt() { # send_prompt <pane> <text>
  local out rc
  out=$(herdr agent prompt "$1" "$2" 2>&1)
  rc=$?
  ERR_CODE=$(printf '%s' "$out" | jq -r '.error.code // empty' 2>/dev/null)
  if [ "$rc" -ne 0 ] || [ -n "$ERR_CODE" ]; then
    ERR_CODE=${ERR_CODE:-exit_$rc}
    return 1
  fi
  return 0
}

# 1) pane_id 확인. "w4:p2" 처럼 콜론이 든 값은 pane_id로 본다.
case "$TARGET" in
  *:*) PANE="$TARGET" ;;
  *)   PANE=$(agent_field "$TARGET" '.result.agent.pane_id') ;;
esac
if [ -z "$PANE" ] || [ "$PANE" = "null" ]; then
  PANE=""
  fail 1 "대상 '$TARGET' 의 pane_id를 찾지 못했습니다. herdr agent list 로 이름이나 pane_id를 확인하세요."
fi

# 2) 하던 일이 끝날 때까지 기다림. blocked 도 멈춤 조건에 넣어 무한 대기를 막는다.
if ! herdr agent wait "$PANE" --until idle --until done --until blocked --timeout "$WAIT_MS" >/dev/null 2>&1; then
  fail 3 "시간 초과: $PANE 이(가) ${WAIT_MS}ms 안에 idle/done 이 되지 않았습니다. /clear 를 보내지 않았습니다. herdr agent read $PANE 로 화면을 확인하고 사용자에게 알리세요."
fi
STATUS=$(agent_field "$PANE" '.result.agent.agent_status')
if [ "$STATUS" = "blocked" ]; then
  fail 3 "대상이 blocked입니다: $PANE. /clear 를 보내지 않았습니다. herdr agent read $PANE 로 화면을 확인하고 사용자에게 알리세요."
fi

# 3) /clear 전 세션 ID
OLD_SID=$(agent_field "$PANE" '.result.agent.agent_session.value')

# 4) 세션 비우기 (이 뒤로 이름이 풀리므로 pane_id로 호출한다)
if ! send_prompt "$PANE" "/clear"; then
  if [ "$ERR_CODE" = "agent_blocked" ]; then
    fail 3 "대상이 blocked입니다: $PANE (agent_blocked). /clear 가 들어가지 않았습니다. herdr agent read $PANE 로 화면을 확인하고 사용자에게 알리세요."
  fi
  fail 3 "/clear 전송 실패: $PANE ($ERR_CODE). herdr agent read $PANE 로 화면을 확인하고 사용자에게 알리세요."
fi

# 5) /clear 완료 신호: 세션 ID가 바뀐다. 이전 ID를 못 읽었으면 RESET_SLEEP 만큼 기다린다.
if [ -n "$OLD_SID" ]; then
  START=$SECONDS
  while :; do
    NEW_SID=$(agent_field "$PANE" '.result.agent.agent_session.value')
    [ -n "$NEW_SID" ] && [ "$NEW_SID" != "$OLD_SID" ] && break
    if [ $((SECONDS - START)) -ge "$CLEAR_TIMEOUT_S" ]; then
      fail 3 "시간 초과: /clear 뒤 ${CLEAR_TIMEOUT_S}초 안에 세션 ID가 바뀌지 않았습니다 ($PANE). /role 을 보내지 않았습니다. /clear 는 이미 들어갔을 수 있어 이름이 풀렸을 수 있습니다. herdr agent read $PANE 로 화면을 확인한 뒤 아래 pane_id 명령으로 다시 실행하세요 (이름으로 다시 실행하면 대상을 못 찾을 수 있음)."
    fi
    sleep "$POLL_S"
  done
else
  sleep "$SLEEP_SEC"
fi

# 6) 이름 다시 붙이기. 확인이 안 되면 최대 2번 더 시도한다.
NAMED=""
for TRY in 1 2 3; do
  herdr agent rename "$PANE" "$ROLE" >/dev/null 2>&1
  GOT=$(agent_field "$ROLE" '.result.agent.pane_id')
  if [ "$GOT" = "$PANE" ]; then NAMED=1; break; fi
  [ "$TRY" -lt 3 ] && sleep "$POLL_S"
done
if [ -z "$NAMED" ]; then
  fail 1 "이름 확인 실패: '$ROLE' 이름이 $PANE 에 붙지 않았습니다 (3번 시도, 조회 결과: ${GOT:-없음}). /role 을 보내지 않았습니다."
fi

# 7) 역할 불러오기 (+ 이어서 보낼 프롬프트)
MSG="/role $ROLE"
[ -n "$EXTRA" ] && MSG="$MSG $EXTRA"
if ! send_prompt "$PANE" "$MSG"; then
  fail 3 "/role 전송 실패: $PANE ($ERR_CODE). 세션은 비워졌고 이름은 '$ROLE' 입니다. herdr agent read $PANE 로 확인한 뒤 herdr agent prompt $PANE \"$MSG\" 를 보내세요."
fi

echo "완료: $PANE 을(를) 비우고 '$ROLE' 이름과 역할을 다시 붙였습니다."
exit 0
