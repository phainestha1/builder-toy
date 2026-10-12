---
paths:
  - "src/modules/**/*"
  - ".worktrees/**/src/modules/**/*"
---
# 아키텍처 — 모듈러 모놀리스와 구역(BC) 경계

앱은 하나이고, 구역(BC, Bounded Context — 상태와 규칙을 함께 책임지는 업무 단위)마다 폴더를 나눕니다. 아래는 **권장 기본 구조**입니다. 언어나 프레임워크에 맞게 이름을 바꿔도 되지만, 바꾸면 이 파일의 `paths:`, `.claude/project.conf`의 `CONTRACT_PATTERNS`, 경계 검사 설정을 함께 고칩니다.

경계 규칙은 경계 검사 도구(예: dependency-cruiser, import-linter, ArchUnit)로 검사하고, 검사 명령(`CHECK_CMD`, `.claude/project.conf`)에 넣어 둡니다.

## 구역 목록
<!-- TODO: contract-design 스킬로 정한 구역을 적습니다. 결정은 docs/decisions/0001-*.md -->
| 구역 | 책임 |
|---|---|
| `<구역>` | <!-- TODO --> |
| `shared` | 공통 타입, 이벤트 버스, 저장소 연결, 인증, 시계 같은 기술 인프라만 |

## 구역 내부 레이어
```
src/modules/<구역>/
├─ domain/        엔티티, 값 객체, 정책. 외부 라이브러리·저장소를 import하지 않음
├─ application/   유스케이스. domain과 ports만 사용
├─ ports/         다른 구역에 공개하는 조회 인터페이스 (계약 파일)
└─ infra/         저장소, 이벤트 구독, ports 구현
src/modules/shared/events/   구역 사이 이벤트 타입 (계약 파일)
```

## import 규칙
- 다른 구역은 `ports/`와 `shared/events/`만 import합니다. 다른 구역의 `domain`, `application`, `infra`는 금지입니다.
- `shared`는 어떤 구역도 import하지 않습니다. 특정 구역의 로직을 `shared`에 두지 않습니다.
- `domain`은 `infra`, 프레임워크, 저장소 라이브러리를 import하지 않습니다.
- 진입점(라우트, 핸들러, 컨트롤러, CLI)은 각 구역의 `application`만 호출합니다. `domain`이나 `infra`를 직접 부르지 않습니다.

## 상태 변경은 이벤트로
- 다른 구역의 상태를 바꾸고 싶으면 그 구역의 함수를 직접 부르지 않습니다. 이벤트를 발행하면, 받는 구역이 스스로 상태를 바꿉니다.
- 예: 구역 A가 `OrderPlaced`를 발행하면 구역 B가 받아서 자기 상태를 바꿉니다.

## 조립 위치 (composition root)
- 유스케이스는 구역 밖의 조립 위치(예: `src/composition/<구역>.*`)에서 저장소·Port 구현(infra)을 넣어 만듭니다. 진입점은 조립 위치에서 가져다 씁니다.
- 이벤트 버스는 하나만 두고, 구독도 조립 위치에서 등록합니다.
- `src/modules`는 조립 위치를 import하지 않습니다.

## 경계가 맞지 않는다고 느끼면
코드를 억지로 맞추지 말고 멈춥니다. 왜 경계가 어긋나는지 정리해서 Orchestrator에게 보냅니다. 경계 변경은 `docs/decisions/`에 기록한 뒤에 합니다.
