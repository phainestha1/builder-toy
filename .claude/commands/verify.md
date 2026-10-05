---
description: (Orchestrator) Checker에게 브랜치 검증을 맡긴다. Builder의 설명은 넘기지 않는다
argument-hint: <브랜치> <작업ID>
---

Orchestrator만 실행합니다.

인자: `$ARGUMENTS` (첫 번째는 브랜치, 두 번째는 작업 ID)

1. 보드에서 작업의 완료 기준을 가져옵니다. 보드의 상태를 `review`로 바꿉니다.
2. Checker에게 보낼 메시지에는 **딱 세 가지**만 넣습니다.
   - 브랜치
   - 작업 ID
   - 완료 기준

   판정 기준(높음 0건이면 PASS)은 `domain-review` 스킬에 있으므로 따로 적지 않아도 됩니다.

   Builder가 보낸 설명, 의도, 자체 평가, 테스트 결과는 넣지 않습니다. Checker가 직접 확인해야 합니다.
3. Checker에게 보냅니다.
   ```bash
   herdr agent prompt checker "domain-review 스킬로 검증해 주세요. 브랜치: ... / 작업: ... / 완료 기준: ..." --wait
   herdr agent read checker --source recent-unwrapped --lines 120
   ```
4. 받은 판정과 `테스트 실행 N / 통과 N`을 보드의 검증 결과 칸에 적습니다. 그다음 사용자에게 보고합니다.
   - PASS면 `/merge`를 제안합니다. 보드 변경은 `docs/*` 브랜치에서 커밋하고 PR로 반영합니다.
   - FAIL이면 확정된 지적만 Builder에게 돌려보냅니다.
