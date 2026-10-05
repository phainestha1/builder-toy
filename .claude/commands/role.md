---
description: 이 세션에 역할(orchestrator / builder-a / builder-b / checker)을 배정하고 역할 지침을 불러온다
argument-hint: <orchestrator|builder-a|builder-b|checker>
---

이 세션의 역할은 `$ARGUMENTS`입니다.

1. 역할에 맞는 지침 파일을 끝까지 읽고 따릅니다.
   - `orchestrator` → `.claude/roles/orchestrator.md`
   - `builder-a`, `builder-b` → `.claude/roles/builder.md`
   - `checker` → `.claude/roles/checker.md`
2. 현재 브랜치와 작업 위치가 역할과 맞는지 확인합니다.
   - Orchestrator는 원본 폴더의 `main`이나 `docs/*`·`chore/*`·`contract/*` 브랜치, Builder는 `feat/*` worktree, Checker는 리뷰 대상 브랜치나 detached HEAD
   - 맞지 않으면 진행하지 말고 사용자에게 알립니다.
3. `docs/board.md`에서 이 역할에 배정된 작업을 찾습니다.
4. 아래를 짧게 보고하고, 배정이나 지시를 기다립니다.
   - 역할
   - 브랜치
   - 계약 버전: `git describe --tags --match 'contract-v*' --abbrev=0`
   - 배정된 작업
