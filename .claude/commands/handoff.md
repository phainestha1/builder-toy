---
description: (Orchestrator) 인계 메모를 .claude/state/handoff.md에 덮어쓰고 세션을 비운다(herdr로 스스로 /clear, 없으면 사용자에게 요청). 작업 하나 머지하거나 단계 하나 끝날 때마다
---

Orchestrator만 실행합니다. 작업 하나를 머지했거나 단계(⛳) 하나를 넘을 때마다 씁니다. 맥락이 길어지면 판단이 흐려지기 때문입니다.

1. **보드와 git으로 다시 알 수 없는 것만** 고릅니다. 아래는 적지 않습니다 (보드·git에 이미 있음).
   - 작업 상태, 담당, 완료 기준, 검증 결과, 결정 로그, 후속 과제
   - 브랜치, 커밋, 태그, PR 번호
2. 적을 것은 이런 것들입니다.
   - 지금 누구의 답을 기다리는지 (어느 세션에 무엇을 보냈고, 아직 답이 없음)
   - 사용자에게 물어 놓고 답을 못 받은 질문
   - 다음에 할 일 한두 개
   - 아직 결정 로그에 올리지 않은, 반쯤 정한 판단과 이유
   - 다음 세션이 조심할 것 (예: 특정 세션의 이름이 풀렸음)
3. `.claude/state/handoff.md`에 **덮어씁니다** (이어 쓰지 않음). **20줄 이내**로 씁니다. 형식:
   ```markdown
   # 인계 메모 (<날짜 시각>, 직전: <작업ID 또는 단계>)
   ## 기다리는 것
   ## 사용자에게 물은 것
   ## 다음 할 일
   ## 조심할 것
   ```
   `.claude/state/`는 커밋하지 않습니다 (`.gitignore`).
4. **세션을 비웁니다.**
   - **herdr가 있으면** Orchestrator가 스스로 비웁니다. 아래를 백그라운드로 걸고 이번 턴을 마칩니다. 스크립트가 자기 pane(`HERDR_PANE_ID`)을 대상으로 idle 대기 → `/clear` → 이름 다시 붙이기(`orchestrator`) → `/role orchestrator 후 ...` 전송 → 이름 확인까지 합니다.
     ```bash
     nohup bash -c 'date; bash scripts/reset-session.sh "$HERDR_PANE_ID" orchestrator "후 .claude/state/handoff.md를 보고 이어서 진행"; echo "exit $?"' > .claude/state/reset.log 2>&1 &
     ```
   - 백그라운드라 종료 코드를 바로 볼 수 없습니다. 출력과 종료 코드(`exit N`)는 `.claude/state/reset.log`에 남습니다. 실행할 때마다 덮어쓰고 첫 줄에 시각이 찍힙니다. 결과 확인은 5단계에서 합니다.
   - **herdr가 없으면** 사용자에게 `/clear`를 요청합니다.
     ```
     인계 메모를 .claude/state/handoff.md에 썼습니다. /clear 를 입력해 주세요.
     /clear 뒤 세션 시작 안내에 메모가 보입니다.
     ```
5. **다음 턴에 결과를 확인합니다.**
   - **세션이 비워지지 않았으면** (다음 메시지를 받았는데 앞 대화가 그대로 남아 있음): `/clear` 전에 멈춘 것입니다. 먼저 `.claude/state/reset.log`를 읽습니다. 마지막 줄이 `exit 0`이 아니면 `.claude/roles/orchestrator.md`의 종료 코드 표대로 처리합니다 (3이면 사용자에게 알림). 다시 걸 때는 로그에 출력된 `nohup ... &` 형태 그대로 백그라운드로 겁니다. 포그라운드로 돌리면 자기 턴이 끝나지 않아 idle이 되지 않습니다. 아직 로그가 없거나 `exit` 줄이 없으면 스크립트가 아직 기다리는 중입니다.
   - **`/clear` 뒤 첫 일:** 세션 시작 안내에 "직전 세션 비우기 실패"가 보이면 (`/clear`는 들어갔지만 이름 붙이기나 `/role` 전에 멈춤) 그 안내대로 먼저 처리합니다. 그다음 인계 메모를 읽고, `herdr agent list`로 `orchestrator` 이름이 붙어 있는지 확인합니다. 없으면(스크립트가 1이나 3으로 끝났을 수 있음) `.claude/state/reset.log`로 종료 코드와 출력된 pane_id 명령을 확인하고 `.claude/roles/orchestrator.md`의 "이름이 풀렸을 때 (수동 복구)" 절차로 복구합니다.
