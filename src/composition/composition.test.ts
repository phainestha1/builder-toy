import { describe, expect, it, vi } from "vitest";
import { createSeedCatalogRepository } from "@/modules/catalog/infra/seed";
import { MemoryExperimentRepository } from "@/modules/experiment/infra/memory-experiment-repository";
import type { EstimateInput } from "@/modules/catalog/ports/catalog-port";
import { InMemoryEventBus } from "@/modules/shared/infra/in-memory-event-bus";
import { createApplication } from "./application";
import { createCatalog } from "./catalog";
import { createExperiment } from "./experiment";
import { registerSubscriptions } from "./subscriptions";
import { createReward } from "./reward";

const clock = () => new Date("2026-10-05T00:00:00.000Z");

const calculatedInput: EstimateInput = {
  planId: "plan-500m",
  hasRemainingCommitment: true,
  remainingCommitmentMonths: 12,
  earlyTerminationFee: null,
};

const emptyInput: EstimateInput = {
  planId: null,
  hasRemainingCommitment: null,
  remainingCommitmentMonths: null,
  earlyTerminationFee: null,
};

/** 새 버스와 4개 BC를 팩토리로 조립한다. 저장소는 테스트에서 들여다볼 수 있게 밖에서 넣는다 */
function assemble() {
  const bus = new InMemoryEventBus();
  const experimentRepository = new MemoryExperimentRepository();
  let nextId = 0;

  const catalog = createCatalog({ repository: createSeedCatalogRepository() });
  const experiment = createExperiment({ repository: experimentRepository, pickVariant: () => "B", clock });
  const application = createApplication({
    catalog: catalog.port,
    experiment: experiment.port,
    events: bus,
    clock,
    nextApplicationId: () => `app-${++nextId}`,
  });
  const reward = createReward({ applications: application.port, catalog: catalog.port, publisher: bus, clock });
  registerSubscriptions(bus, { experiment, reward });

  return { bus, experimentRepository, catalog, experiment, application, reward };
}

function submit(app: ReturnType<typeof assemble>, visitorId: string, phoneNumber: string, estimateInput: EstimateInput) {
  return app.application.submitApplication({
    visitorId,
    contact: {
      name: "홍길동",
      phoneNumber,
      privacyConsent: true,
      installationRegion: null,
      preferredContactTime: null,
    },
    estimateInput,
  });
}

async function activate(app: ReturnType<typeof assemble>, applicationId: string) {
  await app.application.changeApplicationStatus({ applicationId, to: "InConsultation", counselorId: "c-1" });
  await app.application.changeApplicationStatus({ applicationId, to: "Activated", counselorId: "c-1" });
}

describe("조립 위치 (composition root)", () => {
  it("E5: 랜딩에서 배정받은 방문자가 접수하면 ApplicationSubmitted로 전환 1건이 배정 변형으로 기록된다", async () => {
    const app = assemble();
    const variant = await app.experiment.ensureAssignment({ visitorId: "v-1", screen: "Landing" });
    expect(["A", "B"]).toContain(variant);

    const result = await submit(app, "v-1", "01012345678", calculatedInput);

    expect(result.kind).toBe("Submitted");
    expect(app.bus.published.map((e) => e.type)).toEqual(["ApplicationSubmitted"]);
    expect(await app.experimentRepository.findConversion("v-1")).toMatchObject({ variant, applicationId: "app-1" });
  });

  it("E1·E2: 03으로 처음 온 방문자는 제외이고, 접수하면 전환이 제외로 기록된다", async () => {
    const app = assemble();
    expect(await app.experiment.ensureAssignment({ visitorId: "v-2", screen: "Calculator" })).toBe("Excluded");

    await submit(app, "v-2", "01012345678", calculatedInput);

    expect(await app.experimentRepository.findConversion("v-2")).toMatchObject({ variant: "Excluded" });
  });

  it("R1·R2: 접수 → 상담중 → 개통완료면 지원금이 스냅샷 합계로 산정되고 RewardCalculated가 발행된다", async () => {
    const app = assemble();
    const submitted = await submit(app, "v-1", "01012345678", calculatedInput);
    if (submitted.kind !== "Submitted" || submitted.estimate === null) throw new Error("접수 실패");

    await activate(app, submitted.applicationId);

    // 시드 v1: 기본 지원금 400,000 + 위약금 보전액 200,000(평균 위약금) = 600,000
    expect(submitted.estimate.total).toBe(600_000);
    expect(await app.reward.getReward(submitted.applicationId)).toMatchObject({
      status: "Calculated",
      baseReward: 400_000,
      feeCoverage: 200_000,
      totalReward: 600_000,
    });
    expect(app.bus.published.map((e) => e.type)).toEqual([
      "ApplicationSubmitted",
      "ConsultationStarted",
      "LineActivated",
      "RewardCalculated",
    ]);
  });

  it("R3: 계산 없이 접수한 건을 개통하면 산정 대상 아님이고 RewardCalculated가 없다", async () => {
    const app = assemble();
    const submitted = await submit(app, "v-1", "01012345678", emptyInput);
    if (submitted.kind !== "Submitted") throw new Error("접수 실패");

    await activate(app, submitted.applicationId);

    expect(await app.reward.getReward(submitted.applicationId)).toMatchObject({ status: "NotEligible" });
    expect(app.bus.published.some((e) => e.type === "RewardCalculated")).toBe(false);
  });

  it("구독 등록을 두 번 불러도 핸들러는 한 번만 실행된다 (핫 리로드 대비)", async () => {
    const bus = new InMemoryEventBus();
    const handlers = {
      experiment: { handleApplicationSubmitted: vi.fn(async () => ({ kind: "Recorded" as const })) },
      reward: { handleLineActivated: vi.fn(async () => ({ kind: "NotEligible" as const, events: [] as [] })) },
    };
    registerSubscriptions(bus, handlers);
    registerSubscriptions(bus, handlers);

    await bus.publish({
      type: "ApplicationSubmitted",
      occurredAt: clock().toISOString(),
      payload: { applicationId: "app-1", visitorId: "v-1", assignedVariant: "A" },
    });
    await bus.publish({
      type: "LineActivated",
      occurredAt: clock().toISOString(),
      payload: { applicationId: "app-1", counselorId: "c-1" },
    });

    expect(handlers.experiment.handleApplicationSubmitted).toHaveBeenCalledTimes(1);
    expect(handlers.reward.handleLineActivated).toHaveBeenCalledTimes(1);
  });

  it("싱글턴: 모듈을 다시 평가해도 @/composition은 같은 인스턴스를 준다", async () => {
    const first = await import("@/composition");
    vi.resetModules();
    const second = await import("@/composition");

    expect(second.eventBus).toBe(first.eventBus);
    expect(second.catalog).toBe(first.catalog);
    expect(second.experiment).toBe(first.experiment);
    expect(second.application).toBe(first.application);
    expect(second.reward).toBe(first.reward);
  });
});
