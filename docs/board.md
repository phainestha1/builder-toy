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
| Orchestrator | `w3:p1` | `orchestrator` | `main` | 활성 |
| Builder A | `w3:p5` | `builder-a` | worktree (Phase F에서 생성) | 대기 |
| Builder B | `w3:p6` | `builder-b` | worktree (Phase F에서 생성) | 대기 |
| Checker | `w3:p8` | `checker` | 리뷰 대상 브랜치 (읽기 전용) | 대기 |

## 작업
| ID | Phase | 작업 | 담당 | 상태 | 완료 기준 | 검증 결과 | 비고 |
|---|---|---|---|---|---|---|---|
| T-A1 | A | git 저장소 초기화, 원격 연결, 첫 커밋 | Orchestrator | done | `origin/main`에 첫 커밋 반영 | — | |
| T-A2 | A | 작업 보드 골격 | Orchestrator | done | 작업 표, 계약 변경 요청 표, 규칙 포함 | — | 2026-10-05 사용자 확인 |
| T-A3 | A | 역할 지침 3개 초안 | Orchestrator | done | orchestrator / builder / checker 지침 작성 | — | 2026-10-05 사용자 확인 |
| T-A4 | A | 루트 CLAUDE.md, `.claude` 체계(skills, agents, commands, rules, hooks) | Orchestrator | done | 훅 모의 입력 테스트 통과, 사용자 확인 | — | 2026-10-05 사용자 확인 |
| T-B1 | B | `ajd:planning`으로 M0 기획, Notion PRD | Orchestrator | doing | PRD 승인, `docs/prd.md`에 링크와 요약 | — | |
| T-C1 | C | `ajd:design`으로 M1 화면 설계, Figma | Orchestrator | todo | 화면 설계 승인, `docs/screens.md` 기록 | — | |
| T-D1 | D | 이벤트 스토밍, 용어 사전, BC, 정책 확정 | Orchestrator | todo | `docs/glossary.md`, `docs/decisions/` | — | |
| T-D2 | D | 이벤트·Port 타입 작성, `contract-v1` 태그 | Orchestrator | todo | 타입 검사 통과, 사용자 승인 | — | |
| T-E1 | E | 스캐폴딩, `npm run check`, `.claude` 경로·명령 보정 | Orchestrator | todo | 훅 차단과 아키텍처 검사 실패를 직접 재현 | — | |
| T-F1 | F | worktree 생성, 세션 재시작, 시범 작업 1개 | 전체 | todo | 작업 한 바퀴(PLAN 8.5) 완주 | — | |

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
