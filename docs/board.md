# 작업 보드

> 멀티 세션 협업의 **진실의 원천**입니다. 메시지로 주고받은 내용도 결정과 결과는 반드시 여기에 남깁니다.
> 운영 규칙: `_docs/PLAN.md` 8절 · 역할 지침: `.claude/roles/`

## 규칙
- **상태:** `todo` → `doing` → `review` → `done` (막히면 `blocked`, 사유를 비고에 적음)
- **누가 고치나:** 작업 추가, 배정, `done` 처리는 Orchestrator만 합니다. Builder는 자기 작업을 `doing`과 `review`로, Checker는 검증 결과 칸만 바꿉니다.
- **완료 기준:** 작업을 등록할 때 함께 적습니다. 완료 기준이 없는 작업은 시작하지 않습니다.
- **검증 결과:** `PASS` 또는 `FAIL`과 함께 `테스트 실행 N / 통과 N`을 적습니다. 실행 건수가 없는 결과는 인정하지 않습니다.
- **수정 충돌 방지:** 보드는 `main`에서 관리합니다. Builder와 Checker는 직접 고치지 않고 Orchestrator에게 변경 내용을 보냅니다. (Phase F에서 운영해 보고 다시 정함)

## 세션
| 역할 | herdr pane | 에이전트 이름 | 작업 위치 | 상태 |
|---|---|---|---|---|
| Orchestrator | `w3:p1` | `orchestrator` | 원본 폴더 | 활성 |
| Builder A | `w3:p9` | `builder-a` | worktree `contract-t-d1` | 대기 |
| Builder B | — | `builder-b` | 없음 (작업 배정 때 worktree와 세션 생성) | 없음 |
| Checker | `w3:pA` | `checker` | worktree `review-t-d1` (리뷰 대상 브랜치를 맞춰 씀) | 대기 |

## 작업
| ID | Phase | 작업 | 담당 | 상태 | 완료 기준 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|---|
| T-A1 | A | git 저장소 초기화, 원격 연결, 첫 커밋 | Orchestrator | done | `origin/main`에 첫 커밋 반영 | — | |
| T-A2 | A | 작업 보드 골격 | Orchestrator | done | 작업 표, 계약 변경 요청 표, 규칙 포함 | — | 2026-10-05 사용자 확인 |
| T-A3 | A | 역할 지침 3개 초안 | Orchestrator | done | orchestrator / builder / checker 지침 작성 | — | 2026-10-05 사용자 확인 |
| T-A4 | A | 루트 CLAUDE.md, `.claude` 체계(skills, agents, commands, rules, hooks) | Orchestrator | done | 훅 모의 입력 테스트 통과, 사용자 확인 | — | 2026-10-05 사용자 확인 |
| T-B1 | B | `ajd:planning`으로 M0 기획, Notion PRD | Orchestrator | done | PRD 승인, `docs/prd.md`에 링크와 요약 | — | 2026-10-05 ⛳ PRD 승인 |
| T-C1 | C | `ajd:design`으로 M1 화면 설계, Figma | Orchestrator | done | 화면 설계 승인, `docs/screens.md` 기록 | — | 2026-10-05 ⛳ 화면 설계 승인 |
| T-D1 | D | 이벤트 스토밍, 용어 사전, BC, 정책 확정 | Builder A | done | `docs/glossary.md`, `docs/design/event-storming.md`, `docs/decisions/0001-bounded-contexts.md` 작성, Checker 검증, 사용자 승인 | PASS (6차, `1d71fb1`) · 테스트 해당 없음 (문서 작업) | PR #6(검증 전 머지), #7. 1~5차 FAIL 후 6차 PASS. 승인은 사용자 위임으로 Orchestrator |
| T-D2 | D·E | 스캐폴딩(E1·E2) + 이벤트 7개·Port 3개 타입, 머지 뒤 `contract-v1` 태그 | Builder A | doing | `npm run check`(타입·린트·테스트·아키텍처) 통과, 테스트 실행 1건 이상, 아키텍처 위반이 실패로 잡히는 것을 1회 재현, 타입은 ADR 0001 기준, Checker PASS | — | 계약 작업 예외로 `contract/t-d2` worktree. T-E1을 합침 |
| T-E1 | E | 스캐폴딩, `npm run check`, `.claude` 경로·명령 보정 | — | done | — | — | T-D2에 합침 |
| T-F1 | F | worktree 생성, 세션 재시작, 시범 작업 1개 | 전체 | done | 작업 한 바퀴(PLAN 8.5) 완주 | — | T-D1로 한 바퀴 완주 |
| T-G1 | G | M4 `catalog`·`application` 도메인과 유스케이스 (TDD) | Builder A | todo | ADR 0001의 C·A 정책을 도메인 테스트로, `npm run check` 통과, Checker PASS | — | `contract-v1` 뒤 시작 |
| T-G2 | G | M4 `reward`·`experiment` 도메인과 유스케이스 (TDD) | Builder B | todo | ADR 0001의 R·E 정책을 도메인 테스트로, `npm run check` 통과, Checker PASS | — | `contract-v1` 뒤 시작 |
| T-G3 | G | M5 고객 화면 01~04 (Figma 기준) | Builder A | todo | 퍼널 E2E 1개 통과, Checker PASS | — | T-G1 뒤 |
| T-G4 | G | M6 상담원 어드민 05 + 로그인 | Builder B | todo | 상태 전이 E2E 1개 통과, Checker PASS | — | T-G2 뒤 |

## 계약 변경 요청
> 계약 파일: `docs/glossary.md`, `src/modules/shared/events/**`, `src/modules/*/ports/**`
> Builder는 직접 고치지 않고 여기에 요청합니다. Orchestrator가 검토하고 사용자 승인을 받아 반영합니다.

| ID | 요청자 | 대상 파일 | 변경 내용 | 이유 | 영향 받는 BC | 상태 |
|---|---|---|---|---|---|---|
| — | | | | | | |

## 결정 로그
| 날짜 | 결정 | 근거 |
|---|---|---|
| 2026-10-05 | 원격 저장소 `phainestha1/builder-toy`(private) 사용 | 사용자 지정 |
| 2026-10-05 | M0 기획은 인터뷰를 생략하고 가정 기반 데모 수준으로 진행 | 사용자 지시: 사이클을 끝까지 한 번 돌리는 데 집중 |
| 2026-10-05 | `_docs/PLAN.md`를 최초 기록으로 고정. 진척 기록과 특이사항은 Notion PRD "진행 기록"에 남김 | 사용자 지시 |
