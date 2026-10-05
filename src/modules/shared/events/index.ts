// 계약 파일. BC 사이 도메인 이벤트 7개 (docs/glossary.md 5절).
import type { ApplicationEvent } from "./application-events";
import type { RewardEvent } from "./reward-events";

export type * from "./types";
export type * from "./application-events";
export type * from "./reward-events";

export type DomainEvent = ApplicationEvent | RewardEvent;
export type DomainEventType = DomainEvent["type"];

/** 계약 이벤트 이름 목록. 타입과 어긋나면 타입 검사가 실패한다 */
export const DOMAIN_EVENT_TYPES = [
  "ApplicationSubmitted",
  "ApplicationMerged",
  "ConsultationStarted",
  "LineActivated",
  "ApplicationCancelled",
  "RewardCalculated",
  "RewardPaid",
] as const satisfies readonly DomainEventType[];

export type EventOfType<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
