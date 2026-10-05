import { describe, expect, it } from "vitest";
import type { CatalogPort } from "@/modules/catalog/ports/catalog-port";
import { InMemoryEventBus } from "@/modules/shared/infra/in-memory-event-bus";
import { createApplicationUseCases } from "../application/application-use-cases";
import { InMemoryApplicationRepository } from "./in-memory-application-repository";

const catalog: CatalogPort = {
  calculateRewardWithCurrentVersion: async () => ({ kind: "Rejected", reason: "EmptyInput" }),
  calculateRewardWithVersion: async () => ({ kind: "Rejected", reason: "EmptyInput" }),
};

describe("메모리 저장소·이벤트 버스 연결", () => {
  it("메모리 이벤트 버스를 EventPublisher로 넣으면 구독자가 LineActivated를 받는다", async () => {
    const bus = new InMemoryEventBus();
    const activated: string[] = [];
    bus.subscribe("LineActivated", (event) => {
      activated.push(event.payload.applicationId);
    });
    const useCases = createApplicationUseCases({
      repository: new InMemoryApplicationRepository(),
      catalog,
      experiment: { findAssignment: async () => null },
      events: bus,
      clock: () => new Date("2026-10-05T00:00:00.000Z"),
      nextApplicationId: () => "app-1",
    });

    await useCases.submitApplication({
      visitorId: "v-1",
      contact: {
        name: "홍길동",
        phoneNumber: "01012345678",
        privacyConsent: true,
        installationRegion: null,
        preferredContactTime: null,
      },
      estimateInput: {
        planId: null,
        hasRemainingCommitment: null,
        remainingCommitmentMonths: null,
        earlyTerminationFee: null,
      },
    });
    await useCases.changeApplicationStatus({ applicationId: "app-1", to: "InConsultation", counselorId: "c-1" });
    await useCases.changeApplicationStatus({ applicationId: "app-1", to: "Activated", counselorId: "c-1" });

    expect(activated).toEqual(["app-1"]);
    expect(bus.published.map((e) => e.type)).toEqual(["ApplicationSubmitted", "ConsultationStarted", "LineActivated"]);
  });
});
