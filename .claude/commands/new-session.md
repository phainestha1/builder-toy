---
description: (Orchestrator) 지금까지 한 일을 보드에 정리해 PR로 올리고, 인계 메모를 쓴 뒤 세션을 비우고 /role orchestrator로 새로 시작한다
---

Orchestrator만 실행합니다. 작업이 끝나지 않았어도 맥락이 길어져 세션을 새로 시작하고 싶을 때 씁니다. `/handoff` 앞에 "보드 정리"를 한 단계 더한 것입니다.

1. **지금 상태를 모읍니다.** 고치기 전에 확인만 합니다.
   - `git status --short`, `git branch --show-current`, `git worktree list`
   - `gh pr list --state open`, 최근 머지된 PR (`gh pr list --state merged --limit 5`)
   - herdr가 있으면 `herdr agent list` (이름이 빠진 역할도 적어 둡니다)
2. **보드를 고칩니다.** `docs/board.md`에서 실제 상태와 다른 곳만 고칩니다.
   - 세션 표: 역할별 현재 브랜치와 상태
   - 작업 표: 상태(`todo`·`doing`·`review`·`done`), 검증 결과
   - 운영 기록: 머지한 작업의 머지 시각·PR 번호·걸린 시간, 이번에 생긴 마찰
   - 결정 로그: 이번 세션에서 정했는데 아직 안 적은 결정
   - 후속 과제: 새로 나온 낮음 지적이나 관찰
   - 고칠 것이 없으면 이 단계와 3단계를 건너뛰고, 보고에 "보드 변경 없음"이라고 적습니다.
3. **보드 변경을 PR로 올립니다.**
   - 지금 `docs/*` 브랜치에 있으면 그 브랜치에 커밋합니다. `main`이나 다른 브랜치면 `git switch -c docs/<요약> origin/main`으로 새로 만듭니다. 다른 브랜치에 커밋하지 않은 변경이 있으면 먼저 `git stash`로 치우고, 보드만 옮깁니다.
   - 브랜치 전환과 커밋은 **따로 실행**합니다. `guard-git`은 명령을 실행하기 전 브랜치로 판단하므로, 한 명령으로 이으면 `main`에서 커밋하는 것으로 보고 막습니다.
   - 커밋 메시지는 `docs(board): <요약>`입니다. `git push -u origin <브랜치>`로 올리고, PR이 없으면 `gh pr create --base main`으로 만듭니다.
   - **머지하지 않습니다.** 머지는 사용자 승인을 받은 뒤 `/merge`로 합니다.
4. **인계 메모를 씁니다.** `.claude/commands/handoff.md`의 1~3단계대로 `.claude/state/handoff.md`에 덮어씁니다. "기다리는 것"에 3단계 PR이 머지 승인을 기다린다고 적습니다.
5. **사용자에게 짧게 보고합니다.** 보드에서 고친 것, PR 주소, 인계 메모 위치를 적고, 세션을 비운다고 알립니다.
6. **세션을 비웁니다.** `.claude/commands/handoff.md`의 4단계 그대로 합니다. herdr가 있으면 아래를 백그라운드로 걸고 이번 턴을 마칩니다. 스크립트가 `/clear` → 이름 다시 붙이기 → `/role orchestrator 후 ...` 전송까지 합니다.
   ```bash
   nohup bash -c 'date; bash scripts/reset-session.sh "$HERDR_PANE_ID" orchestrator "후 .claude/state/handoff.md를 보고 이어서 진행"; echo "exit $?"' > .claude/state/reset.log 2>&1 &
   ```
   herdr가 없으면 사용자에게 `/clear`와 `/role orchestrator`를 차례로 입력해 달라고 요청합니다.
7. **결과 확인은 다음 턴에** `.claude/commands/handoff.md`의 5단계대로 합니다.
