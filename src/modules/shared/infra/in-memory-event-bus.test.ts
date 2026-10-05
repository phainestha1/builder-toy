import { describe, expect, it } from "vitest";
import type { DomainEvent } from "@/modules/shared/events";
import { InMemoryEventBus } from "./in-memory-event-bus";

const occurredAt = "2026-10-05T03:00:00.000Z";
const activated: DomainEvent = {
  type: "LineActivated",
  occurredAt,
  payload: { applicationId: "app-1", counselorId: "counselor-1" },
};
const cancelled: DomainEvent = {
  type: "ApplicationCancelled",
  occurredAt,
  payload: { applicationId: "app-2", counselorId: "counselor-1" },
};

describe("메모리 이벤트 버스", () => {
  it("구독한 종류의 이벤트만 받는다", async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];
    bus.subscribe("LineActivated", async (event) => {
      received.push(event.payload.applicationId);
    });
    await bus.publish(activated);
    await bus.publish(cancelled);
    expect(received).toEqual(["app-1"]);
  });

  it("구독자가 여럿이면 모두 받고, publish는 처리가 끝난 뒤 돌아온다", async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];
    bus.subscribe("LineActivated", async () => {
      await Promise.resolve();
      received.push("reward");
    });
    bus.subscribe("LineActivated", () => {
      received.push("other");
    });
    await bus.publish(activated);
    expect(received).toEqual(["reward", "other"]);
  });

  it("발행한 이벤트를 순서대로 남긴다 (테스트 확인용)", async () => {
    const bus = new InMemoryEventBus();
    await bus.publish(activated);
    await bus.publish(cancelled);
    expect(bus.published.map((e) => e.type)).toEqual(["LineActivated", "ApplicationCancelled"]);
  });
});
