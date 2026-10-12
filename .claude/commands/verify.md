---
description: (Orchestrator) Checker에게 브랜치 검증을 맡긴다. Builder의 설명은 넘기지 않는다. 최대 2차
argument-hint: <브랜치> <작업ID>
---

Orchestrator만 실행합니다.

인자: `$ARGUMENTS` (첫 번째는 브랜치, 두 번째는 작업 ID)

1. 보드에서 작업의 완료 기준과 지난 검증 결과를 가져옵니다. 보드의 상태를 `review`로 바꿉니다.
   - 지난 결과가 없으면 **1차**, 1차 FAIL이 있으면 **2차**입니다.
   - 2차까지 FAIL이었다면 더 보내지 않습니다. 사용자에게 올리고 멈춥니다 (작업 나누기, 완료 기준 고치기, 그대로 머지 중에서 사용자가 고름).
2. Checker에게 보낼 메시지에는 **딱 네 가지**만 넣습니다.
   - 브랜치
   - 작업 ID
   - 완료 기준
   - 차수 (1차 / 2차). 2차면 1차 검증 커밋 해시와 1차 확정 지적 목록을 함께 넣습니다. 2차는 그 뒤에 바뀐 부분만 봅니다.

   판정 기준(확정된 높음 0건이면 PASS, 낮음은 최대 5건)과 서브에이전트 고르는 법(0~1개로 시작)은 `domain-review` 스킬에 있으므로 따로 적지 않아도 됩니다.

   Builder가 보낸 설명, 의도, 자체 평가, 테스트 결과는 넣지 않습니다. Checker가 직접 확인해야 합니다.
3. Checker에게 보냅니다. 검증 요청은 사용자 승인 없이 보냅니다.
   ```bash
   herdr agent prompt checker "domain-review 스킬로 검증해 주세요. 브랜치: ... / 작업: ... / 완료 기준: ... / 차수: 1차" --wait
   herdr agent read checker --source recent-unwrapped --lines 120
   ```
   herdr를 쓸 수 없으면 SendMessage로 보냅니다.
4. 받은 판정과 `테스트 실행 N / 통과 N`, 차수, 커밋을 보드의 검증 결과 칸에 적습니다 (예: `PASS (1차, abc1234) · 실행 12 / 통과 12`).
   - 낮음 지적(최대 5건)은 보드의 "후속 과제" 표로 옮깁니다.
   - "운영 기록" 표에 검증 차수와 확정 지적 / 오탐 수(`finding-verifier`가 반박한 수)를 적습니다.
5. **Checker를 비웁니다.** 앞 검증의 맥락이 다음 검증에 남지 않게 하기 위해서입니다.
   ```bash
   bash scripts/reset-session.sh checker checker
   ```
   스크립트가 `/clear` 뒤 이름을 다시 붙이고 `/role checker`까지 보냅니다. 그래서 다음 검증(2차 포함)은 3단계의 검증 요청만 보내면 됩니다. 종료 코드별 처리는 `.claude/roles/orchestrator.md`의 표를 따릅니다: 0 완료 / 1 수동 복구 절차 / 2 사용자에게 `/clear` 요청 / 3 직접 승인하지 말고 `herdr agent read <pane> --source recent-unwrapped --lines 80`으로 화면을 본 뒤 사용자에게 알리고, 해소되면 스크립트가 출력한 pane_id 명령으로 다시 실행 (`/clear`가 이미 들어가 이름이 풀렸을 수 있으므로 이름으로 다시 실행하지 않음). exit 2면 사용자에게 Checker 세션의 `/clear`와 `/role checker`를 요청합니다. 0이 아니면 Checker가 비워질 때까지 다음 검증 요청을 보내지 않습니다.
6. 사용자에게 보고합니다.
   - PASS면 `/merge`를 제안합니다 (`main` 머지는 사용자 승인).
   - 1차 FAIL이면 확정된 높음 지적만 Builder에게 돌려보냅니다. 낮음은 보내지 않습니다.
   - 2차 FAIL이면 사용자에게 올립니다.
   - 보드 변경은 `docs/*` 브랜치에서 커밋하고 PR로 반영합니다.
