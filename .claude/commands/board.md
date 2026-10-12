---
description: 프로젝트 현황을 한 화면으로 요약한다 (현재 단계, 작업 보드, 세션 상태, git 상태)
---

아래를 모아서 짧게 요약합니다. 파일은 고치지 않습니다.

1. **현재 단계:** `docs/board.md` 작업 표에서 `done`이 아닌 첫 작업입니다. 작업 이름에 ⛳가 있으면 사용자 확인이 필요한 게이트라고 적습니다.
2. **작업 보드:** `docs/board.md`에서 상태별 작업 수를 셉니다. `doing`, `review`, `blocked` 작업은 목록으로 보여 줍니다. 대기 중인 계약 변경 요청과 열린 후속 과제 수도 보여 줍니다.
3. **세션:** `HERDR_ENV=1`이면 `herdr agent list`를 실행합니다. 에이전트 이름별 상태(idle / working / blocked / done)를 보여 줍니다. 역할 이름(`orchestrator`, `builder-a`, `builder-b`, `checker`)이 빠졌으면 적습니다. herdr가 없으면 이 항목은 "herdr 없음"으로 둡니다.
4. **git:**
   - 현재 브랜치, `main` 대비 앞서거나 뒤처진 커밋 수
   - `git worktree list`
   - 최신 `contract-v*` 태그
5. **인계 메모:** `.claude/state/handoff.md`가 있으면 마지막 수정 시각과 첫 줄을 보여 줍니다.
6. **주의할 것:** `blocked` 세션, 오래 `review`에 머문 작업, 2차 검증 중인 작업, 계약 태그보다 오래된 브랜치를 맨 위에 적습니다.
