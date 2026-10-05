# T-G4 M6 상담원 어드민 05 + 로그인
- 담당 BC / 수정 가능 경로: `shared`(어드민 인증), 화면 05. `src/app/admin/**`, `src/app/api/auth/**`, `src/modules/shared/infra/auth/**`, `src/composition/auth.ts`, `e2e/admin*.spec.ts`, `docs/checklists/T-G4.md`
  - 가져다 쓰기만 함(고치지 않음): `src/composition/application.ts`·`reward.ts`(A가 T-G3 1단계로 만듦), `playwright.config.ts`(A)
- 계약 버전: contract-v1 (계약 파일은 고치지 않음)

## 합의한 요구사항
1단계 (지금 바로)
- next-auth v4 credentials 로그인. 상담원 계정과 `counselorId`의 주인은 `shared/infra/auth`.
- 시드 상담원 계정 [가정], 메모리(코드 상수)에 둔다.
- `/admin` 아래 보호 경로는 서버 레이아웃에서 `getServerSession`으로 확인하고, 없으면 `/admin/login`으로 보낸다. 서버 액션·라우트 핸들러도 각자 세션을 다시 확인한다(레이아웃만 믿지 않음).
- 어드민 레이아웃: 왼쪽 메뉴(접수 관리, 지원금 지급), 상단에 로그인한 상담원 이름과 로그아웃.

2단계 (A의 조립 PR 머지 뒤 `git merge origin/main`)
- 접수 관리(`/admin/applications`): 상태 탭(전체/접수/상담중/개통완료/취소), 뒷자리 4자리 검색, 목록 열(접수번호, 접수일, 고객(번호 가림), 요금제, 예상 지원금, 변형, 상태), "재접수 N회" 뱃지.
- 상세 패널(`?id=` 쿼리로 같은 화면 오른쪽에 표시): 고객·요금제·실험 변형, 가린 번호와 [보기], 상태 변경 버튼 3개(상담 시작, 개통 완료, 취소), 지원금 영역(산정액·지원금 상태·[지급 처리]).
- 지원금 지급(`/admin/rewards`): `개통완료` 접수만 모아 지원금 상태와 [지급 처리]를 보여 준다.
- 목록은 `application` 조회와 `reward` 조회를 접수 ID로 붙인다(ADR 2절). 예상 지원금 = 스냅샷 값, 산정액·지원금 상태 = `reward` 값.

3단계
- 상태 전이 E2E 1개: 로그인 → 시드 접수 하나를 상담 시작 → 개통 완료 → 지급 처리 → 화면에 `지급완료`.

## 결정과 근거
| 항목 | 결정 | 근거 |
|---|---|---|
| 로그인 위치 | `/admin/login`(보호 밖). 보호 경로는 route group `src/app/admin/(protected)/layout.tsx`에서 세션 확인 | 수정 가능 경로 안에서 해결. `middleware.ts`는 경로 밖이라 쓰지 않음 |
| 시드 계정 [가정] | `counselor1` / 비밀번호 `counselor1-pass`, 이름 "김상담", `counselorId` = `counselor-1`. 2번째 계정 `counselor2`도 둔다(열람 기록에 누가 봤는지 구분용) | 연습 범위, 계정 관리 화면은 범위 밖 |
| 비밀번호 저장 | Node `crypto.scrypt` 해시 + `timingSafeEqual`. 새 패키지 없음 | package.json 변경을 피함 |
| 세션 | JWT 세션, `session.user`에 `counselorId`·이름. `NEXTAUTH_SECRET`이 없으면 개발(`NODE_ENV !== "production"`)에서만 고정 값을 쓴다 [가정]. 이 값은 **개발 전용**이라고 코드 주석에도 적는다. production에서 시크릿이 없으면 오류로 멈춘다 | 로컬 실행만 |
| `counselorId` 전달 | 서버 액션이 `requireCounselor()`(composition/auth.ts)로 세션에서 꺼내 유스케이스 인자로 넘김. 폼으로 받은 `counselorId`는 쓰지 않음 | ADR 0001, architecture.md |
| 버튼 활성 규칙 | 화면 표시용 `availableActions(status, rewardStatus)`를 `src/app/admin/(protected)/_lib/`에 둠. 최종 판단은 유스케이스(A6, R5)가 하고, 화면은 거절 결과를 메시지로 보여 줌 | 정책은 도메인에, 화면은 표시만 |
| 개통 전 취소 | 지원금 영역에 "개통 전 취소로 지원금 없음", 지급 버튼 숨김 | screens.md 예외 |
| 번호 [보기] | 서버 액션 `revealPhoneNumber` 호출 결과를 그 상세 패널에만 표시. 새로고침하면 다시 가림 | A8 |
| 화면 문구 | glossary 용어(접수, 상담중, 개통완료, 취소, 지원금, 산정됨, 지급완료, 산정 대상 아님). 상태 값 → 한국어 표시는 화면의 라벨 표 하나로 | glossary |
| E2E 데이터 | 테스트 전용 라우트 `src/app/admin/(protected)/e2e-seed/route.ts`(POST): 로그인 세션 필요 + `NODE_ENV !== "production"`일 때만 동작. `application`의 `submitApplication` 유스케이스로 접수 1건을 만든다(고유한 전화번호, 계산 입력 포함 → 스냅샷 있음) | 고객 화면(A 작업)에 의존하지 않음. 실제 유스케이스를 거쳐 이벤트도 정상 발행 |
| 요금제 이름 | 목록의 "요금제"는 스냅샷의 `planId`로 `catalog` 조회 유스케이스에서 이름을 찾는다. A의 조립에 catalog 조회가 없으면 `planId` 그대로 표시 | src/app은 application 유스케이스만 호출 |
| 확인 | 2026-10-05 Orchestrator가 가정 (1)~(5) 모두 승인 | — |
| Figma 05 반영 (5:21) | 메뉴 아래 "상담원 김상담 · 로그아웃", 탭에 건수("전체 24"), 검색 "이름·전화번호 뒷자리 검색"(4자리 숫자면 전화번호 뒷자리, 아니면 이름), 접수일 MM/DD(한국 시간), 금액 "58만 원", 상태 뱃지. 상세는 고객·전화번호[보기]·요금제·남은 약정·설치 희망 지역·상담 희망 시간·실험 변형("B · 위약금 보전") 행, 버튼 [상담 시작][취소][개통 완료 처리], 지원금은 예상 지원금·지급 상태·[지급 완료 처리] | Orchestrator 요청 (2026-10-05) |
| 개통 전 지급 버튼 | 접수·상담중에서는 [지급 완료 처리]를 비활성으로 보이고 지급 상태를 "개통 전 · 산정 대기"로 쓴다. 숨기는 것은 개통 전 취소와 산정 대상 아님뿐이다 | Figma 05가 개통 전에도 버튼을 보여 줌. 처음 체크리스트의 "개통 전 숨김"을 고침 |
| 저장소 | 메모리 저장소(globalThis 싱글턴, A의 조립 파일) | 배정 메시지 |

## 테스트 케이스
단위 (Vitest, `src/modules/shared/infra/auth/*.test.ts`)
- 맞는 아이디·비밀번호 → `{ counselorId: "counselor-1", name: "김상담" }`
- 비밀번호 틀림 → `null`
- 없는 아이디 → `null`
- 빈 아이디/빈 비밀번호 → `null`

단위 (Vitest, 시드 라우트 허용 판단 `isE2eSeedAllowed`)
- `NODE_ENV=production` → 세션이 있어도 거절 (Orchestrator 요청: production 차단을 한 번 확인)
- 개발 + 세션 없음 → 거절
- 개발 + 세션 있음 → 허용

단위 (Vitest, `availableActions`)
- `접수` → 상담 시작·취소 활성, 개통 완료 비활성
- `상담중` → 개통 완료·취소 활성, 상담 시작 비활성
- `개통완료`·`취소` → 상태 버튼 모두 비활성 (끝 상태)
- `개통완료` + `산정됨` → 지급 버튼 보임·활성
- `개통완료` + `지급완료` → 지급 버튼 비활성, "지급완료" 표시
- `개통완료` + `산정 대상 아님` → 지급 버튼 숨김
- `취소` → 지급 버튼 숨김(지원금 없음)
- `접수`·`상담중` → 지급 버튼 보이되 비활성 (Figma 05)
- `개통완료`인데 지원금 조회가 아직 없음 → 산정 중, 지급 불가

단위 (Vitest, 표시 형식)
- 580000 → "58만 원", 583500 → "58만 3,500원", 3500 → "3,500원", null → "-"
- 접수일은 한국 시간 MM/DD (UTC 2026-10-04T15:30 → 10/05)

E2E (Playwright, `e2e/admin-status-flow.spec.ts`)
- 로그인 없이 `/admin/applications` → `/admin/login`으로 이동 (서버 리다이렉트)
- 틀린 비밀번호 → 로그인 실패 문구, 어드민 진입 안 됨
- 로그인 → 시드 접수 생성 → 목록에서 선택 → 번호가 `010-****-NNNN` → [상담 시작] → 상태 `상담중` → [개통 완료] → 상태 `개통완료`, 지원금 `산정됨` → [지급 처리] → `지급완료`, 상태 버튼 모두 비활성
  - (한 test 안의 단계로 묶어 "상태 전이 E2E 1개"로 센다. 앞의 두 확인은 같은 파일의 별도 test)

## 범위 밖
- SQLite/Drizzle 연결(후속), 상담원 계정 관리·비밀번호 변경, 로그인 시도 제한
- 열람 기록 조회 화면(기록 저장만 함)
- 상태 되돌리기, 지원금 금액 수정
- 픽셀 단위 디자인 일치(구조·문구만 Figma에 맞춤)
- `package.json`·lock 변경 (필요해지면 먼저 Orchestrator에게 알림)

## 완료 기준
1. `npm run check` 통과 (타입·린트·테스트·아키텍처). `테스트 실행 N / 통과 N`으로 보고
2. 상태 전이 E2E 1개 통과 (Playwright 출력의 실행 건수로 보고)
3. `/admin` 보호 경로는 로그인 없이 접근 불가 (서버 레이아웃 + 서버 액션에서 세션 확인)
4. 화면 05가 screens.md After와 어드민 예외 반영: 역전이 비활성, 개통 전 취소면 지급 숨김, 번호 가림·[보기] 열람 기록, 재접수 N회 뱃지
5. Checker PASS (높음 0건)
