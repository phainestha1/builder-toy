---
description: (Orchestrator) 보드의 작업을 Builder에게 배정하고 herdr로 전달한다
argument-hint: <builder-a|builder-b> <작업ID>
---

Orchestrator만 실행합니다. 원본 폴더(worktree가 아닌 곳)에서 실행합니다.

인자: `$ARGUMENTS` (첫 번째는 Builder 이름, 두 번째는 작업 ID)

1. `docs/board.md`에서 작업을 찾습니다. 아래 중 하나라도 해당하면 중단하고 사용자에게 알립니다.
   - 완료 기준이 비어 있음
   - 이미 다른 담당이 있음
   - 의존하는 작업이 끝나지 않음
   - 작업에 ⛳가 붙었는데 사용자가 아직 넘기지 않음
2. 배정 메시지를 만듭니다. 네 가지를 반드시 넣습니다.
   - 작업 ID와 이름
   - 담당 구역과 수정 가능 경로
   - 완료 기준
   - 계약 버전 (`git describe --tags --match 'contract-v*' --abbrev=0`)

   그리고 아래를 덧붙입니다.
   - 브랜치: `feat/a-<작업ID>` 또는 `feat/b-<작업ID>`를 최신 `origin/main`에서 만들 것 (계약 작업이면 `contract/<작업ID>`)
   - 첫 단계는 `strategy-checklist`이고, 체크리스트를 완성하면 멈출 것
3. 배정은 사용자 승인 없이 보냅니다. 범위가 보드의 작업과 다르거나 요구사항이 모호할 때만 사용자에게 먼저 묻습니다.
   ```bash
   herdr agent prompt <builder> "<메시지>" --wait --timeout 600000
   herdr agent read <builder> --source recent-unwrapped --lines 80
   ```
   herdr를 쓸 수 없으면 SendMessage로 보냅니다.
4. 보드에서 담당을 바꾸고 상태를 `doing`으로 고칩니다. "운영 기록" 표에 작업 행을 만들고 시작 시각을 적습니다. `docs/*` 브랜치에서 커밋하고 PR로 반영합니다.
5. 상대가 `blocked`이면 화면을 확인합니다. 사용자에게 물을 일(`CLAUDE.md` "반드시 지킬 것" 1번)이면 사용자에게 보여 주고, 아니면 보드와 계약을 근거로 답합니다.
