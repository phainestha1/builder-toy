# 작업 보드

> 멀티 세션 협업의 **진실의 원천**입니다. 메시지로 주고받은 내용도 결정과 결과는 반드시 여기에 남깁니다.
> 운영 규칙: `CLAUDE.md` · 역할 지침: `.claude/roles/` · 문서 규칙: `.claude/rules/docs.md`

## 규칙
- **상태:** `todo` → `doing` → `review` → `done` (막히면 `blocked`, 사유를 비고에 적음)
- **누가 고치나:** 보드는 Orchestrator만 고칩니다. Builder와 Checker는 변경 내용을 Orchestrator에게 보냅니다.
- **완료 기준:** 작업을 등록할 때 함께 적습니다. 완료 기준이 없는 작업은 시작하지 않습니다.
- **게이트(⛳):** 작업 이름에 ⛳가 있으면 사용자가 확인해야 `done`이 됩니다.
- **검증 결과:** `PASS` 또는 `FAIL`과 함께 차수, 커밋, `테스트 실행 N / 통과 N`을 적습니다. 실행 건수가 없는 결과는 인정하지 않습니다. 문서 작업은 `테스트 해당 없음 (문서 작업)`.
- **검증은 최대 2차:** 2차도 FAIL이면 사용자에게 올립니다. 낮음 지적(최대 5건)은 "후속 과제"로 옮깁니다.
- **반영 방법:** 보드 변경은 `docs/*` 브랜치에서 커밋하고 PR로 `main`에 반영합니다. 같은 시점의 변경은 한 PR로 묶어도 됩니다.
- **작업 행 형식 (훅이 읽음):** `| T-xx | 작업 | 담당 | 상태 | 완료 기준 | 검증 결과 | 비고 |`

## 세션
| 역할 | 에이전트 이름 | worktree 이름 | 현재 브랜치 | 상태 |
|---|---|---|---|---|
| Orchestrator | `orchestrator` | 없음 (원본 폴더) | `main` | 대기 |
| Builder A | `builder-a` | `builder-a` | — | 대기 |
| Builder B | `builder-b` | `builder-b` | — | 대기 |
| Checker | `checker` | `checker` | — | 대기 |

## 작업
| ID | 작업 | 담당 | 상태 | 완료 기준 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|
| T-01 | ⛳ 기획·화면 | Orchestrator | todo | `docs/prd.md`(문제, 지표, 정책, 예외 케이스, 범위)와 `docs/screens.md`(화면 흐름, 화면별 예외) 작성, 사용자 승인 | — | |
| T-02 | ⛳ 계약 v1 (`contract-design` 스킬) | — | todo | `docs/glossary.md`, `docs/decisions/0001-*.md`, 이벤트·Port 타입 작성, Checker PASS(최대 2차), 사용자 승인, `contract-v1` 태그 | — | `contract/T-02` 브랜치. T-01 뒤 |
| T-03 | 세션 띄우기 | Orchestrator | todo | 역할 이름 worktree 3개(`builder-a`, `builder-b`, `checker`), `herdr agent list`에 이름 4개, 각 세션 `/role` 보고, 위 세션 표 갱신 | — | T-02 뒤 |
| T-04 | 첫 시범 작업 (작은 기능 하나) | — | todo | 작업 한 바퀴(`/assign` → 체크리스트 → TDD → `/review-request` → `/verify` → `/merge` → `/handoff`) 완주, 검사 명령 통과, 테스트 실행 1건 이상, 운영 기록 1행 | — | T-03 뒤 |

## 계약 변경 요청
> 계약 파일: `.claude/project.conf`의 `CONTRACT_PATTERNS` (기본값: `docs/glossary.md`, `src/modules/shared/events/*`, `src/modules/*/ports/*`)
> Builder는 직접 고치지 않고 `/contract-change`로 요청합니다. Orchestrator가 검토하고 사용자 승인을 받아 반영합니다.

| ID | 요청자 | 대상 파일 | 변경 내용 | 이유 | 영향 받는 구역 | 상태 |
|---|---|---|---|---|---|---|
| — | | | | | | |

## 후속 과제
> Checker의 낮음 지적(검증 한 번에 최대 5건)과 미뤄 둔 일을 모읍니다. 작업으로 올릴 때는 작업 표에 새 ID를 만들고 여기 상태를 `작업으로`로 바꿉니다.

| ID | 출처 (작업·차수) | 내용 | 위치 | 상태 |
|---|---|---|---|---|
| F-01 | 템플릿 정리 · 2차 (높음) | `/clear` 뒤 herdr 이름이 풀리는데, 절차가 이름으로 `wait`·`prompt`를 보냄. `/clear` 전에 pane_id를 잡아 두고, 뒤에는 pane_id로 `wait` → `rename <pane> <이름>` → `prompt` 순서로 바꿈 | `.claude/commands/handoff.md:28-31`, `merge.md:39-41`, `.claude/roles/orchestrator.md:33` | 완료 (Checker PASS, 실행 66 / 통과 66) |
| F-02 | 템플릿 정리 · 2차 (낮음) | 이름이 풀렸을 때 `rename`의 TARGET으로 pane_id를 쓴다는 안내가 없음 | `merge.md:41`, `verify.md:34`, `role.md:17`, `orchestrator.md:27`, `CLAUDE.md:42` | 완료 (Checker PASS, 실행 66 / 통과 66) |
| F-03 | 템플릿 정리 · 2차 (낮음) | Checker를 `/clear`한 뒤 다음 검증의 `/role checker`를 이름으로 보냄 (F-01과 같은 원인) | `.claude/commands/verify.md:33-36` | 완료 (Checker PASS, 실행 66 / 통과 66) |
| F-04 | 템플릿 정리 · 2차 (낮음) | 0건 경고 훅이 heredoc·따옴표·`echo` 안의 `$CHECK_CMD` 글자에도 반응해 오경고 (guard-git처럼 걸러내야 함) | `.claude/hooks/check-test-count.sh:36` | 완료 (Checker PASS, 실행 66 / 통과 66) |
| F-05 | F-01~04 · 1차 (낮음) | 0건 경고 훅이 `grep -rn '$CHECK_CMD'`처럼 실행이 아닌 곳의 공백 없는 따옴표 토큰에도 경고. `eval`·`sh -c`·`bash -c` 바로 뒤일 때만 실행으로 보기 | `.claude/hooks/check-test-count.sh:70` | 완료 (Checker PASS, 실행 76 / 통과 76) |
| F-06 | F-01~04 · 1차 (낮음) | 대상이 blocked(권한 확인 등)면 `wait`이 끝없이 기다림. `--timeout`과 `--until blocked` 추가, blocked면 안내하고 멈추기 | `scripts/reset-session.sh:58` | 완료 (Checker PASS, 실행 76 / 통과 76) |
| F-07 | F-01~04 · 1차 (낮음) | `/clear` 완료를 확인하지 않고 3초 뒤 rename. 실패 시 재시도와, 수동 복구 절차·pane_id 재실행 안내가 없음 | `scripts/reset-session.sh:53,63-67,80` | 완료 (Checker PASS, 실행 76 / 통과 76) |
| F-08 | F-01~04 · 1차 (낮음) | `prompt` 결과를 버려서 `agent_blocked` 같은 거부를 놓치고 "완료"로 출력할 수 있음 | `scripts/reset-session.sh:61,72` | 완료 (Checker PASS, 실행 76 / 통과 76) |
| F-09 | F-01~04 · 1차 (낮음) | 가짜 herdr가 없는 대상에 실제와 다른 응답(exit 0, `agent: null`)을 냄. 실제는 `agent_not_found`, exit 1 | `scripts/test-hooks.sh:219` | 완료 (Checker PASS, 실행 76 / 통과 76) |
| F-10 | 실제 reset 실행 관찰 | git 저장소가 아닌 폴더에서 세션 안내 훅이 브랜치 없음을 detached HEAD(Checker 위치)로 잘못 추정 | `.claude/hooks/session-context.sh` | 완료 (Checker 2차 PASS, 실행 88 / 통과 88) |
| F-11 | F-05~09 · 1차 (낮음) | 사용법 오류·jq 없음도 exit 1이라, 문서대로면 불필요한 수동 rename 복구로 감. 별도 코드(예: 4)로 분리 | `scripts/reset-session.sh:48,57` | 대기 |
| F-12 | F-05~09 · 1차 (낮음) | wait 실패를 이유와 관계없이 시간 초과(exit 3)로 봄. 없는 pane_id를 주면 exit 1이 아니라 3 | `scripts/reset-session.sh:104-105` | 대기 |
| F-13 | F-05~09 · 1차 (낮음) | /clear는 들어갔는데 세션 ID 확인이 시간 초과(exit 3)면 이름이 이미 풀렸을 수 있음. 문서의 "같은 명령 다시 실행" 대신 출력된 pane_id 명령으로 다시 실행하라고 안내 | `scripts/reset-session.sh:130`, `orchestrator.md` 종료 코드 표, `README.md:95` | 완료 (Checker 2차 PASS, 실행 88 / 통과 88) |
| F-14 | F-05~09 · 1차 (낮음) | 복구용 다시 실행 명령에 세 번째 인자(이어서 보낼 프롬프트)가 빠짐 | `scripts/reset-session.sh:66` | 완료 (Checker 2차 PASS, 실행 88 / 통과 88) |
| F-15 | F-05~09 · 1차 (낮음) | Orchestrator 자기 비우기가 /clear 전에 exit 3으로 끝나면 비워지지 않은 채 남는데 알려 주는 곳이 없음 | `.claude/commands/handoff.md:36` | 완료 (Checker 2차 PASS, 실행 88 / 통과 88) |
| F-16 | F-10·13·14·15 · 2차 (낮음) | 시작 훅은 /clear 순간에 돌아 reset.log에 아직 exit 줄이 없음. /clear 뒤 실패(rename exit 1, /role 거부 exit 3)는 그 세션이 아니라 다음 세션 시작 때 보임. 이름은 붙었는데 /role만 거부된 경우는 알릴 곳 없음. 문서 설명도 실제 시점과 다름 | `.claude/hooks/session-context.sh:75-87`, `orchestrator.md:46`, `handoff.md:38` | 대기 |
| F-17 | F-10·13·14·15 · 2차 (낮음) | /role 전송 실패 안내의 수동 명령이 큰따옴표로만 감싸서 세 번째 인자에 `"`·`$`가 있으면 깨짐 (F-14의 `sq` 처리 빠짐) | `scripts/reset-session.sh:165` | 대기 |
| F-18 | F-10·13·14·15 · 2차 (낮음) | nohup 명령이 상대 경로라 원본 폴더 최상위에서 실행해야 하는데 안내에 그 조건이 없음 | `scripts/reset-session.sh:74`, `handoff.md:28` | 대기 |

## 운영 기록
> 작업마다 한 행. `/assign` 때 시작, `/verify` 때 검증, `/merge` 때 머지를 채웁니다. 모아 보는 방법은 `docs/retro.md`.

| 작업 | 시작 | 머지 | 걸린 시간 | 승인 대기 | 검증 차수 | 확정 지적 / 오탐 | 세션별 토큰 (O / A / B / C) | 메모 (마찰) |
|---|---|---|---|---|---|---|---|---|
| — | | | | | | | | |

## 결정 로그
| 날짜 | 결정 | 근거 |
|---|---|---|
| — | | |
