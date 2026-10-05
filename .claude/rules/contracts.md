---
paths:
  - "docs/glossary.md"
  - "src/modules/shared/events/**/*"
  - "src/modules/*/ports/**/*"
---
# 계약 파일

이 파일들은 여러 세션이 동시에 기대고 있는 약속입니다. 바뀌면 모든 Builder가 영향을 받습니다.

- **수정 권한:** `contract/*` 브랜치에서만 고칠 수 있습니다. Orchestrator가 직접 하거나, 계약 작업을 배정받은 Builder가 `contract/<작업ID>` worktree에서 합니다. `main`을 포함한 다른 브랜치에서는 `guard-contracts.sh` 훅이 차단합니다.
- **변경 절차:**
  1. Builder가 `/contract-change`로 요청합니다.
  2. Orchestrator가 영향 받는 BC를 확인합니다.
  3. 사용자 승인을 받습니다.
  4. `contract/<작업ID>` 브랜치에서 고치고 PR을 올립니다.
  5. PR을 머지하고, `main`의 머지 커밋에 `contract-vN` 태그를 붙입니다.
  6. 모든 Builder에게 `main`을 merge하라고 알립니다.
- **이벤트:** 과거형 이름을 씁니다 (`ApplicationSubmitted`). payload에는 ID와 그 시점의 사실만 담습니다. 받는 쪽의 편의를 위한 필드를 넣지 않습니다.
- **Port:** 조회 전용입니다. 상태를 바꾸는 메서드를 두지 않습니다. 반환 타입은 내부 엔티티가 아니라 Port 전용 읽기 모델입니다.
- **용어:** 코드의 이름은 `docs/glossary.md`의 영문 표기를 그대로 씁니다. "쓰지 않는 말" 열에 있는 단어는 코드, 주석, UI 문구에 쓰지 않습니다.
