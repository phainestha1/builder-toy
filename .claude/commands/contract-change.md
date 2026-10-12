---
description: (Builder) 계약(용어, 이벤트, Port) 변경을 Orchestrator에게 요청한다. 계약 파일은 직접 고치지 않는다
argument-hint: <대상 파일 또는 계약 이름>
---

계약 변경 대상: `$ARGUMENTS`

계약 파일(`.claude/project.conf`의 `CONTRACT_PATTERNS`)은 직접 고치지 않습니다. `guard-contracts.sh` 훅이 막습니다.

1. 아래를 정리합니다.
   - **대상 파일:** 정확한 경로
   - **변경 내용:** 추가하거나 바꿀 타입, 필드, 용어. 가능하면 diff 형태로
   - **이유:** 지금 계약으로 왜 안 되는지, 어떤 작업(작업 ID)이 막혔는지
   - **영향 받는 구역:** 이 계약을 쓰는 곳 (`grep`으로 확인)
   - **대안:** 계약을 바꾸지 않고 해결할 방법을 검토했는지
2. Orchestrator에게 보냅니다.
   ```bash
   herdr agent prompt orchestrator "계약 변경 요청: ..."
   ```
   herdr를 쓸 수 없으면 SendMessage로 보냅니다.
3. 답을 받을 때까지 계약에 의존하는 부분은 구현하지 않습니다. 계약과 관계없는 다른 테스트 케이스는 진행해도 됩니다.

Orchestrator가 이 요청을 받으면 할 일:
1. 보드의 "계약 변경 요청" 표에 기록합니다.
2. 영향 받는 구역을 확인하고 사용자 승인을 받습니다.
3. `main`에서 `contract/<요청ID>` 브랜치를 만들어 반영하고 PR을 올립니다.
4. Checker 검증(최대 2차)과 사용자 승인 후 `/merge`로 머지하고, `main`의 머지 커밋에 `contract-vN` 태그를 붙입니다.
5. 모든 Builder에게 `main`을 merge하라고 알립니다.
