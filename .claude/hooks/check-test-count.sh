#!/bin/bash
# PostToolUse(Bash) hook: 테스트를 돌렸는데 실행 건수가 보이지 않거나 0건이면 경고를 주입한다.
# 사례 글의 교훈: 빌드 캐시로 테스트가 한 건도 안 돌았는데 "전체 통과"로 보고된 적이 있다.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
echo "$CMD" | grep -qE '\b(vitest|playwright test)\b|npm (run )?test\b|npm run check\b' || exit 0

OUT=$(echo "$INPUT" | jq -r '(.tool_response.stdout // "") + "\n" + (.tool_response.stderr // "")')

# vitest: "Tests  12 passed (12)" / playwright: "3 passed"
COUNT=$(echo "$OUT" | grep -oE 'Tests[[:space:]]+[0-9]+ (passed|failed)|[0-9]+ passed' | grep -oE '[0-9]+' | head -1)

if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
  MSG="[hook] 테스트 실행 건수를 출력에서 찾지 못했거나 0건입니다. 테스트가 실제로 실행됐는지 확인하기 전에는 '통과'라고 보고하지 마세요. (캐시, 컴파일 실패, 필터 오타를 의심하세요)"
  jq -n --arg m "$MSG" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$m}}'
fi
exit 0
