---
description: (Orchestrator) Checker PASS를 받은 브랜치를 main에 머지하고 Builder들에게 rebase를 알린다
argument-hint: <브랜치> <작업ID>
---

Orchestrator만 실행합니다. 현재 브랜치가 `main`이 아니면 중단합니다.

인자: `$ARGUMENTS`

1. **조건을 확인합니다.** 하나라도 아니면 중단합니다.
   - 보드의 검증 결과가 PASS이고, `테스트 실행 N / 통과 N`이 적혀 있음
   - Checker가 검증한 커밋 해시가 브랜치의 최신 커밋과 같음
   - 사용자가 머지를 승인함
2. **머지합니다.**
   ```bash
   git merge --no-ff <브랜치> -m "merge: <작업ID> ..."
   ```
3. **main에서 다시 검사합니다.** `npm run check`를 실행합니다. 실패하면 머지를 되돌리지 말고 바로 사용자에게 보고합니다.
4. 보드의 상태를 `done`으로 바꾸고 커밋합니다. push는 사용자에게 확인을 받고 합니다.
5. **다른 Builder에게 알립니다.**
   ```bash
   herdr agent prompt <builder> "main이 바뀌었습니다 (<작업ID> 머지). 작업 중인 내용을 커밋하고 main에서 rebase해 주세요."
   ```
