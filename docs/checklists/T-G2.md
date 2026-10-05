# T-G2 M4 reward·experiment 도메인과 유스케이스 (TDD)
- 담당 BC / 수정 가능 경로: `reward`, `experiment` / `src/modules/reward/**`, `src/modules/experiment/**` (둘 다 `ports/` 제외), `docs/checklists/T-G2.md`
- 계약 버전: contract-v1 (244d26d). 계약 파일은 고치지 않는다.
- 기준: ADR 0001 (R1~R6, E1~E5), `docs/glossary.md`, `.claude/rules/architecture.md`·`testing.md`

## 합의한 요구사항
- `reward`: `LineActivated` 핸들러(산정), 지급 유스케이스, 지원금 조회 유스케이스(어드민용)를 만든다.
- `experiment`: 배정 확인, 노출 기록, 계산 기록 유스케이스와 `ApplicationSubmitted` 핸들러(전환)를 만들고, `ExperimentPort` 구현을 `infra`에 둔다.
- 저장소는 리포지토리 인터페이스(`domain`)와 메모리 구현(`infra`)까지 만든다.
- 핸들러는 함수로 만들고 테스트에서 직접 호출한다. 버스 연결은 T-G3/G4에서 한다.
- `CatalogPort`와 `ApplicationPort`는 테스트에서 가짜 구현을 쓴다.

## 결정과 근거 (2026-10-05 Orchestrator 확인)
1. **이벤트 발행:** `reward/application/event-publisher.ts`에 `EventPublisher` 인터페이스(`publish(event: RewardEvent): Promise<void>`)를 두고, 유스케이스는 여기에 발행한다. Builder A의 `application` BC와 같은 모양이다. 구현(`shared/infra` 메모리 버스)과 연결은 T-G3/G4에서 한다. 테스트 편의를 위해 만든 이벤트를 결과로도 돌려준다. 테스트는 가짜 발행기에 쌓인 이벤트로 검사한다.
2. **시계와 무작위:** `now(): IsoDateTime`와 변형 선택기(`() => "A" | "B"`)를 유스케이스 인자(의존성)로 받는다. 테스트에서는 고정값을 쓴다. `shared`에 시계가 아직 없어서, 각 BC 안에 타입만 둔다.
3. **R2 재계산 입력:** 스냅샷의 `NormalizedEstimateInput`을 `EstimateInput`으로 되돌린다. `Entered` → 금액, `Unknown` → `null`, `NotApplicable` → `null` (약정 아니요). 금액은 재계산 결과를 쓴다 (스냅샷 금액을 그대로 복사하지 않는다).
4. **산정 중 이상 상황:** `ApplicationNotFound`이거나 재계산 결과가 `Calculated`가 아니면(`Rejected`, `PlanNotInRateTable`) 지원금을 **만들지 않고** 실패 결과를 돌려준다. 버전은 고치지 않으니(C7) 정상 흐름에서는 일어나지 않는다. `산정 대상 아님`은 `NoSnapshot`일 때만 쓴다 (R3).
5. **지원금 식별:** `applicationId`로 식별한다 (R4, T-D2 결정).
6. **E1 배정 실패:** 변형 선택기가 예외를 던지면 `Excluded` 레코드를 만든다. 레코드 저장이 실패하면 저장 없이 `Excluded`를 돌려준다 (T-D2 결정).
7. **E3 노출:** 노출 기록 유스케이스는 랜딩에서만 부른다. 변형 표시는 그 방문자의 배정 레코드 값이고, 레코드가 없으면 `Excluded`다.
8. **E4 계산 기록 판단 위치:** `experiment` 유스케이스가 `CatalogPort` 결과(`RewardCalculationResult`)를 받아 `Calculated`일 때만 기록한다. 라우트는 결과를 넘기기만 한다. 규칙을 도메인 테스트로 검사할 수 있어서다 (ADR 후속 과제). 계산할 때마다 기록하고, 계산기 사용자는 "기록이 1건 이상 있는 방문자"다. 지표 2는 M7에서 방문자 기준으로 중복을 빼서 집계한다.
9. **E5 전환:** 변형 표시는 이벤트의 `assignedVariant`를 쓰고, 배정 레코드는 읽지 않는다. 방문자당 첫 1회만 기록한다.
10. **지표 집계(분모·분자 계산)는 M7 범위다.** 이번에는 기록에 `Excluded` 표시가 붙는지까지만 검사한다.

## 테스트 케이스 (테스트 이름에 정책 번호)
### reward — 도메인 (`reward/domain/*.test.ts`)
- R3: 스냅샷이 없으면 지원금 상태는 `NotEligible`이고 금액이 없다.
- R5: `Calculated` → 지급 → `Paid`.
- R5: `Paid`에서 다시 지급하면 거절된다 (`AlreadyPaid`).
- R5: `NotEligible`에서 지급하면 거절된다 (`NotEligible`).
- R6: 지급하면 `counselorId`와 지급 시각이 남는다.

### reward — 유스케이스 (`reward/application/*.test.ts`)
- R1: `LineActivated`를 받기 전에는 지원금이 없다 (조회 결과 없음, 지급 요청은 `RewardNotFound`로 거절).
- R2: 스냅샷의 입력과 기준표 버전으로 `calculateRewardWithVersion`을 부르고, 그 결과로 `Calculated` 지원금과 `RewardCalculated` 이벤트(payload 금액, 버전)를 만든다.
- R2: 입력 되돌리기. 위약금 `Entered`/`Unknown`/`NotApplicable`이 각각 금액/`null`/`null`로 넘어간다.
- R3: `NoSnapshot`이면 `NotEligible`로 저장하고 `RewardCalculated`를 내지 않는다.
- R4: 같은 `LineActivated`를 두 번 받아도 산정과 Port 호출은 1회이고, 지원금은 하나다.
- R4: `NotEligible` 뒤 같은 이벤트를 다시 받아도 그대로 하나다.
- 결정 4: `ApplicationNotFound`나 재계산 `Rejected`면 지원금을 만들지 않는다.
- R5·R6: 지급 유스케이스가 `RewardPaid`(`applicationId`, `counselorId`, `totalReward`)를 돌려주고, 두 번째 지급은 거절된다.

### experiment — 도메인·유스케이스
- E1: 첫 화면이 랜딩이면 선택기 값(`A` 또는 `B`)으로 배정하고 레코드를 만든다.
- E1: 같은 방문자가 다시 들어오면 선택기를 다시 부르지 않고 같은 값을 돌려준다.
- E1: 첫 화면이 02·03·04면 `Excluded`이고, 나중에 랜딩에 와도 `Excluded` 그대로다.
- E1: 선택기가 실패하면 `Excluded`로 저장한다.
- E1: 저장이 실패하면 `Excluded`를 돌려주고 레코드는 없다. 다음 진입 때 다시 정한다.
- E2: `Excluded` 방문자의 노출·계산·전환 기록에 `Excluded` 표시가 붙는다.
- E3: 같은 방문자의 노출은 두 번 불러도 1건이다. 표시는 배정 레코드 값이다.
- E4: `Calculated` 결과면 계산 기록을 남기고, `Rejected`·`PlanNotInRateTable`이면 남기지 않는다.
- E4: 계산 기록이 있는 방문자만 계산기 사용자다.
- E5: `ApplicationSubmitted`를 받으면 이벤트의 `assignedVariant`로 전환을 기록한다. 배정 레코드가 `A`여도 이벤트가 `Excluded`면 `Excluded`다.
- E5: 같은 방문자의 두 번째 `ApplicationSubmitted`는 전환을 더 만들지 않는다.
- ExperimentPort: 레코드가 있으면 `{ visitorId, variant }`를, 없으면 `null`을 돌려준다 (`experiment/infra/*.test.ts`).

## 범위 밖
- 이벤트 버스 연결, SQLite/Drizzle 리포지토리, 라우트·화면 (T-G3/G4)
- 지표 1·2 집계 (M7)
- `catalog`·`application` 구현 (T-G1, Builder A)
- 계약 파일 수정. 필요하면 `/contract-change`로 요청한다.

## 완료 기준
1. R1~R6, E1~E5마다 테스트 1개 이상, 테스트 이름에 정책 번호
2. `npm run check` 통과 (타입·린트·테스트·아키텍처), 보고는 `테스트 실행 N / 통과 N` (N ≥ 1, 출력에서 읽은 값)
3. Checker PASS (높음 0건)
