---
paths:
  - "src/modules/**/*"
  - ".worktrees/**/src/modules/**/*"
---
# 아키텍처 — 모듈러 모놀리스와 BC 경계

앱은 하나이고, `src/modules/` 아래 BC마다 폴더를 나눕니다. 경계 규칙은 dependency-cruiser가 `npm run check`에서 검사합니다.

## BC 목록
| BC | 책임 |
|---|---|
| `catalog` | 요금제 조회, 지원금 기준표 |
| `application` | 접수 생성, 중복 검사, 접수 상태 |
| `consultation` | 상담 배정, 상담 결과, 개통 처리 |
| `reward` | 지원금 산정, 지급 조건 확인, 지급 |
| `experiment` | A/B 변형 배정, 노출·전환 이벤트 기록 |
| `shared` | 공통 타입, 이벤트 버스, DB 연결 같은 기술 인프라만 |

## BC 내부 레이어
```
src/modules/<bc>/
├─ domain/        엔티티, 값 객체, 정책. 외부 라이브러리·DB를 import하지 않음
├─ application/   유스케이스. domain과 ports만 사용
├─ ports/         다른 BC에 공개하는 조회 인터페이스 (계약 파일)
└─ infra/         DB(Drizzle), 이벤트 구독, ports 구현
```

## import 규칙
- 다른 BC는 `ports/`와 `shared/events/`만 import합니다. 다른 BC의 `domain`, `application`, `infra`는 금지입니다.
- `shared`는 어떤 BC도 import하지 않습니다. 특정 BC의 로직을 `shared`에 두지 않습니다.
- `domain`은 `infra`, Next.js, Drizzle을 import하지 않습니다.
- `src/app/`(라우트)은 각 BC의 `application`만 호출합니다. `domain`이나 `infra`를 직접 부르지 않습니다.

## 상태 변경은 이벤트로
- 다른 BC의 상태를 바꾸고 싶으면 그 BC의 함수를 직접 부르지 않습니다. 이벤트를 발행하면, 받는 BC가 스스로 상태를 바꿉니다.
- 예: `consultation`이 `LineActivated`를 발행하면 `reward`가 받아서 지원금을 산정합니다.

## 경계가 맞지 않는다고 느끼면
코드를 억지로 맞추지 말고 멈춥니다. 왜 경계가 어긋나는지 정리해서 Orchestrator에게 보냅니다. 경계 변경은 `docs/decisions/`에 기록한 뒤에 합니다.
