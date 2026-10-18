---
description: (Orchestrator) 승인받은 PR을 merge commit으로 main에 머지하고 Builder들에게 알린다
argument-hint: <PR 번호> <작업ID>
---

Orchestrator만 실행합니다. 원본 폴더(worktree가 아닌 곳)에서 실행합니다.

인자: `$ARGUMENTS`

1. **조건을 확인합니다.** 하나라도 아니면 중단합니다.
   - `feat/*` PR이면:
     - 보드의 검증 결과가 PASS이고, `테스트 실행 N / 통과 N`이 적혀 있음
     - Checker가 검증한 커밋 해시가 PR의 최신 커밋과 같음 (`gh pr view <PR> --json headRefOid`)
   - `contract/*` PR이면 Checker PASS(최대 2차)와 사용자 승인이 있어야 합니다.
   - `docs/*`, `chore/*` PR이면 Checker 검증 대신 사용자 확인으로 갈음합니다.
   - PR의 base가 `main`임 (쌓인 PR이면 앞 PR을 먼저 머지)
   - 사용자가 머지를 승인함
2. **머지합니다.** merge commit 방식만 씁니다.
   ```bash
   gh pr merge <PR> --merge
   git push origin --delete <PR의 브랜치>
   ```
   `--delete-branch`는 쓰지 않습니다. 그 브랜치를 체크아웃한 Builder worktree가 있으면 gh가 로컬 브랜치를 지우면서 worktree 폴더까지 없앱니다. 원격 브랜치만 지우고, 로컬 브랜치는 Builder가 다음 작업 브랜치로 바꾼 뒤 남겨 둡니다.
3. **로컬 main을 갱신합니다.**
   ```bash
   git switch main && git pull --ff-only
   ```
4. **main에서 다시 검사합니다.** 검사 명령(`CHECK_CMD`, `.claude/project.conf`)을 실행합니다: `(source .claude/project.conf && eval "$CHECK_CMD")`. 코드가 아직 없으면 건너뛰고 "해당 없음"이라고 적습니다. 실패하면 되돌리지 말고 바로 사용자에게 보고합니다.
5. **계약 PR이면 태그를 붙입니다.** 사용자 확인을 받고 push합니다.
   ```bash
   git tag contract-vN && git push origin contract-vN
   ```
6. **보드를 갱신합니다.** 작업을 `done`으로 바꿉니다. "운영 기록" 표에 머지 시각, 걸린 시간, 승인 대기 시간을 채웁니다. `docs/*` 브랜치에서 커밋하고 PR로 반영합니다.
7. **다른 Builder에게 알립니다.**
   ```bash
   herdr agent prompt <builder> "main이 바뀌었습니다 (<작업ID> 머지). 작업 중인 내용을 커밋하고 git fetch origin && git merge origin/main 해 주세요."
   ```
   herdr를 쓸 수 없으면 SendMessage로 보냅니다.
8. **작업을 마친 Builder를 비웁니다.**
   ```bash
   bash scripts/reset-session.sh builder-a builder-a    # Builder B면 builder-b builder-b
   ```
   스크립트가 pane을 잡아 두고 idle 대기 → `/clear` → 이름 다시 붙이기 → `/role builder-a` 전송 → 이름 확인까지 합니다. 종료 코드별 처리는 `.claude/roles/orchestrator.md`의 표를 따릅니다: 0 완료 / 1 수동 복구 절차 / 2 사용자에게 `/clear` 요청 / 3 직접 승인하지 말고 `herdr agent read <pane> --source recent-unwrapped --lines 80`으로 화면을 본 뒤 사용자에게 알리고, 해소되면 스크립트가 출력한 pane_id 명령으로 다시 실행 (`/clear`가 이미 들어가 이름이 풀렸을 수 있으므로 이름으로 다시 실행하지 않음). exit 2면 사용자에게 그 Builder 세션의 `/clear`와 `/role builder-x`를 요청합니다.
9. **인계합니다.** `/handoff`로 인계 메모를 쓰고 세션을 비웁니다 (herdr가 있으면 스스로, 없으면 사용자에게 요청).
