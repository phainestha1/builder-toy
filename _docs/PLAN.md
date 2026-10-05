# 아정당 AI Builder 온보딩 연습 프로젝트 — 플랜

> 작성일: 2026-10-05 · **2026-10-05 고정 (Phase B 완료 시점)**
> 이 문서는 프로젝트의 뼈대를 잡은 최초 기록입니다. **더 이상 고치지 않습니다.** 체크박스와 상태도 갱신하지 않습니다.
> 진척 기록과 특이사항은 [Notion PRD](https://app.notion.com/p/3f0cd1688860812cbcf3e077844dfafd)의 "진행 기록"에, 작업 상태는 `docs/board.md`에, 확정한 결정은 `docs/decisions/`에 남깁니다.
> 근거 자료: `ai_builder_jd.pdf`(채용 공고), `ajd_ai_builder_case.pdf`(이사 서비스 AX 도입기, 아정당 기술 블로그)

---

## 1. 두 문서에서 뽑은 핵심

### JD: AI Builder가 하는 일
| JD 요구 | 연습 프로젝트에서 다룰 방법 |
|---|---|
| 페인포인트 발굴과 제품화 | PRD 1장: 문제 정의, 타깃, 소구점 가설 |
| E2E 실행 (기획→화면→구현→배포→운영) | 기획부터 로컬 완성까지 한 사람이 진행 (배포는 산출물을 본 뒤 결정) |
| 지속적인 A/B 테스트 | 랜딩 소구점 A/B 실험, 노출·전환 이벤트 수집 |
| 비즈니스 성과 책임 (전환율·매출) | 퍼널 대시보드 + SQL로 결과 해석 |
| DB·API·인증·배포 이해 | 실제 DB, REST API, 어드민 인증 (배포는 보류) |
| 정책·예외·운영 프로세스가 얽힌 서비스 구조화 | 지원금 지급 조건, 중복 접수, 약정 위약금 같은 정책을 도메인 규칙으로 정리 |
| (우대) 상담·영업·개통 프로세스, 어드민 | 상담원 어드민, 접수 상태 머신 |

### 사례 글: 아정당이 AI로 서비스를 만드는 방식
1. **용어와 경계를 코드보다 먼저 정한다.** 유비쿼터스 언어(용어 사전)를 만들고, 이벤트 스토밍으로 BC(Bounded Context)를 나눈다.
2. **모듈러 모놀리스.** BC끼리는 **이벤트**로 상태를 바꾸고, 다른 BC의 데이터는 **Port(조회용 인터페이스)**로만 읽는다.
3. **설계 이유는 문서에, 확인할 수 있는 규칙은 테스트에 남긴다.** `shared`가 특정 BC를 참조하면 아키텍처 테스트(ArchUnit)가 실패한다.
4. **스킬 3개로 단계를 나눈다.** `strategy-checklist`(설계, grill-me 질문) → 사람 확인 → 새 세션에서 `tdd-helper`(TDD 구현) → `code-review`(리뷰, 중요한 지적은 별도 검증 에이전트가 다시 확인).
5. **AI 보고를 그대로 믿지 않는다.** "테스트 전체 통과"라는 보고가 오면 실제로 실행된 테스트 수를 확인한다.
6. **경계는 바뀔 수 있다.** 이벤트와 Port로 연결을 좁혀 두면 BC를 나중에 옮기는 비용이 작다.

---

## 2. 연습 프로젝트 정의

### 주제: 「아정당 미니 — 인터넷·TV 가입 상담 신청 서비스」
아정당의 주력 영역(통신 가입 + 생활지원금)을 축소해서 만드는 서비스예요. 사례 글의 이사/청소 도메인을 그대로 베끼지 않으면서, JD 우대 항목인 **상담·개통 프로세스**와 **정책·예외 케이스**를 모두 담을 수 있어서 골랐어요.

**고객 흐름:** 랜딩(소구점 A/B) → 요금제 비교 → 지원금 계산 → 상담 접수 → (상담원) 상담 → 개통 → 지원금 지급

**페인포인트 가설 (PRD에서 검증할 내용)**
- 고객은 "그래서 나는 얼마를 받는지"를 빨리 알고 싶다 → 지원금 계산기를 첫 화면 가까이에 둔다.
- 약정이 남은 고객은 위약금 때문에 이탈한다 → 위약금 보전 안내를 소구점 B로 실험한다.

### 범위
**포함 (MVP)**
- 고객 웹: 랜딩, 요금제 비교, 지원금 계산기, 상담 접수 폼
- 상담원 어드민: 로그인, 접수 목록과 상태 변경, 개통 처리, 지원금 지급 처리
- 실험과 분석: A/B 배정, 이벤트 수집, 퍼널 대시보드
- AI 작업 체계: 용어 사전, BC 설계 문서, 아키텍처 테스트, 스킬 3개

**제외**
- 배포 (로컬에서만 작업하고, 산출물을 본 뒤 결정)
- LLM 기능
- 실제 결제와 송금 (지급은 "지급 완료" 상태 기록으로 대체)
- 실제 통신사 연동 (요금제는 시드 데이터로 대체)
- 본인인증, SMS 발송 (콘솔 로그나 목업으로 대체)

---

## 3. 도메인 설계 (코드 작성 전에 확정할 부분)

### 3.1 유비쿼터스 언어 (초안)
| 용어 | 정의 | 쓰지 않는 말 |
|---|---|---|
| 접수 (Application) | 고객이 남긴 상담 요청 1건 | 신청, 리드, 문의 |
| 요금제 (Plan) | 통신사·속도·TV 조합과 월 요금 | 상품 |
| 상담 (Consultation) | 상담원이 접수 1건을 처리하는 과정 | 콜 |
| 개통 (Activation) | 실제 회선 설치 완료 | 설치 |
| 지원금 (Reward) | 개통 후 조건을 채우면 지급하는 현금 | 사은품, 캐시백 |
| 실험 (Experiment) / 변형 (Variant) | A/B 테스트와 그 안의 A·B안 | 버전 |

### 3.2 Bounded Context
| BC | 책임 | 주요 이벤트 |
|---|---|---|
| `catalog` | 요금제 조회, 지원금 기준표 | — |
| `application` | 접수 생성, 중복 검사, 상태 | `ApplicationSubmitted` |
| `consultation` | 상담 배정, 상담 결과, 개통 처리 | `ConsultationCompleted`, `LineActivated` |
| `reward` | 지원금 산정, 지급 조건 확인, 지급 | `RewardScheduled`, `RewardPaid` |
| `experiment` | 변형 배정, 노출·전환 이벤트 기록 | `ExposureLogged`, `ConversionLogged` |
| `shared` | 공통 타입, 이벤트 버스, DB 연결 같은 기술 인프라만 | — |

### 3.3 정책·예외 케이스 (테스트로 옮길 규칙 예시)
- 같은 전화번호로 7일 안에 다시 접수하면 새로 만들지 않고 기존 접수에 합친다.
- 지원금은 **개통 이벤트를 받은 뒤에만** 산정한다. 개통 전에 취소하면 지급하지 않는다.
- 약정이 남은 고객은 위약금 보전액을 지원금에 더하되, 상한을 둔다.
- 접수 상태는 `접수 → 상담중 → 개통완료 / 취소`로만 바뀐다. 거꾸로 가는 전이는 막는다.
- 한 사용자는 실험 1개에 대해 항상 같은 변형을 받는다 (고정 배정).

### 3.4 아키텍처 규칙 (자동 검사)
- `shared`는 어떤 BC도 import하지 않는다.
- BC끼리는 상대 BC의 `domain`이나 `infra`를 직접 import하지 않고, `ports`와 이벤트만 쓴다.
- `dependency-cruiser` 규칙으로 검사하고, 위반하면 CI가 실패한다. (Java의 ArchUnit에 해당)

---

## 4. 기술 스택 (확정)

TypeScript 기반으로 진행하고, 로컬에서만 실행합니다.

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript | 고객 웹, 어드민, API를 한 저장소에서 다루기 좋음 |
| DB | SQLite + Drizzle ORM | 로컬 파일 DB로 가볍게 시작. 배포를 정하면 Postgres로 옮길 수 있음 |
| 인증 | 어드민만 세션 기반 로그인 (Auth.js credentials) | JD의 "인증 이해" 연습 |
| 테스트 | Vitest (도메인·API), Playwright (핵심 퍼널 E2E 1~2개) | TDD 연습 |
| 아키텍처 검사 | dependency-cruiser | 사례 글의 ArchUnit 역할 |
| 분석 | 자체 `events` 테이블 + SQL 대시보드 | SQL로 실험 결과를 직접 해석하는 연습 |
| 품질 게이트 | 로컬 `npm run check` (타입 검사 + 린트 + 테스트 + 아키텍처 검사) | 배포가 없으니 CI 대신 로컬 스크립트로 같은 검사를 함 |
| 기획·디자인 | `ajd:planning` 스킬 → Notion PRD, `ajd:design` 스킬 → Figma 화면 설계 | 설치된 아정당 스킬로 기획·디자인 단계를 진행 |

---

## 5. 저장소 구조 (예정)

```
herdr_worktree_practice/
├─ CLAUDE.md                 # 프로젝트 전체 조망: 진실의 원천, 역할, 작업 흐름, 규칙
├─ _docs/                    # 원본 PDF, 이 플랜
├─ docs/
│  ├─ prd.md                 # Notion PRD 링크와 요약 (원본은 Notion)
│  ├─ screens.md             # Figma 링크와 화면 목록 (원본은 Figma)
│  ├─ glossary.md            # 유비쿼터스 언어 (계약)
│  ├─ design/                # 사람이 읽는 설계 논의와 대안
│  ├─ decisions/             # AI가 참조하는 확정 결정 (ADR)
│  ├─ checklists/            # 작업별 설계 체크리스트 (strategy-checklist 산출물)
│  └─ board.md               # 멀티 세션 작업 보드 (작업·담당·상태·완료 기준)
├─ .claude/
│  ├─ settings.json          # 훅 등록, 권한 (push·merge·tag는 확인)
│  ├─ roles/                 # orchestrator / builder / checker 역할 지침
│  ├─ skills/
│  │  ├─ strategy-checklist/ # 설계: 자료 확인 → 질문 → 체크리스트 → 멈춤
│  │  ├─ tdd-helper/         # 구현: 실패 테스트 → 구현 → 리팩터 → 실행 건수 확인
│  │  ├─ domain-review/      # 리뷰: 관점별 서브에이전트 → finding-verifier 재확인
│  │  └─ event-storming/     # Phase D: 이벤트·BC·용어 도출
│  ├─ agents/                # arch-reviewer / test-reviewer / security-reviewer / finding-verifier
│  ├─ commands/              # /role /board /assign /verify /merge /review-request /contract-change
│  ├─ rules/                 # 경로별 규칙: architecture / contracts / testing / frontend / docs
│  └─ hooks/                 # session-context / guard-contracts / guard-git / check-test-count
├─ src/
│  ├─ app/                   # Next.js 라우트 (고객, 어드민, API)
│  └─ modules/
│     ├─ shared/
│     ├─ catalog/  application/  consultation/  reward/  experiment/
│     │  └─ (domain / application / ports / infra)
└─ e2e/  .dependency-cruiser.cjs
```

---

## 6. 단계별 진행 (마일스톤)

각 기능 단위는 **strategy → (내가 확인) → 새 세션에서 tdd-helper → domain-review** 순서로 진행합니다. M0~M3은 한 세션에서 순서대로 진행하고, 계약이 확정된 뒤 M4부터 세션 4개가 git worktree를 나눠 병렬로 작업합니다. 운영 방식은 8절, 실행 순서는 9절에 정리했습니다.

| 단계 | 내용 | 산출물 | 연결된 JD 역량 |
|---|---|---|---|
| **M0. 기획** | `ajd:planning` 스킬로 페인포인트 발굴, 타깃, 소구점 가설, 성공 지표(접수 전환율), 프로토타입 방향 정의 | Notion PRD, `docs/prd.md`(링크와 요약) | 페인포인트 발굴 |
| **M1. 화면 설계** | `ajd:design` 스킬로 Notion PRD 기반 화면 흐름과 Before/After 설계, Figma 작업 | Figma 화면, `docs/screens.md` | 화면 설계 |
| **M2. 도메인 설계** | 이벤트 스토밍, 용어 사전, BC, 정책 목록 확정 | `glossary.md`, `design/`, `decisions/` | 복잡한 서비스 구조화 |
| **M3. AI 작업 체계** | CLAUDE.md, `.claude` 체계 검증, dependency-cruiser 규칙, `npm run check` | `.claude/`, 로컬 검사 통과 | AI 결과물을 잘 다루기 |
| **M4. 핵심 도메인** | `catalog`, `application`, `reward` 도메인 로직을 TDD로 구현, 이벤트 버스 | 단위 테스트, 아키텍처 테스트 통과 | DB·API 이해 |
| **M5. 고객 화면** | M1의 Figma 설계대로 랜딩, 요금제 비교, 지원금 계산기, 접수 폼 구현 | 퍼널 E2E 테스트 1개 | 화면 구현 |
| **M6. 어드민** | 로그인, 접수 목록, 상담·개통·지급 처리 | 상태 전이 E2E 1개 | 어드민·운영 도구 |
| **M7. 실험과 분석** | A/B 배정, 이벤트 수집, 퍼널 대시보드, 결과 해석 SQL | 실험 리포트 1장 | A/B 테스트, SQL |
| **M8. 회고와 배포 결정** | 경계를 다시 나눌 곳, 검증 단계 비용 대비 효과 정리. 산출물을 보고 배포 여부와 방식 결정 | `docs/retro.md` | 다음 할 일 주도 |

> 배포와 LLM 기능은 이번 범위에서 뺐습니다. 배포는 M8에서 산출물을 확인한 뒤 결정합니다.

**완료 기준 (모든 단계 공통)**
- 테스트는 "통과했다"는 보고가 아니라 **실행 건수와 통과 건수를 함께** 기록한다.
- 아키텍처 검사가 통과한다.
- 확정한 결정은 `docs/decisions/`에 남긴다.

---

## 7. 확정한 결정 (2026-10-05)

| # | 항목 | 결정 |
|---|---|---|
| 1 | 주제 | 인터넷·TV 가입 상담 + 지원금 |
| 2 | 스택 | TypeScript 기반 (Next.js + SQLite/Drizzle + Vitest + Playwright) |
| 3 | 배포 | 로컬에서만 작업. 배포는 산출물을 본 뒤 M8에서 결정 |
| 4 | LLM 기능 | 제외 |
| 5 | 기획·디자인 | 설치된 `ajd:planning`(M0, Notion PRD), `ajd:design`(M1, Figma) 스킬 사용 |
| 6 | 작업 방식 | herdr 세션 4개가 역할을 나눠 협업 (8절) |

---

## 8. 멀티 세션 운영

### 8.1 원칙
병렬 작업을 가능하게 하는 건 에이전트 수가 아니라 아래 4가지 구조입니다. 사례 글의 BC, 이벤트와 Port, ArchUnit, 별도 검증 에이전트를 세션 단위로 확장한 것입니다.

| 원칙 | 의미 | 이 프로젝트에서 |
|---|---|---|
| Scope 격리 | 작업자마다 건드리는 범위가 겹치지 않음 | 세션마다 git worktree와 담당 BC를 따로 줌 |
| Contract로 경계를 닫음 | 서로 맞물리는 부분은 미리 고정 | 이벤트, Port, 용어 사전을 먼저 확정하고 잠금 |
| Contract를 안 건드리면 자율 실행 | 승인 없이 끝까지 실행해도 되는 조건이 명확 | 계약 파일 수정은 훅으로 차단하고, 나머지는 auto 모드 |
| Maker와 Checker 분리 | 만든 쪽이 자기 숙제를 채점하지 않음 | Checker는 구현 맥락 없이 diff와 규칙만 봄 |

### 8.2 역할 (herdr 워크스페이스 `w3`)
| 세션 | 역할 | 작업 위치 | 하는 일 | 하지 않는 일 |
|---|---|---|---|---|
| `w3:p1` | **Orchestrator** | `main` | PLAN·계약 관리, 작업 배분, 보드 관리, 머지 | 기능 코드 작성 |
| `w3:p5` | **Builder A** | worktree `feat/a-*` | 담당 BC 구현 (strategy → tdd-helper) | 계약 파일 수정, 다른 BC 수정 |
| `w3:p6` | **Builder B** | worktree `feat/b-*` | 담당 BC 구현 (strategy → tdd-helper) | 계약 파일 수정, 다른 BC 수정 |
| `w3:p8` | **Checker** | 리뷰 대상 브랜치 (읽기 전용) | domain-review, `npm run check`, 테스트 실행 건수 검증 | 코드 수정 |

### 8.3 계약 (Contract)과 잠금
- **계약 파일:** `docs/glossary.md`, `src/modules/shared/events/**`, `src/modules/*/ports/**`
- **잠금:** Builder 세션에서는 PreToolUse 훅(`guard-contracts.sh`)이 계약 파일 수정을 차단합니다.
- **변경 절차:** Builder가 보드에 "계약 변경 요청"을 올립니다. Orchestrator가 검토하고 사용자 승인을 받아 `main`에 반영합니다. 그 뒤 Builder들은 `main`에서 rebase합니다.
- **버전:** 계약을 확정할 때마다 git 태그를 붙입니다 (`contract-v1`, `contract-v2`, …).

### 8.4 소통 채널
| 채널 | 용도 |
|---|---|
| `docs/board.md` | **진실의 원천.** 작업 ID, 담당, 상태(`todo → doing → review → done`), 완료 기준, 계약 변경 요청 |
| herdr (`agent prompt --wait`, `agent read`, `agent wait`) | Orchestrator가 작업을 배정하고, 상대 세션의 상태(idle/working/blocked)와 결과를 확인 |
| SendMessage | 세션끼리 짧게 알리는 보조 채널 ("T-03 리뷰 요청" 같은 알림) |

메시지는 사라지지만 보드는 남습니다. 모든 결정과 결과는 메시지가 아니라 보드에 기록합니다.

### 8.5 작업 한 바퀴
```
Orchestrator  보드에 작업 등록(완료 기준 포함) → Builder에 배정
Builder       strategy → tdd-helper → 자기 worktree에 커밋 → 보드에 "review"
Checker       새 맥락에서 diff + 용어 사전 + 아키텍처 규칙만 보고 검토
              npm run check 실행, 테스트 실행 건수와 통과 건수 기록 → 보드에 PASS/FAIL
Orchestrator  결과 확인 → 사용자 승인 → main 머지 → 다른 Builder에 rebase 알림
```

**Checker 격리 규칙**
- Builder의 대화, 의도 설명, 자체 평가는 넘기지 않습니다.
- 리뷰에서 심각도를 높게 매긴 지적은 Checker가 별도 서브에이전트로 한 번 더 검증합니다.
- "통과했다"는 보고는 받지 않고, 실행 건수가 포함된 결과만 인정합니다.

### 8.6 운영 지표 (M8 회고에서 사용)
- 머지 충돌 수, 계약 변경 요청 수
- Checker가 찾은 실제 결함 수와 오탐 수
- 작업 시작부터 머지까지 걸린 시간, 그중 사람의 승인을 기다린 시간

---

## 9. 액션 플랜

각 Phase 끝의 **⛳ 게이트**에서 사용자 확인을 받은 뒤 다음으로 넘어갑니다.

### Phase A. 준비 — Orchestrator 단독
- [x] A1. 프로젝트 폴더 `git init`, `.gitignore`, 첫 커밋 (PLAN과 PDF 포함)
- [x] A2. `docs/board.md` 골격 작성 (작업 표, 계약 변경 요청 표)
- [x] A3. `.claude/roles/` 역할 지침 3개 초안 (orchestrator, builder, checker)
- [x] A4. 루트 `CLAUDE.md`와 `.claude` 체계 초안 (skills, agents, commands, rules, hooks)
- ⛳ 게이트: 보드 형식과 역할 지침 확인

### Phase B. M0 기획 — Orchestrator + 사용자
- [x] B1. `ajd:planning` 스킬로 페인포인트, 타깃, 소구점 가설, 성공 지표 정의 (Notion 인증 필요할 수 있음)
- [x] B2. Notion PRD 링크와 요약을 `docs/prd.md`에 기록
- ⛳ 게이트: PRD 승인

### Phase C. M1 화면 설계 — Orchestrator + 사용자
- [ ] C1. `ajd:design` 스킬로 PRD 기반 화면 흐름 설계, Figma 작업 (Figma 인증 필요할 수 있음)
- [ ] C2. Figma 링크와 화면 목록을 `docs/screens.md`에 기록
- ⛳ 게이트: 화면 설계 승인

### Phase D. M2 도메인 설계와 계약 확정 — Orchestrator + 사용자
- [ ] D1. 이벤트 스토밍 (PRD와 화면 기준)
- [ ] D2. `docs/glossary.md`, BC 책임, 정책 목록 확정
- [ ] D3. 이벤트 타입과 Port 인터페이스를 TypeScript 타입으로 작성 (구현은 없음)
- [ ] D4. 결정을 `docs/decisions/`에 기록, `contract-v1` 태그
- ⛳ 게이트: 계약 v1 승인 (이후 계약 변경은 8.3 절차를 따름)

### Phase E. M3 AI 작업 체계 — Orchestrator 단독
- [ ] E1. Next.js + TypeScript + Drizzle(SQLite) + Vitest + Playwright 스캐폴딩
- [ ] E2. dependency-cruiser 규칙과 `npm run check` 스크립트
- [x] E3. `CLAUDE.md`와 `.claude`(skills, agents, commands, rules, hooks) 초안 — Phase A 확장 때 먼저 작성, 스캐폴딩 후 경로와 명령을 실제 코드에 맞게 보정
- [ ] E4. 훅 동작 확인: 계약 파일 수정 차단, worktree→main push 차단, 0건 테스트 경고 (모의 입력 테스트는 완료, **실제 세션에서 재확인** 필요)
- [ ] E5. 일부러 규칙을 어긴 코드로 아키텍처 검사가 실패하는지 확인
- ⛳ 게이트: **병렬 운영 착수 승인**

### Phase F. 병렬 운영 시작 — 세션 4개
- [ ] F1. `herdr worktree create`로 Builder A·B용 worktree 생성
- [ ] F2. `w3:p5`, `w3:p6`을 각 worktree 폴더에서 다시 시작하고 역할 지침 전달. `w3:p8`은 Checker 지침 전달
- [ ] F3. herdr 에이전트 이름 지정 (`builder-a`, `builder-b`, `checker`)
- [ ] F4. 시범 작업 1개로 8.5의 흐름을 한 바퀴 돌려 보고, 보드·훅·rebase 절차 점검
- ⛳ 게이트: 운영 방식 확정

### Phase G. 기능 개발 (M4~M7) — 병렬
| 마일스톤 | Builder A | Builder B |
|---|---|---|
| M4 핵심 도메인 | `catalog`, `application` | `consultation`, `reward` |
| M5·M6 화면 | M5 고객 화면 | M6 어드민 |
| M7 실험과 분석 | `experiment` BC, 이벤트 수집 | 퍼널 대시보드, 결과 해석 SQL |

- 모든 작업은 Checker PASS + 사용자 승인 뒤 `main`에 머지합니다.
- ⛳ 게이트: 마일스톤마다 데모 확인

### Phase H. M8 회고와 배포 결정
- [ ] H1. 8.6 운영 지표 정리, 경계를 다시 나눌 곳과 검증 단계의 비용 대비 효과 정리 → `docs/retro.md`
- [ ] H2. 산출물을 보고 배포 여부와 방식 결정

### 아직 정하지 않은 것
- **머지 승인 위임:** 처음에는 모든 머지를 사용자가 승인합니다. M5부터 "계약을 건드리지 않고 Checker가 PASS한 작업"은 Orchestrator가 머지하도록 위임할지 정합니다.
- **Builder 담당 범위:** Phase G 표는 초안입니다. 계약 v1을 확정한 뒤 BC 간 의존도를 보고 다시 나눕니다.

---

승인해 주시면 Phase A부터 시작합니다.
