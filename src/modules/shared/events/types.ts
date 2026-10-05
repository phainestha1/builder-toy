// 계약 파일. contract/* 브랜치에서만 고친다. 용어는 docs/glossary.md를 따른다.

// 여러 BC가 함께 쓰는 식별자와 값. 모두 그 시점의 사실만 담는다.
export type ApplicationId = string;
export type VisitorId = string;
export type CounselorId = string;
export type PlanId = string;
export type RateTableVersion = string;

/** 원 단위 정수 금액 */
export type Won = number;

/** ISO 8601 UTC 시각 문자열. 예: "2026-10-05T12:00:00.000Z" */
export type IsoDateTime = string;

/** 배정 변형 (`assignedVariant`). `Excluded`는 집계 제외(`제외`)다 */
export type AssignedVariant = "A" | "B" | "Excluded";

/** 모든 도메인 이벤트의 공통 모양. `occurredAt`은 사실이 일어난 서버 시각(UTC)이다 */
export interface DomainEventBase<TType extends string, TPayload> {
  type: TType;
  occurredAt: IsoDateTime;
  payload: TPayload;
}
