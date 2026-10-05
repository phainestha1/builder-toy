---
description: (Orchestrator) 보드의 작업을 Builder에게 배정하고 herdr로 전달한다
argument-hint: <builder-a|builder-b> <작업ID>
---

Orchestrator만 실행합니다. 현재 브랜치가 `main`이 아니면 중단합니다.

인자: `$ARGUMENTS` (첫 번째는 Builder 이름, 두 번째는 작업 ID)

1. `docs/board.md`에서 작업을 찾습니다. 아래 중 하나라도 해당하면 중단하고 사용자에게 알립니다.
   - 완료 기준이 비어 있음
   - 이미 다른 담당이 있음
   - 의존하는 작업이 끝나지 않음
2. 배정 메시지를 만듭니다. 네 가지를 반드시 넣습니다.
   - 작업 ID와 이름
   - 담당 BC와 수정 가능 경로
   - 완료 기준
   - 계약 버전 (`git describe --tags --match 'contract-v*' --abbrev=0`)

   그리고 첫 단계는 `strategy-checklist`이고, 체크리스트를 완성하면 멈추라고 덧붙입니다.
3. 메시지를 사용자에게 먼저 보여 주고, 승인을 받은 뒤 보냅니다.
   ```bash
   herdr agent prompt <builder> "<메시지>" --wait --timeout 600000
   herdr agent read <builder> --source recent-unwrapped --lines 80
   ```
4. 보드에서 담당을 바꾸고 상태를 `doing`으로 고친 뒤 커밋합니다.
5. 상대가 `blocked`이면 직접 답하지 않습니다. 화면 내용을 사용자에게 보여 줍니다.
