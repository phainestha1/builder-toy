---
description: (Builder) 작업을 마치고 Orchestrator에게 리뷰를 요청한다
argument-hint: <작업ID>
---

Builder만 실행합니다. 현재 브랜치가 `feat/*`가 아니면 중단합니다.

작업 ID: `$ARGUMENTS`

1. `npm run check`를 실행하고, 출력에서 테스트 실행 건수와 통과 건수를 읽습니다. 실패하거나 0건이면 요청하지 않고 원인부터 해결합니다.
2. 커밋하지 않은 변경이 없는지 확인합니다 (`git status --short`).
3. 브랜치를 push하고 PR을 올립니다. push는 사용자 확인을 받습니다. PR 본문에는 작업 ID, 체크리스트 경로, `테스트 실행 N / 통과 N`만 적습니다. 의도나 자체 평가는 쓰지 않습니다.
   ```bash
   git push -u origin <branch>
   gh pr create --base main --title "<type>(<bc>): <작업ID> <요약>" --body "..."
   ```
4. 아래 형식으로 Orchestrator에게 보냅니다. 의도나 자체 평가는 쓰지 않습니다. Checker에게 넘어가지 않게 하기 위해서입니다.
   ```
   리뷰 요청: <작업ID>
   브랜치: <branch> · PR: #<번호> · 커밋: <hash>
   테스트: 실행 N / 통과 N
   체크리스트: docs/checklists/<작업ID>.md
   ```
   ```bash
   herdr agent prompt orchestrator "<위 내용>"
   ```
   herdr를 쓸 수 없으면 SendMessage로 보냅니다.
5. 보낸 뒤 다음 지시를 기다립니다. 같은 브랜치를 계속 고치지 않습니다.
