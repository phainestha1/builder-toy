# T-G3 M5 고객 화면 01~04 + 퍼널 E2E
- 담당 BC / 수정 가능 경로: 조립, 고객 화면, `catalog`(ports 제외) / `src/composition/**`, `src/app/**`(`/admin`, `/api/auth` 제외), `src/components/**`, `src/proxy.ts`, `src/modules/catalog/**`(ports 제외), `e2e/**`, `playwright.config.ts`, `package.json`의 scripts, `docs/checklists/T-G3.md`
- 계약 버전: contract-v1 (main `1804d9d`)
- 기준: `docs/screens.md`(Figma `VKhka0fEffMIDhOA0hgfHc`), `docs/glossary.md`, ADR 0001(2절 연결, E1~E5, C4·C6·C8, A1·A2·A4), `.claude/rules/architecture.md`(조립 위치)·`frontend.md`·`testing.md`
- PR 두 번: 1단계(조립 + Playwright 설정) → 2단계(화면 01~04 + 퍼널 E2E). 2단계 PR의 base는 1단계 브랜치가 머지된 `main`

## 합의한 요구사항
### 1단계 — 조립 위치 (화면 없음)
- `src/composition/`에 BC별 파일 4개: `catalog.ts`, `experiment.ts`, `application.ts`, `reward.ts`
  - 각 파일은 `create<Bc>(deps)` 팩토리와, 팩토리로 만든 `globalThis` 싱글턴을 함께 내보냅니다. 테스트는 팩토리로 새 인스턴스를 만듭니다.
  - 저장소는 메모리 구현(catalog는 `createSeedCatalogRepository()`로 기준표 v1 시드).
  - Port 연결: `application` ← `CatalogPort`, `ExperimentPort` / `reward` ← `ApplicationPort`, `CatalogPort`.
  - 이벤트: 공용 `eventBus`(`event-bus.ts`)를 각 BC의 `EventPublisher`로 넣습니다.
  - 구독: `experiment.ts`에서 `ApplicationSubmitted` → `handleApplicationSubmitted`, `reward.ts`에서 `LineActivated` → `handleLineActivated`.
- `src/composition/index.ts`가 4개 파일을 모두 import해서, 라우트가 어느 유스케이스를 쓰든 구독 두 개가 등록되게 합니다. 라우트는 `@/composition`에서만 가져옵니다.
- 핫 리로드 때 구독이 두 번 붙지 않도록 등록 여부를 `globalThis`에 표시합니다.
- 주입값: 시계 `() => new Date()`, 접수 ID `crypto.randomUUID()`, 변형 선택 `Math.random() < 0.5 ? "A" : "B"`.
- `playwright.config.ts`: `e2e/` 폴더, chromium 하나, `webServer`로 `npm run dev`를 띄웁니다. 포트는 `E2E_PORT`(기본 3000)이고, Builder B와 동시에 돌릴 때는 포트를 바꿔 씁니다. 로컬에서는 이미 떠 있는 서버를 다시 씁니다.
- `package.json` scripts에 `"test:e2e": "playwright test"`를 추가합니다. `check`에는 넣지 않습니다(느림). 새 의존성은 없습니다(`@playwright/test` 설치됨, 브라우저 캐시 있음).
- 1단계 E2E: `e2e/smoke.spec.ts` 하나(`/`가 열리는지). E2E 0건으로는 설정을 확인할 수 없어서 둡니다.

### 2단계 — 화면 01~04
| 경로 | 화면 | 서버에서 하는 일 |
|---|---|---|
| `/` | 01 랜딩 | 배정 확인(`Landing`) → 노출 기록 → 변형 문구 |
| `/plans` | 02 요금제 비교 | 배정 확인(`PlanComparison`) → `listPlanComparison` |
| `/calculator` | 03 지원금 계산기 | 배정 확인(`Calculator`). 계산은 서버 액션: `estimateReward` → 결과를 `recordRewardEstimated`에 그대로 넘김 |
| `/apply` | 04 상담 접수 | 배정 확인(`Application`) → 계산 입력이 쿼리에 있으면 `estimateReward`로 요약 카드. 접수는 서버 액션 `submitApplication` → 같은 화면에 완료 표시 |

- 화면 문구와 구조는 `docs/screens.md`의 After를 따릅니다. 픽셀까지 맞추지 않습니다.
- 03 → 04는 계산 입력 4개를 쿼리스트링으로 넘깁니다(금액은 넘기지 않음, A2). 04의 [수정]은 같은 입력으로 03으로 돌아갑니다.
- 02 [이 요금제로 계산하기] → `/calculator?planId=...`.
- `visitorId`: `src/proxy.ts`가 고객 경로에서 쿠키가 없으면 UUID를 만들어 응답 쿠키와 요청 헤더에 함께 넣습니다(첫 요청에서도 같은 값). matcher에서 `/admin/**`, `/api/auth/**`, 정적 파일(`/_next/**` 등)은 뺍니다. 라우트는 요청 헤더 → 쿠키 순으로 읽습니다.
- `catalog` 수정(2단계): `Plan`에 `speed`(`"100M" | "500M" | "1G"`)와 `includesTv`(boolean)를 추가하고, 시드 5개에 값을 채우고, `PlanComparisonCard`에 두 값을 담습니다. `CatalogPort`와 다른 ports는 바꾸지 않습니다. 바꿔야 하면 멈추고 알립니다.

## 결정과 근거
| 결정 | 근거 |
|---|---|
| 구독 등록을 `composition/index.ts`로 모읍니다 | `reward.ts`가 `application.ts`의 저장소(ApplicationPort)를 써서, `application.ts`가 `reward.ts`를 import하면 순환이 생깁니다. 라우트가 `index.ts`만 쓰면 구독이 빠지는 일이 없습니다 |
| 계산 기록 여부는 `experiment`의 `recordRewardEstimated`가 판단합니다. 라우트는 `catalog` 결과를 그대로 넘깁니다 | ADR 후속 과제(라우트 vs 유스케이스). T-G2가 이미 유스케이스에서 판단하게 만들었습니다 |
| 전환은 화면이 기록하지 않습니다. 접수 서버 액션은 `submitApplication`만 부릅니다 | frontend.md, E5 |
| 배정 변형이 `Excluded`면 A안 문구를 보여 줍니다 | E2, screens.md 01 예외 |
| 03의 계산·검증·금액은 모두 서버(`catalog`)가 정합니다. 클라이언트는 약정 "아니요"일 때 입력칸을 숨기는 일만 합니다 | frontend.md: 정책 로직을 컴포넌트에 두지 않음 |
| 03 결과 표시: `Calculated` → 기본 지원금 + 위약금 보전액 = 합계. 입력한 위약금 > 위약금 보전액이면 "최대 30만 원까지 보전돼요". `PlanNotInRateTable` → "지원금 상담 시 안내", 접수 버튼 숨김. `Rejected(OutOfRange)` → 입력칸 오류, 결과 숨김. `PartialInput`·`EmptyInput` → 빠진 칸 안내, 결과 숨김 | screens.md 03 예외, C4·C6 |
| 04 접수 버튼은 전화번호 형식(01로 시작 10~11자리, 하이픈 허용)과 필수 동의를 클라이언트에서 확인해 비활성화합니다. 최종 판단은 서버(A1)입니다 | screens.md 04 예외(버튼 비활성). 화면 편의용 검사이고 서버 거절도 화면에 표시합니다 |
| 04 결과: `Submitted` → 완료 화면에 서버가 계산한 예상 지원금(A2, 요약 카드와 달라도 이 값). `Merged` → 유스케이스의 `message` 그대로(A4의 두 문구). `Rejected` → 사유별 입력칸 오류 | A2·A4, 배정 메시지의 "합침 문구" |
| 04에 계산 입력이 없으면 요약 카드 대신 [지원금 먼저 계산해 보기] 링크. 접수는 계산 없이 진행 | screens.md 04 예외, A2 |
| 04 요약 카드가 `PlanNotInRateTable`이면 금액 대신 "지원금 상담 시 안내" | C6 |
| 02 정렬: 예상 지원금 높은 순, 금액 없는 요금제(C6)는 맨 뒤. 0건이면 "조건에 맞는 요금제가 없어요"와 [필터 초기화] | screens.md 02 |
| 01 문구는 Figma 그대로(A "최대 45만 원 받아요", B "위약금까지 보전해 드려요") | 데모 문구. 시드 금액과의 차이는 범위 밖 |
| 화면 문구 용어: "접수", "지원금", "예상 지원금", "위약금 보전액", "기본 지원금". "신청", "캐시백"은 쓰지 않습니다 | glossary, frontend.md |

| `visitorId` 쿠키는 `src/proxy.ts`에서 발급합니다. `/admin/**`, `/api/auth/**`는 matcher에서 뺍니다 | 서버 컴포넌트는 쿠키를 쓸 수 없습니다. Orchestrator 확인(2026-10-05). Builder B는 middleware를 쓰지 않아 겹치지 않습니다 |
| 02 필터 값은 `catalog`의 `Plan` 필드(`speed`, `includesTv`)로 두고 요금제 비교 조회 결과에 담습니다. 요금제 이름을 해석하지 않습니다 | 이름 해석은 데이터가 바뀌면 깨지기 쉽습니다. Orchestrator 확인(2026-10-05). ports 밖이라 계약 변경이 아닙니다 |

## 테스트 케이스
### 1단계 — 조립 (`src/composition/composition.test.ts`, Vitest)
- 팩토리로 새 버스와 4개 BC를 조립하고:
  - 랜딩 방문자 `v-1` 배정 확인 → `A` 또는 `B`. 그 방문자가 계산 입력을 넣고 접수 → `ApplicationSubmitted` 발행 → `experiment`에 전환 1건, 변형은 배정 값과 같음 (E5)
  - 03으로 처음 온 방문자 `v-2` → `Excluded`, 접수하면 전환이 `Excluded` 표시로 기록 (E1·E2)
  - 접수 → 상담중 → 개통완료 → `reward`에 `산정됨`, 금액 = 접수 스냅샷 합계, `RewardCalculated` 발행 (R1·R2)
  - 계산 없이 접수한 건을 개통 → `산정 대상 아님`, `RewardCalculated` 없음 (R3)
  - 구독 등록 함수를 두 번 불러도 핸들러는 한 번만 실행 (핫 리로드 대비)
- 싱글턴: `@/composition`을 두 번 가져와도 같은 인스턴스

### 1단계 — E2E (`e2e/smoke.spec.ts`)
- `/` 응답 200, 제목 "아정당 미니"

### 2단계 — catalog (Vitest)
- 시드 요금제 5개에 `speed`·`includesTv`가 있고, `listPlanComparison` 카드에 그대로 담긴다 (예: `plan-1g-tv` → `1G`, `true`)

### 2단계 — 퍼널 E2E (`e2e/funnel.spec.ts`, 1개)
- 새 브라우저 컨텍스트(쿠키 없음) → `/` 랜딩: A안 또는 B안 문구 중 하나가 보이고 [내 지원금 계산하기]가 있음
- [내 지원금 계산하기] → `/calculator`: 요금제 "인터넷 500M" 선택, 약정 남음 "네", 남은 개월 12, 위약금 비움 → 결과 "기본 지원금 400,000원 + 위약금 보전액 200,000원 = 600,000원"(시드 v1, 평균 위약금 20만 원)
- [이 금액으로 상담 접수하기] → `/apply`: 요약 카드에 600,000원
- 이름, 전화번호(테스트마다 다른 번호), 개인정보 동의 → [접수하기] → 완료 화면에 "접수" 완료 문구와 600,000원
- (같은 테스트 안에서) 랜딩 문구가 A안이면 다시 `/`를 열어도 A안 — 재방문 같은 변형 (screens.md 01)

### 2단계 — 화면 확인 (수동, 리뷰 요청에 결과 적음)
- 02: 금액 높은 순, "인터넷 100M"은 "지원금 상담 시 안내"이고 계산 버튼 없음, 필터 0건 문구
- 03: 약정 "아니요" → 개월·위약금 칸 숨김, 합계 = 02 카드 금액(C8) / 개월 37 → 입력칸 오류, 결과 숨김 / 위약금 900,000 → 보전 300,000과 "최대 30만 원까지 보전돼요" / 100M → "지원금 상담 시 안내", 접수 버튼 숨김
- 04: 계산 없이 진입 → [지원금 먼저 계산해 보기] / 같은 번호로 다시 접수 → "이미 접수된 상담이 있어요. 새 내용으로 업데이트했어요" / 전화번호 형식 오류·동의 안 함 → 버튼 비활성

## 범위 밖
- SQLite/Drizzle 연결 (후속 작업). 저장소는 메모리라서 서버를 다시 띄우면 데이터가 사라집니다.
- `/admin`, `/api/auth`, 상담원 어드민 화면 (T-G4)
- `catalog` 밖의 BC 코드 수정과 ports 수정. 필요하면 멈추고 알립니다.
- 계약 파일 수정
- 지표 집계 화면 (M7)
- 픽셀 단위 디자인 일치

## 완료 기준
- 1단계: `npm run check` 통과(테스트 실행 N / 통과 N, N은 main의 기존 건수 + 조립 테스트), `npm run test:e2e` 실행 1 / 통과 1, PR 1개
- 2단계:
  1. `npm run check` 통과 (`테스트 실행 N / 통과 N`)
  2. 퍼널 E2E 통과 (`npm run test:e2e`, 실행 건수 보고)
  3. 화면 4개가 screens.md After와 핵심 예외(C6 "지원금 상담 시 안내", 일부 입력 거절, 합침 문구)를 반영
  4. Checker PASS (높음 0건)
