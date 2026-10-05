import { describe, expect, expectTypeOf, it } from "vitest";
import {
  DOMAIN_EVENT_TYPES,
  type DomainEvent,
  type DomainEventType,
  type EventOfType,
} from "./index";

const occurredAt = "2026-10-05T03:00:00.000Z";

// 이벤트 종류마다 예시 하나. 종류가 빠지거나 payload가 계약과 다르면 타입 검사가 실패한다.
const sampleEvents: { [T in DomainEventType]: EventOfType<T> } = {
  ApplicationSubmitted: {
    type: "ApplicationSubmitted",
    occurredAt,
    payload: { applicationId: "app-1", visitorId: "visitor-1", assignedVariant: "A" },
  },
  ApplicationMerged: {
    type: "ApplicationMerged",
    occurredAt,
    payload: { applicationId: "app-1", resubmissionCount: 1 },
  },
  ConsultationStarted: {
    type: "ConsultationStarted",
    occurredAt,
    payload: { applicationId: "app-1", counselorId: "counselor-1" },
  },
  LineActivated: {
    type: "LineActivated",
    occurredAt,
    payload: { applicationId: "app-1", counselorId: "counselor-1" },
  },
  ApplicationCancelled: {
    type: "ApplicationCancelled",
    occurredAt,
    payload: { applicationId: "app-1", counselorId: "counselor-1" },
  },
  RewardCalculated: {
    type: "RewardCalculated",
    occurredAt,
    payload: {
      applicationId: "app-1",
      rateTableVersion: "v1",
      baseReward: 400_000,
      feeCoverage: 300_000,
      totalReward: 700_000,
    },
  },
  RewardPaid: {
    type: "RewardPaid",
    occurredAt,
    payload: { applicationId: "app-1", counselorId: "counselor-1", totalReward: 700_000 },
  },
};

type PayloadKeys<E> = E extends { payload: infer P } ? keyof P : never;
type PersonalDataKey =
  | "phoneNumber"
  | "maskedPhoneNumber"
  | "name"
  | "customerName"
  | "installationRegion"
  | "preferredContactTime";

describe("도메인 이벤트 계약", () => {
  it("계약 이벤트는 용어 사전 5절의 7개다", () => {
    expect([...DOMAIN_EVENT_TYPES].sort()).toEqual(
      [
        "ApplicationSubmitted",
        "ApplicationMerged",
        "ConsultationStarted",
        "LineActivated",
        "ApplicationCancelled",
        "RewardCalculated",
        "RewardPaid",
      ].sort(),
    );
    expect(Object.keys(sampleEvents).sort()).toEqual([...DOMAIN_EVENT_TYPES].sort());
  });

  it("이벤트 이름은 과거형이고 쓰지 않는 이름(RewardScheduled, ConsultationCompleted)이 없다", () => {
    for (const type of DOMAIN_EVENT_TYPES) {
      expect(type).toMatch(/(ed|Paid)$/);
    }
    expect(DOMAIN_EVENT_TYPES).not.toContain("RewardScheduled");
    expect(DOMAIN_EVENT_TYPES).not.toContain("ConsultationCompleted");
  });

  it("P1: 이벤트 payload에 개인정보(전화번호, 이름 등)를 넣지 않는다", () => {
    expectTypeOf<Extract<PayloadKeys<DomainEvent>, PersonalDataKey>>().toEqualTypeOf<never>();

    for (const event of Object.values(sampleEvents)) {
      for (const key of Object.keys(event.payload)) {
        expect(key).not.toMatch(/phone|name|region|contact/i);
      }
    }
  });

  it("ApplicationSubmitted는 접수 ID, visitorId, 배정 변형(A/B/Excluded)을 담는다", () => {
    expectTypeOf<EventOfType<"ApplicationSubmitted">["payload"]>().toEqualTypeOf<{
      applicationId: string;
      visitorId: string;
      assignedVariant: "A" | "B" | "Excluded";
    }>();
    expect(sampleEvents.ApplicationSubmitted.payload).toEqual({
      applicationId: "app-1",
      visitorId: "visitor-1",
      assignedVariant: "A",
    });
  });
});
