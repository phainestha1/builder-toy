# T-G1 M4 `catalog`·`application` 도메인과 유스케이스 (TDD)
- 담당 BC / 수정 가능 경로: `catalog`, `application` / `src/modules/catalog/**`, `src/modules/application/**`(ports 제외), `src/modules/shared/infra/**`, `docs/checklists/T-G1.md`
- 계약 버전: contract-v1 (244d26d)
- 기준: ADR 0001 3절(C1~C8, A1~A9), `docs/glossary.md`, `.claude/rules/architecture.md`·`testing.md`

## 합의한 요구사항
- `catalog`: 요금제와 기준표 버전(고칠 수 없음), 지원금 계산 공식 하나. `CatalogPort` 구현.
- `application`: 접수 생성, 재접수 합치기, 상태 머신, 전화번호 가림·열람 기록. `ApplicationPort` 구현.
- `shared/infra`: 메모리 이벤트 버스 (구독, 발행). BC 로직은 두지 않습니다.
- 저장소는 리포지토리 인터페이스(각 BC `application/`)와 메모리 구현(`infra/`)까지 만듭니다.

## 결정과 근거
| 결정 | 근거 |
|---|---|
| 유스케이스는 `EventPublisher` 인터페이스(`application/application/`)에 의존하고, `shared/infra`의 메모리 버스가 같은 모양으로 구현합니다 | `application-no-infra` 규칙으로 유스케이스가 `shared/infra`를 import할 수 없습니다 |
| 시계(`now`)와 ID 생성기를 유스케이스 인자로 주입합니다 | 168시간 경계를 테스트로 고정하기 위해서입니다 |
| A5(동시 접수)는 유스케이스 안에서 전화번호별로 직렬화합니다 (전화번호 키 잠금) | 메모리 저장소에는 트랜잭션이 없습니다. SQLite에서는 T-G3/G4에서 다시 봅니다 |
| `PhoneNumberRevealed`는 계약 이벤트가 아니라 `application` 안의 열람 기록으로 저장합니다 | 용어 사전 5절에 없고, 다른 BC가 받지 않습니다 |
| 기준표 시드 v1 [가정]: 보전 한도 300,000원, 평균 위약금 200,000원, 요금제 3~4개(기본 지원금 예: 400,000 / 450,000 / 500,000), 그리고 기준표에 없는 요금제 1개(C6 확인용) | ADR은 보전 한도만 정했습니다. 나머지 값은 데모용 가정입니다 |
| 계산 거절 사유 판정 순서: 전부 빈 값 → `EmptyInput`, 약정 아니요면 개월·위약금 먼저 버림 → 필수 누락 `PartialInput` → 범위 밖 `OutOfRange` → 없는 요금제 `UnknownPlan` → 기준표에 없음 `PlanNotInRateTable` | C4의 "무시 먼저" 순서를 따릅니다 |
| `상담중` 합침에서도 계산 입력은 C4로 검사해 거절합니다 (스냅샷은 바꾸지 않음) | ADR 결과 절 T-D2 결정 |
| 조립 위치(composition root)와 SQLite/Drizzle, 라우트는 이번에 만들지 않습니다 | 배정 메시지 (T-G3/G4) |

## 테스트 케이스
### catalog — 도메인 (`src/modules/catalog/domain/*.test.ts`)
- **C1** 기본 400,000 + 위약금 200,000 입력 → 합계 600,000 (보전액 200,000)
- **C1·C2 경계** 위약금 299,999 → 보전액 299,999 / 300,000 → 300,000 / 300,001 → 300,000
- **C3** 약정 아니요 → 보전액 0, 합계 = 기본 지원금, 위약금 `NotApplicable`, 개월 `null`
- **C4 무시 먼저** {요금제, 아니요, 12, 500000}과 {요금제, 아니요, 99, -1} → 둘 다 `Calculated`, 합계 = 기본 지원금, 무시한 값은 결과에 없음
- **C4 거절**
  - 전부 `null` → `EmptyInput`
  - 위약금만 → `PartialInput` / 요금제만 → `PartialInput` / 예인데 개월 없음 → `PartialInput`
  - 개월 경계: 0·36 통과, -1·37·1.5 → `OutOfRange`
  - 위약금 경계: 0·10,000,000 통과, -1·10,000,001·0.5 → `OutOfRange`
  - 없는 요금제 ID → `UnknownPlan`
- **C5** 예 + 위약금 빈 칸 → `Unknown`, 적용 위약금 = 평균 위약금, 보전액 = min(평균, 한도)
- **C6** 요금제는 있지만 기준표에 없음 → `PlanNotInRateTable` (거절 아님)
- **C7** 기준표 버전은 만든 뒤 고칠 수 없음(값 변경 시도가 반영되지 않음). 같은 입력을 v1·v2로 계산하면 각 버전 값으로 나오고, 계산기 유스케이스·Port 두 메서드가 같은 공식 결과를 냄
- **C8** 요금제 비교 카드 금액 = 기본 지원금 = 같은 요금제를 약정 아니요로 계산한 합계

### catalog — 유스케이스·Port (`application/*.test.ts`, `infra/*.test.ts`)
- 계산기 계산 유스케이스: 전부 빈 입력 → 거절, 정상 입력 → `Calculated`
- 요금제 비교 조회: 현재 버전의 요금제와 카드 금액 목록 (기준표에 없는 요금제는 "지원금 상담 시 안내" 표시용으로 금액 없음)
- `calculateRewardWithVersion`: 없는 버전 → `UnknownRateTableVersion`

### application — 도메인 (`src/modules/application/domain/*.test.ts`)
- **A1** 이름·전화번호·동의 누락 각각 거절. 선택 항목 없이 통과. 동의 시각 기록. 전화번호 `010-1234-5678` = `01012345678`. 10자리·11자리 통과, 9자리·12자리·`02`로 시작 → 거절
- **A6** 허용 전이 3가지 통과. `접수→개통완료`, `상담중→접수`, `개통완료→취소`, `취소→상담중` 거절. 같은 상태 요청 → 변화 없음, 이벤트 없음
- **A7** 상태 변경 기록에 `counselorId`와 시각
- **A8** 가린 번호 `010-****-5678` 형식, 뒷자리 4자리 검색

### application — 유스케이스 (`src/modules/application/application/*.test.ts`)
- **A2** 계산 입력 있음 → 스냅샷 저장(서버 계산값, 클라이언트 금액 무시). 전부 빈 입력 → 스냅샷 없이 접수. C6 → 스냅샷 없이 접수. `PartialInput`·`OutOfRange`·`UnknownPlan` → 접수 거절
- **A3 경계** 마지막 접수 뒤 167:59:59.999 → 합침 / 168:00:00.000 → 새 접수. 기존이 `개통완료`·`취소` → 새 접수. 합치면 창이 다시 시작됨
- **A4**
  - `접수` 합침: 이름·지역·시간대·동의 시각 갱신, 선택 항목 빈 칸이면 기존 유지. 계산 입력 빈 칸 → 스냅샷 유지, 입력 있음 → 재계산, C6 → 스냅샷 삭제
  - `상담중` 합침: 연락처만 갱신, 스냅샷 유지. 계산 입력이 틀리면 거절
  - `visitorId`·배정 변형 유지, 상태 유지, 재접수 횟수 +1, `ApplicationMerged` 발행
  - 응답 문구 두 가지, 기존 접수 내용 미포함
- **A5** 같은 번호 동시 접수 2건(`Promise.all`) → 새 접수 1, 합침 1
- **A9** `ExperimentPort` 결과 A/B/Excluded 그대로 기록, `null` → `Excluded`. `ApplicationSubmitted` payload에 개인정보 없음(P1)
- 상태 변경 유스케이스 → `ConsultationStarted`·`LineActivated`·`ApplicationCancelled` 발행
- **A8** 목록·상세에 가린 번호만, 열람 유스케이스는 원래 번호와 열람 기록(누가, 언제)
- `ApplicationPort.findEstimateSnapshot`: `Found` / `NoSnapshot` / `ApplicationNotFound`

### shared/infra
- 메모리 이벤트 버스: 구독한 타입의 이벤트만 받음, 구독자 여러 명

## 범위 밖
- SQLite/Drizzle 저장소, 라우트·화면, 조립 위치 (T-G3/G4)
- `reward`·`experiment` 구현 (T-G2). 테스트에서는 `ExperimentPort` 가짜 구현을 씁니다
- 합침 이력 기록, 같은 상태 요청 기록, 공식 버전 관리 (ADR 후속 과제, 이번에는 하지 않음)
- 의존성 추가 (필요하면 먼저 Orchestrator에게 알림)

## 완료 기준
1. C1~C8, A1~A9 정책마다 테스트 1개 이상, 테스트 이름에 정책 번호
2. `npm run check` 통과, `테스트 실행 N / 통과 N`을 출력에서 읽어 보고 (N ≥ 1)
3. Checker PASS (높음 0건)
