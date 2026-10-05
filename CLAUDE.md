# builder-toy — 아정당 AI Builder 온보딩 연습 프로젝트

「아정당 미니: 인터넷·TV 가입 상담 + 지원금」 서비스를 기획부터 로컬 완성까지 한 사람이 만드는 프로젝트입니다. herdr 세션 4개가 역할을 나눠 협업합니다. 목표는 아래 두 가지를 직접 해 보는 것입니다.
- JD의 E2E 역량: 기획, 화면, 구현, A/B 테스트, 성과 해석
- 사례 글의 AI 작업 방식: 용어와 경계를 먼저 정하고, 규칙은 테스트로 검사하고, 설계·구현·리뷰를 나누기

## 먼저 읽을 것 (진실의 원천)
| 무엇 | 어디 | 누가 고치나 |
|---|---|---|
| 최초 플랜 (고정, 참고용) | `_docs/PLAN.md` (7절 결정, 8절 운영, 9절 Phase와 게이트) | 아무도 고치지 않음 |
| 진척 기록, 특이사항 | [Notion PRD](https://app.notion.com/p/3f0cd1688860812cbcf3e077844dfafd) "진행 기록" 섹션 | Orchestrator |
| 작업, 담당, 상태, 계약 변경 요청 | `docs/board.md` | Orchestrator만 |
| 용어 (유비쿼터스 언어) | `docs/glossary.md` | 계약 — `contract/*` 브랜치에서만 |
| 확정한 결정 (ADR) | `docs/decisions/` | Orchestrator |
| 작업별 설계 체크리스트 | `docs/checklists/<작업ID>.md` | 담당 Builder |
| 기획 / 화면 | `docs/prd.md` (Notion) / `docs/screens.md` (Figma) | Orchestrator |

보드나 `docs/decisions/`가 이 파일과 다르면 **보드와 decisions가 맞습니다.** 이 파일을 고쳐 달라고 알려 주세요. PLAN은 최초 기록이라, 이후 결정과 다르면 이후 결정을 따릅니다.

## 현재 상태
이 파일에는 진척을 적지 않습니다. 현재 위치는 `/board`로, 지나온 경과와 특이사항은 Notion PRD의 "진행 기록"으로 확인합니다.

## 세션과 역할
세션이 시작되면 `session-context.sh` 훅이 브랜치와 진행 중인 작업을 알려 줍니다. 역할이 정해지지 않았으면 `/role <이름>`으로 지침을 불러옵니다.

| 역할 | herdr | 위치 | 한 줄 요약 | 지침 |
|---|---|---|---|---|
| Orchestrator | `w3:p1` `orchestrator` | 원본 폴더, `docs/*`·`chore/*`·`contract/*` 브랜치 | 계획·계약·배정·PR 머지. 기능 코드는 안 씀 | `.claude/roles/orchestrator.md` |
| Builder A / B | `w3:p5` `builder-a` / `w3:p6` `builder-b` | `feat/*` worktree | 배정받은 BC만 구현 | `.claude/roles/builder.md` |
| Checker | `w3:p8` `checker` | 리뷰 대상 브랜치 | 독립 검증. 코드 수정 안 함 | `.claude/roles/checker.md` |

## 작업 한 바퀴
```
/assign (Orchestrator)
  → strategy-checklist (Builder, 체크리스트 완성 후 멈춤)
  → 확인 → 새 세션에서 tdd-helper → /review-request (Builder, 브랜치 push와 PR)
  → /verify (Orchestrator) → domain-review (Checker)
  → 사용자 승인 → /merge (Orchestrator, PR 머지) → 다른 Builder가 main을 merge
```

## 브랜치와 PR
- **`main`에는 PR 머지로만 반영합니다.** `main`에서 직접 커밋하거나 `main`으로 push하지 않습니다. 훅이 막습니다.
- **브랜치 이름**

  | 누가 | 브랜치 | 무엇 |
  |---|---|---|
  | Orchestrator | `docs/<작업ID>-<요약>` | 문서, 보드 |
  | Orchestrator | `chore/<요약>` | `.claude` 설정, 도구 |
  | Orchestrator | `contract/<작업ID>` | 계약 파일. 이 브랜치에서만 고칠 수 있습니다 |
  | Builder | `feat/a-<작업ID>`, `feat/b-<작업ID>` (worktree) | 기능 구현 |
  | Builder | `contract/<작업ID>` (worktree) | Orchestrator가 배정한 계약 작업만 (예: T-D1 도메인 설계) |
- **작업 하나에 PR 하나.** 앞 PR에 의존하면 base를 앞 브랜치로 두고 쌓습니다.
- **머지는 merge commit으로 합니다** (`gh pr merge --merge`). squash·rebase 머지와 force push는 쓰지 않습니다. 쌓인 PR과 Builder 브랜치가 깨지지 않게 하기 위해서입니다.
- **`main`이 바뀌면** 작업 브랜치는 `git fetch origin && git merge origin/main`으로 따라갑니다. 이미 push한 브랜치는 rebase하지 않습니다.

## 반드시 지킬 것
1. **게이트(⛳)는 사용자만 넘깁니다.** PLAN 9절의 게이트에서는 멈추고 확인을 받습니다.
2. **계약은 `contract/*` 브랜치에서만 고칩니다.** 계약 파일은 `docs/glossary.md`, `src/modules/shared/events/**`, `src/modules/*/ports/**`입니다. 다른 브랜치에서는 훅이 막습니다. Builder는 Orchestrator가 계약 작업을 배정해 `contract/*` worktree를 받았을 때만 고치고, 그 밖에는 `/contract-change`로 요청합니다.
3. **BC 경계를 지킵니다.** 다른 BC와는 이벤트와 Port로만 연결합니다. `shared`에는 특정 BC의 로직을 두지 않습니다. 자세한 규칙은 `.claude/rules/architecture.md`에 있습니다.
4. **테스트 결과는 `실행 N / 통과 N`으로만 보고합니다.** 출력에서 직접 읽은 숫자만 씁니다. 0건이거나 건수가 안 보이면 통과가 아닙니다.
5. **만든 쪽이 채점하지 않습니다.** Checker에게는 브랜치, 작업 ID, 완료 기준만 넘깁니다.
6. **모르면 추측하지 말고 멈춥니다.** 요구사항, 계약, 경계가 모호하면 질문합니다.
7. **worktree는 `herdr worktree create`로 만듭니다.** `EnterWorktree`는 쓰지 않습니다.
8. **외부로 나가는 동작은 확인을 받습니다.** `git push`, 머지, 태그, Notion·Figma 쓰기가 여기에 해당합니다.

## 범위
- **포함:** 고객 웹(랜딩 A/B, 요금제 비교, 지원금 계산기, 접수), 상담원 어드민, 실험·분석
- **제외:** 배포(M8에서 결정), LLM 기능, 실제 결제·송금·통신사 연동·본인인증

## 스택 (Phase E에서 설치)
Next.js(App Router) + TypeScript · SQLite + Drizzle · Auth.js credentials(어드민) · Vitest · Playwright · dependency-cruiser

- `npm run check` = 타입 검사 + 린트 + 테스트 + 아키텍처 검사
- 로컬에서만 실행합니다.

## `.claude` 지도
| 폴더 | 내용 |
|---|---|
| `roles/` | 세션 역할 지침 3개 |
| `skills/` | `strategy-checklist`(설계) · `tdd-helper`(구현) · `domain-review`(리뷰) · `event-storming`(Phase D 도메인 설계) |
| `agents/` | Checker가 쓰는 서브에이전트: `arch-reviewer` · `test-reviewer` · `security-reviewer` · `finding-verifier` |
| `commands/` | `/role` · `/board` · `/assign` · `/verify` · `/merge` · `/review-request` · `/contract-change` |
| `rules/` | 경로별 규칙: `architecture` · `contracts` · `testing` · `frontend` · `docs` |
| `hooks/` | `session-context`(시작 안내) · `guard-contracts`(계약 잠금) · `guard-git`(force push, main 직접 커밋·push, worktree의 main checkout 차단) · `check-test-count`(0건 테스트 경고) |

기획과 디자인 단계에서는 설치된 `ajd:planning`(Phase B), `ajd:design`(Phase C) 스킬을 씁니다.

## 문서와 커밋
- 문서는 한국어로, 쉬운 말로 씁니다.
- 커밋 메시지 형식은 `<type>(<bc>): <요약>`입니다. type은 feat, fix, test, refactor, docs, chore 중 하나입니다.
