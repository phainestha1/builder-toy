# <!-- TODO: 프로젝트 이름 --> — 멀티 세션 작업 체계

<!-- TODO: 프로젝트 소개 2~3줄. 무엇을, 누구를 위해 만드는지 -->

세션 4개(Orchestrator, Builder A, Builder B, Checker)가 역할을 나눠 협업합니다. 용어와 경계(계약)를 먼저 정하고, 규칙은 훅과 테스트로 검사하고, 만드는 쪽과 검증하는 쪽을 나눕니다.

> **처음 쓸 때 채울 것** (다 채우면 이 상자를 지웁니다)
> - [ ] `.claude/project.conf`: `PROJECT_NAME`, `MAIN_BRANCH`, `CHECK_CMD`, `CONTRACT_PATTERNS`, `TASK_ID_PREFIX`
> - [ ] 이 파일의 `TODO` 자리: 프로젝트 이름, 소개, 범위(포함/제외), 스택, 기획·디자인 도구
> - [ ] `bash scripts/test-hooks.sh`가 `실행 N / 통과 N`(N 같음)으로 끝나는지 확인
> - [ ] `docs/board.md`의 온보딩 작업(`T-01`~`T-04`) 확인

## 먼저 읽을 것 (진실의 원천)
| 무엇 | 어디 | 누가 고치나 |
|---|---|---|
| 작업, 담당, 상태, 계약 변경 요청, 후속 과제, 운영 기록, 결정 로그 | `docs/board.md` | Orchestrator만 |
| 용어 (유비쿼터스 언어) | `docs/glossary.md` | 계약 — `contract/*` 브랜치에서만 |
| 계약 파일 목록 | `.claude/project.conf`의 `CONTRACT_PATTERNS` | Orchestrator (`chore/*`) |
| 확정한 결정 (ADR) | `docs/decisions/` | Orchestrator |
| 작업별 설계 체크리스트 | `docs/checklists/<작업ID>.md` | 담당 Builder |
| 기획 / 화면 | `docs/prd.md` / `docs/screens.md` | Orchestrator |
| 설계 논의, 대안 | `docs/design/` | 작성한 세션 |
| Orchestrator 인계 메모 | `.claude/state/handoff.md` (커밋 안 함) | Orchestrator (`/handoff`) |

보드나 `docs/decisions/`가 이 파일과 다르면 **보드와 decisions가 맞습니다.** 이 파일을 고쳐 달라고 알려 주세요.

## 현재 상태
이 파일에는 진척을 적지 않습니다. 현재 위치는 `/board`로, 지나온 결정은 보드의 "결정 로그"로, 작업별 시간과 검증 기록은 보드의 "운영 기록"으로 확인합니다.

## 세션과 역할
세션이 시작되면 `session-context.sh` 훅이 브랜치, 진행 중인 작업, 인계 메모를 알려 줍니다. 역할이 정해지지 않았으면 `/role <이름>`으로 지침을 불러옵니다.

| 역할 | herdr 에이전트 이름 | worktree 이름 | 브랜치 | 한 줄 요약 | 지침 |
|---|---|---|---|---|---|
| Orchestrator | `orchestrator` | 없음 (원본 폴더) | `docs/*`·`chore/*`·`contract/*` | 계획·계약·배정·PR 머지. 기능 코드는 안 씀 | `.claude/roles/orchestrator.md` |
| Builder A | `builder-a` | `builder-a` | `feat/a-*` | 배정받은 구역만 구현 | `.claude/roles/builder.md` |
| Builder B | `builder-b` | `builder-b` | `feat/b-*` | 배정받은 구역만 구현 | `.claude/roles/builder.md` |
| Checker | `checker` | `checker` | `review/*` | 독립 검증. 코드 수정 안 함 | `.claude/roles/checker.md` |

- **worktree는 역할 이름으로 만듭니다.** 작업 ID로 짓지 않습니다. 작업이 바뀌면 같은 worktree 안에서 브랜치만 바꿉니다.
- 세션끼리는 **에이전트 이름**으로 주고받습니다. pane ID는 창을 옮기면 바뀌므로 어디에도 적지 않습니다.
- `/clear` 직후에는 에이전트 이름이 풀립니다. 세션 비우기는 `scripts/reset-session.sh`로 합니다 (이름 다시 붙이기와 `/role`까지 함). 종료 코드(0 완료 / 1 대상·이름 확인 실패 / 2 herdr 없음 / 3 상대가 blocked이거나 시간 초과)별 처리와 "이름이 풀렸을 때" 수동 복구는 `.claude/roles/orchestrator.md`에 있습니다.
- herdr가 없으면 메시지는 SendMessage로 보냅니다.

## 작업 한 바퀴
```
/assign (Orchestrator)
  → strategy-checklist (Builder, 체크리스트 완성 후 멈춤)
  → 확인 → 새 세션에서 tdd-helper → /review-request (Builder, 브랜치 push와 PR)
  → /verify (Orchestrator) → domain-review (Checker, 최대 2차) → Checker /clear
  → 사용자 승인 → /merge (Orchestrator, PR 머지, 운영 기록) → 다른 Builder가 main을 merge
  → 작업을 마친 Builder /clear → /role builder-x
  → /handoff (Orchestrator, 인계 메모) → Orchestrator /clear (herdr가 있으면 스스로)
```

## 브랜치와 PR
- **`main`에는 PR 머지로만 반영합니다.** `main`에서 직접 커밋하거나 `main`으로 push하지 않습니다. 훅이 막습니다. (기본 브랜치 이름은 `project.conf`의 `MAIN_BRANCH`)
- **브랜치 이름**

  | 누가 | 브랜치 | 무엇 |
  |---|---|---|
  | Orchestrator | `docs/<작업ID>-<요약>` | 문서, 보드 |
  | Orchestrator | `chore/<요약>` | `.claude` 설정, 도구 |
  | Orchestrator | `contract/<작업ID>` | 계약 파일. 이 브랜치에서만 고칠 수 있습니다 |
  | Builder | `feat/a-<작업ID>`, `feat/b-<작업ID>` | 기능 구현 |
  | Builder | `contract/<작업ID>` | Orchestrator가 배정한 계약 작업만 (예: 계약 v1 설계) |
  | Checker | `review/<작업ID>` | 리뷰 대상 커밋을 맞춰 두는 읽기 전용 위치 |
- **작업 하나에 PR 하나.** 앞 PR에 의존하면 base를 앞 브랜치로 두고 쌓습니다.
- **머지는 `/merge`로만 합니다.** 사용자가 GitHub에서 직접 머지하려면 먼저 Orchestrator에게 Checker 결과를 확인합니다.
- **머지는 merge commit으로 합니다** (`gh pr merge --merge`). squash·rebase 머지와 force push는 쓰지 않습니다. 쌓인 PR과 Builder 브랜치가 깨지지 않게 하기 위해서입니다.
- **`main`이 바뀌면** 작업 브랜치는 `git fetch origin && git merge origin/main`으로 따라갑니다. 이미 push한 브랜치는 rebase하지 않습니다.

## 반드시 지킬 것
1. **사용자에게 묻는 것은 다섯 가지뿐입니다.** `main` 머지, 계약 태그(`contract-vN`), 외부 서비스 쓰기, 게이트(⛳), 진짜 모호한 요구사항. 작업 배정, 검증 요청, Builder의 `feat/*` 브랜치 push와 PR은 Orchestrator가 배정 범위를 보고 진행합니다.
2. **게이트(⛳)는 사용자만 넘깁니다.** 보드에서 ⛳가 붙은 작업은 멈추고 확인을 받습니다.
3. **계약은 `contract/*` 브랜치에서만 고칩니다.** 계약 파일은 `.claude/project.conf`의 `CONTRACT_PATTERNS`(기본값: `docs/glossary.md`, `src/modules/shared/events/*`, `src/modules/*/ports/*`)입니다. bash `case` 패턴이라 `*`는 `/`를 넘어 하위 폴더까지 맞습니다. 다른 브랜치에서는 훅이 막습니다. Builder는 계약 작업을 배정받아 `contract/*` 브랜치에 있을 때만 고치고, 그 밖에는 `/contract-change`로 요청합니다.
4. **구역(BC) 경계를 지킵니다.** 다른 구역과는 이벤트와 Port로만 연결합니다. `shared`에는 특정 구역의 로직을 두지 않습니다. 자세한 규칙은 `.claude/rules/architecture.md`에 있습니다.
5. **테스트 결과는 `실행 N / 통과 N`으로만 보고합니다.** 출력에서 직접 읽은 숫자만 씁니다. 0건이거나 건수가 안 보이면 통과가 아닙니다.
6. **만든 쪽이 채점하지 않습니다.** Checker에게는 브랜치, 작업 ID, 완료 기준만 넘깁니다.
7. **검증은 최대 2차입니다.** 확정된 높음 지적이 0건이면 PASS입니다. 2차도 FAIL이면 사용자에게 올립니다. 낮음 지적은 보드의 "후속 과제"로 모읍니다.
8. **모르면 추측하지 말고 멈춥니다.** 요구사항, 계약, 경계가 모호하면 질문합니다.
9. **worktree는 `herdr worktree create`로, 역할 이름으로 만듭니다.** `EnterWorktree`는 쓰지 않습니다.
10. **도구는 마찰이 두 번 생기면 그때 늘립니다.** 커맨드, 규칙, 훅, 서브에이전트를 미리 만들지 않습니다. 첫 번째 마찰은 보드의 "운영 기록"이나 `docs/retro.md`에 적어 둡니다.
11. **Orchestrator는 사용자에게 Product Manager처럼 말합니다.** 고객과 비즈니스 관점에서, 이해하기 쉬운 구어체로 설명합니다. 사실·실패·숫자는 그대로 말합니다. 자세한 것은 `.claude/roles/orchestrator.md`의 "사용자에게 말하는 방식"에 있습니다.
12. **사용자는 Orchestrator하고만 대화합니다.** Builder·Checker는 완료 보고, 질문, 이슈, 권한 승인 요청을 모두 Orchestrator에게 보내고 사용자에게 직접 말하지 않습니다. Orchestrator가 사용자에게 전하고 답을 받아 돌려줍니다. 자세한 것은 각 역할 지침의 "소통 창구"에 있습니다.

## 범위
- **포함:** <!-- TODO: 이번에 만드는 것 -->
- **제외:** <!-- TODO: 이번에 하지 않는 것 (예: 배포, 실제 결제, 외부 연동) -->

## 스택
<!-- TODO: 언어, 프레임워크, 저장소, 테스트 도구, 경계 검사 도구 -->

- **검사 명령:** `.claude/project.conf`의 `CHECK_CMD`. 타입 검사, 린트, 테스트, 구조(경계) 검사를 한 번에 돌리는 명령 하나로 둡니다. 실행은 `(source .claude/project.conf && eval "$CHECK_CMD")`.
- 테스트 출력에 실행 건수와 통과 건수가 보이게 설정합니다.

## `.claude` 지도
| 폴더 | 내용 |
|---|---|
| `roles/` | 세션 역할 지침 3개: `orchestrator` · `builder` · `checker` |
| `skills/` | `strategy-checklist`(설계) · `tdd-helper`(구현) · `domain-review`(리뷰) · `contract-design`(계약 v1 설계) |
| `agents/` | Checker가 필요할 때만 쓰는 서브에이전트: `arch-reviewer` · `security-reviewer` · `finding-verifier` |
| `commands/` | `/role` · `/board` · `/assign` · `/verify` · `/merge` · `/review-request` · `/contract-change` · `/handoff` · `/new-session` |
| `rules/` | 경로별 규칙: `architecture` · `contracts` · `testing` · `docs` |
| `hooks/` | `session-context`(시작 안내, 인계 메모) · `guard-contracts`(계약 잠금) · `guard-git`(force push, main 직접 커밋·push, worktree의 main checkout 차단) · `check-test-count`(0건 테스트 경고) |
| `project.conf` | 프로젝트별 설정값. 훅과 커맨드가 읽습니다 |
| `state/` | 인계 메모 (`handoff.md`). 커밋하지 않습니다 |

`scripts/`: `test-hooks.sh`(훅 자체 검사) · `reset-session.sh`(세션 비우기: idle 대기 → `/clear` → 이름 다시 붙이기 → `/role` 전송. 종료 코드 0 완료 / 1 대상·이름 확인 실패 / 2 herdr 없음 / 3 blocked·시간 초과)

기획과 디자인 도구: <!-- TODO: 기획 문서와 화면 설계에 쓰는 도구나 스킬 (없으면 docs/prd.md, docs/screens.md에 직접 씀) -->

## 문서와 커밋
- 문서는 한국어로, 쉬운 말로 씁니다. 규칙은 `.claude/rules/docs.md`에 있습니다.
- 커밋 메시지 형식은 `<type>(<구역>): <요약>`입니다. type은 feat, fix, test, refactor, docs, chore 중 하나입니다.
