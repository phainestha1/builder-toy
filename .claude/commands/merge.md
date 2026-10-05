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
   - `docs/*`, `chore/*`, `contract/*` PR이면 Checker 검증 대신 사용자 확인으로 갈음합니다.
   - PR의 base가 `main`임 (쌓인 PR이면 앞 PR을 먼저 머지)
   - 사용자가 머지를 승인함
2. **머지합니다.** merge commit 방식만 씁니다.
   ```bash
   gh pr merge <PR> --merge --delete-branch
   ```
3. **로컬 main을 갱신합니다.**
   ```bash
   git switch main && git pull --ff-only
   ```
4. **main에서 다시 검사합니다.** `npm run check`를 실행합니다 (Phase E 이후). 실패하면 되돌리지 말고 바로 사용자에게 보고합니다.
5. **계약 PR이면 태그를 붙입니다.** 사용자 확인을 받고 push합니다.
   ```bash
   git tag contract-vN && git push origin contract-vN
   ```
6. **보드를 갱신합니다.** 작업을 `done`으로 바꿉니다. `docs/*` 브랜치에서 커밋하고 PR로 반영합니다.
7. **다른 Builder에게 알립니다.**
   ```bash
   herdr agent prompt <builder> "main이 바뀌었습니다 (<작업ID> 머지). 작업 중인 내용을 커밋하고 git fetch origin && git merge origin/main 해 주세요."
   ```
