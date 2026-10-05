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
| `catalog` | 요금제, 지원금 기준표(버전 관리), 지원금 계산 공식 |
| `application` | 접수 생성, 재접수 합치기, 접수 상태 머신(상담 시작·개통·취소 포함), 전화번호 열람 기록 |
| `reward` | 개통 뒤 지원금 산정, 지급 기록 |
| `experiment` | 변형 배정, 노출·계산·전환 기록, 집계 제외 |
| `shared` | 공통 타입, 이벤트 버스, DB 연결, 어드민 인증, 시계 같은 기술 인프라만 |

v1에는 `consultation` BC가 없습니다. 상담 배정이나 상담 결과가 범위에 들어오면 다시 나눕니다 (`docs/decisions/0001-bounded-contexts.md`).

상담원 계정과 `counselorId`의 주인은 `shared`의 어드민 인증입니다. 라우트가 세션에서 `counselorId`를 꺼내 유스케이스 인자로 넘기고, BC는 `counselorId`만 기록합니다.

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
- 예: `application`이 `LineActivated`를 발행하면 `reward`가 받아서 지원금을 산정합니다.

## 경계가 맞지 않는다고 느끼면
코드를 억지로 맞추지 말고 멈춥니다. 왜 경계가 어긋나는지 정리해서 Orchestrator에게 보냅니다. 경계 변경은 `docs/decisions/`에 기록한 뒤에 합니다.

## 조립 위치 (composition root)
- 라우트가 쓸 유스케이스는 `src/composition/<bc>.ts`에서 저장소·Port 구현(infra)을 넣어 만듭니다. `src/app`은 `src/composition`에서 가져다 씁니다.
- 공용 이벤트 버스는 `src/composition/event-bus.ts`의 `eventBus` 하나입니다. 이벤트 구독도 각 BC의 composition 파일에서 등록합니다.
- `src/modules`는 `src/composition`을 import하지 않습니다(`modules-not-to-composition` 규칙).
- DB 테이블은 각 BC의 `infra/`에 둡니다(예: `src/modules/application/infra/schema.ts`). 연결은 `src/modules/shared/infra/db.ts`를 씁니다.
