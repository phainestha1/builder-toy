# builder_template — 멀티 세션 작업 체계 템플릿

Claude Code 세션 4개가 역할을 나눠 한 저장소를 함께 만드는 작업 체계입니다. 앱 코드는 없고, 역할 지침, 작업 보드, 계약 잠금, 훅, 커맨드, 스킬, 서브에이전트, 문서 골격만 들어 있습니다. 어느 프로젝트에도 복사해 쓸 수 있습니다.

## 역할 4개
| 역할 | 하는 일 | 하지 않는 일 |
|---|---|---|
| Orchestrator | 계획, 계약 관리, 작업 배정, 검증 요청, PR 머지, 보드 관리 | 기능 코드 작성 |
| Builder A / B | 배정받은 구역(BC)을 설계 체크리스트 → TDD로 구현, PR 올리기 | 계약 수정, 머지, 보드 수정 |
| Checker | 브랜치를 독립적으로 검증하고 PASS/FAIL 판정 | 코드 수정, Builder 설명을 근거로 쓰기 |

## 세 가지 원칙
1. **계약 먼저.** 용어, 이벤트, Port를 먼저 정하고 잠급니다. 계약은 `contract/*` 브랜치에서만 바뀌고, 바뀌면 `contract-vN` 태그가 붙습니다.
2. **만든 쪽이 채점하지 않습니다.** Checker는 브랜치, 작업 ID, 완료 기준만 받고 직접 실행해서 판정합니다.
3. **규칙은 훅과 테스트로 지킵니다.** 말로 부탁하지 않고, 훅이 막고 검사 명령이 잡습니다.

## 이 방식이 맞는지
아래 질문에 **3개 이상 "예"**면 쓸 만합니다. 그보다 적으면 세션 하나로 하는 편이 빠릅니다.

| # | 질문 |
|---|---|
| 1 | 동시에 진행할 수 있는, 서로 다른 구역의 작업이 둘 이상 있나요? |
| 2 | 여러 사람(세션)이 같은 용어와 데이터 모양에 기대야 하나요? |
| 3 | 리뷰 없이 머지하면 곤란한 규칙(정책, 보안, 개인정보)이 있나요? |
| 4 | 작업이 며칠 이상 이어져서 맥락을 끊고 다시 이어 갈 일이 생기나요? |
| 5 | 테스트를 자동으로 돌릴 수 있는 검사 명령을 하나로 만들 수 있나요? |

## 준비물
| 도구 | 쓰는 곳 |
|---|---|
| git | 브랜치, worktree, 태그 |
| gh (GitHub CLI, 로그인 상태) | PR 생성과 머지 |
| Claude Code | 세션 4개 |
| herdr | 세션 띄우기, worktree, 세션 사이 메시지. 없으면 SendMessage로 대신합니다 |
| jq | 훅이 도구 입력(JSON)을 읽을 때 |

## 시작하기
1. **복사합니다.** 이 폴더의 내용(`.claude/`, `docs/`, `scripts/`, `CLAUDE.md`, `.gitignore`)을 프로젝트 저장소 루트에 복사하고 커밋합니다.
2. **`.claude/project.conf`를 고칩니다.** `PROJECT_NAME`, `MAIN_BRANCH`, `CHECK_CMD`(타입·린트·테스트·구조 검사를 한 번에), `CONTRACT_PATTERNS`(계약 파일), `TASK_ID_PREFIX`.
3. **`CLAUDE.md`의 `TODO`를 채웁니다.** 프로젝트 이름, 소개, 범위, 스택, 기획·디자인 도구.
4. **훅을 확인합니다.** `bash scripts/test-hooks.sh`를 실행해 마지막 줄이 `실행 N / 통과 N`(두 숫자가 같음)인지 봅니다.
5. **⛳ 기획·화면 (`T-01`).** `docs/prd.md`와 `docs/screens.md`를 채우고 사용자가 승인합니다.
6. **⛳ 계약 v1 (`T-02`).** `contract/T-02` 브랜치에서 `contract-design` 스킬로 용어 사전, 구역, 이벤트·Port 타입을 만듭니다. Checker 검증(최대 2차)과 사용자 승인 뒤 머지하고 `contract-v1` 태그를 붙입니다.
7. **worktree와 세션을 띄웁니다 (`T-03`).** worktree는 역할 이름으로 만듭니다. 작업 ID로 짓지 않습니다.
   ```bash
   herdr worktree create --branch feat/a-<작업ID> --label builder-a
   herdr worktree create --branch feat/b-<작업ID> --label builder-b
   herdr worktree create --branch review/<작업ID> --label checker
   ```
   각 pane에서 Claude Code를 띄우고 에이전트 이름을 붙인 뒤 `/role <이름>`을 실행합니다.
   ```bash
   herdr agent rename <pane_id> builder-a       # pane_id는 herdr agent list에서. builder-b, checker, orchestrator도 같은 방식
   herdr agent list                             # 이름 4개가 보이는지 확인
   ```
   정확한 인자는 `herdr --help`로 확인합니다. herdr가 없으면 `git worktree add`로 만들고, 메시지는 SendMessage로 보냅니다.
8. **첫 사이클 (`T-04`).** 작은 작업 하나로 `/assign` → `strategy-checklist` → `tdd-helper` → `/review-request` → `/verify` → `/merge` → `/handoff`를 끝까지 돌립니다. 걸린 시간과 막힌 곳을 보드의 "운영 기록"과 `docs/retro.md`에 적습니다.

## 하네스 고치기와 받아 가기
하네스(`.claude/`의 지침·커맨드·스킬·훅, `scripts/test-hooks.sh`, `scripts/reset-session.sh`, `CLAUDE.md`)는 **이 템플릿에서만 고칩니다.** 프로젝트에서 쓰다가 나온 개선도 여기로 가져와 PR로 반영합니다. 프로젝트는 `scripts/sync-harness.sh`로 받아 갑니다.

```bash
# 이 템플릿 폴더에서 (main 최신으로)
bash scripts/sync-harness.sh <프로젝트 폴더> --dry-run              # 무엇이 바뀌는지만 봄
bash scripts/sync-harness.sh <프로젝트 폴더>                        # 적용
bash scripts/sync-harness.sh <프로젝트 폴더> --base <템플릿 커밋>   # 처음 받을 때 (복사해 온 커밋)
```
- 마지막으로 받은 커밋부터 지금까지의 변경만 패치로 적용합니다. 프로젝트가 고친 곳(이름, Builder 수 등)은 그대로 둡니다.
- 받은 커밋은 프로젝트의 `.claude/harness.lock`에 적힙니다. `project.conf`, `settings.local.json`, `state/`, `docs/`는 건드리지 않습니다.
- 충돌한 파일은 `<파일>.rej`로 남습니다 (종료 코드 4). 손으로 맞추고 `.rej`를 지웁니다. 프로젝트가 같은 개선을 이미 다른 말로 갖고 있으면 `.rej`만 지우면 됩니다.
- 결과는 프로젝트의 `chore/harness-sync` 같은 브랜치에서 커밋하고 PR로 반영합니다. 스크립트는 커밋하지 않습니다.

## 폴더 지도
```
CLAUDE.md                 세션이 처음 읽는 규칙 (진실의 원천 표, 역할, 브랜치, 반드시 지킬 것)
.claude/
├─ project.conf           프로젝트별 설정 (검사 명령, 계약 파일 목록 등)
├─ harness.lock           프로젝트에만 생김. 마지막으로 받은 템플릿 커밋 (sync-harness.sh가 씀)
├─ settings.json          훅 연결
├─ roles/                 orchestrator · builder · checker 지침
├─ commands/              /role /board /assign /verify /merge /review-request /contract-change /handoff /new-session
├─ skills/                strategy-checklist · tdd-helper · domain-review · contract-design
├─ agents/                arch-reviewer · security-reviewer · finding-verifier
├─ rules/                 architecture · contracts · testing · docs (경로별 규칙)
├─ hooks/                 session-context · guard-contracts · guard-git · check-test-count
└─ state/                 인계 메모 handoff.md (커밋 안 함)
docs/
├─ board.md               작업 보드 (진실의 원천)
├─ glossary.md            용어 사전 (계약)
├─ prd.md · screens.md    기획 · 화면
├─ decisions/             확정한 결정 (ADR)
├─ checklists/            작업별 설계 체크리스트
├─ design/                사람이 읽는 논의와 대안
└─ retro.md               측정 항목과 회고
scripts/test-hooks.sh     훅 자체 검사
scripts/sync-harness.sh   템플릿의 하네스 변경을 프로젝트로 보냄 (템플릿에서만 실행)
scripts/reset-session.sh  세션 비우기 (/clear → 이름 다시 붙이기 → /role). 종료 코드 0 완료 / 1 대상·이름 확인 실패 / 2 herdr 없음 / 3 blocked·시간 초과
```

## 자주 막히는 곳
| 증상 | 원인 | 해결 |
|---|---|---|
| 계약 파일을 고치려는데 훅이 막음 | `contract/*` 브랜치가 아님 | Builder는 `/contract-change`로 요청. Orchestrator는 `contract/<작업ID>` 브랜치를 만듦 |
| `main`에서 커밋이 막힘 | `main` 직접 커밋 금지 | `docs/*`·`chore/*` 브랜치를 만들어 PR로 반영 |
| worktree에서 `main`으로 checkout이 막힘 | 원본 폴더가 `main`을 쓰고 있음 | `git fetch origin && git merge origin/main`으로 따라감 |
| 테스트가 통과했다는데 건수가 0 | 필터 오타, 캐시, 컴파일 실패, `CHECK_CMD`에 테스트가 빠짐 | 출력에서 실행 건수를 직접 읽음. 0건은 FAIL |
| 메시지가 엉뚱한 세션으로 감 | pane ID로 보냄 (창을 옮기면 바뀜) | 에이전트 이름으로 보냄. `herdr agent list`로 확인 |
| `/clear` 뒤 에이전트 이름이 사라짐 (이름으로 보내면 `agent_not_found`) | herdr는 `/clear` 직후 이름을 풀어 버림 | 비우기는 `scripts/reset-session.sh`로 함. 이미 풀렸으면 `herdr agent list`에서 name이 null인 pane_id(예: `w4:p2`)를 찾아 `herdr agent rename <pane_id> <이름>` |
| worktree가 작업마다 늘어남 | 작업 ID로 worktree를 만듦 | 역할 이름 worktree 하나에서 브랜치만 바꿈 |
| 검증이 끝나지 않고 계속 돎 | 낮음 지적까지 고치려 함 | 확정된 높음 0건이면 PASS. 최대 2차. 낮음은 후속 과제로 |
| 사용자 승인 요청이 너무 많음 | 모든 단계에서 확인을 받음 | 묻는 것은 `main` 머지, 계약 태그, 외부 쓰기, ⛳, 모호한 요구사항뿐 |
| `reset-session.sh`가 exit 3 | 상대 세션이 권한 확인 등에서 멈췄거나(blocked) 시간 초과. `/clear`나 `/role`이 들어가지 않음. `/clear` 뒤 시간 초과면 이름이 이미 풀렸을 수 있음 | 직접 승인하지 않음. `herdr agent read <pane> --source recent-unwrapped --lines 80`으로 화면을 보고 사용자에게 알림. 해소되면 스크립트가 출력한 pane_id 명령으로 다시 실행 |
| Orchestrator 자기 비우기가 됐는지 모름 | `nohup` 백그라운드로 돌아 종료 코드가 바로 안 보임 | 결과는 `.claude/state/reset.log`에 남음 (실행마다 덮어씀, 마지막 줄 `exit N`). `exit 0`이 아니면 세션 시작 안내에도 나옴. 다시 걸 때는 로그에 출력된 `nohup ... &` 형태로 (포그라운드면 자기 턴이 안 끝나 exit 3) |
| `reset-session.sh`가 exit 1 | 대상을 못 찾았거나 이름 확인 실패 | 출력된 수동 복구 방법대로 `herdr agent rename <pane_id> <이름>` 뒤, 출력된 pane_id 명령으로 다시 실행 |
| Orchestrator가 앞 결정을 잊거나 헷갈림 | 맥락이 너무 길어짐 | 작업 하나 머지할 때마다 `/handoff` (인계 메모 → `reset-session.sh`로 비우기) |
| Checker가 Builder 설명에 끌려감 | 검증 요청에 설명이 섞임 | `/verify`로 브랜치, 작업 ID, 완료 기준만 넘김 |
| 쌓인 PR이 머지 뒤 깨짐 | squash·rebase 머지 | merge commit만 씀. push한 브랜치는 rebase하지 않음 |
| herdr가 없음 | 설치 안 됨 | 메시지는 SendMessage로, worktree는 `git worktree add`로 |
