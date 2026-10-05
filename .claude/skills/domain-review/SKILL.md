---
name: domain-review
description: Checker가 브랜치의 변경을 리뷰할 때 사용. "T-xx 리뷰해줘", "브랜치 검증해줘", "/verify" 요청 시. 관점별 서브에이전트로 지적을 모으고, 심각한 지적은 finding-verifier로 다시 확인한다. 코드는 고치지 않는다.
---

# domain-review — 리뷰와 검증

> 내장 `/code-review` 명령과 이름이 겹치지 않도록 `domain-review`라는 이름을 씁니다. 이 프로젝트의 계약, 정책, BC 규칙을 기준으로 리뷰합니다.

## 입력
브랜치 이름, 작업 ID, 완료 기준만 받습니다. Builder의 설명, 의도, 자체 평가는 근거로 쓰지 않습니다.

## 1. 기준 모으기
- `docs/checklists/<작업ID>.md`: 합의한 요구사항과 테스트 케이스
- `docs/glossary.md`, `docs/decisions/`, `.claude/rules/`

## 2. 직접 실행
- `git diff main...<브랜치>`로 변경 범위를 확인합니다.
- `npm run check`를 실행하고 `테스트 실행 N / 통과 N`을 기록합니다. 0건이면 그 자리에서 FAIL입니다.

## 3. 관점별 리뷰 (서브에이전트 병렬)
변경 범위에 맞는 것만 호출합니다.
- `arch-reviewer`: 항상 호출
- `test-reviewer`: 항상 호출
- `security-reviewer`: `/admin`, 인증, 접수 폼, API, 개인정보를 건드린 경우

## 4. 지적 검증
- 심각도가 높은 지적(정책 위반, 데이터 손상, 보안, 경계 위반)은 하나씩 `finding-verifier`에게 넘깁니다.
- **넘기는 것:** 지적 내용과 파일:줄
- **넘기지 않는 것:** 심각도, 확신도, 수정안
- 판정이 "반박"이면 지적에서 뺍니다. "불확실"이면 불확실로 표시해서 남깁니다.

## 5. 판정
- **PASS:** 완료 기준을 모두 충족했고, 확정된 지적이 없음
- **FAIL:** 그 외

결과를 아래 형식으로 Orchestrator에게 보냅니다.
```
작업: T-xx · 브랜치: feat/... · 커밋: <hash>
판정: PASS | FAIL
테스트: 실행 N / 통과 N
완료 기준: [충족] ... / [미충족] ...
지적:
- [확정] path:line — 내용
- [불확실] path:line — 내용 (근거가 부족한 이유)
```
