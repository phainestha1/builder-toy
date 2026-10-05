import { beforeEach, describe, expect, it } from "vitest";
import type { EstimateSnapshotLookup } from "@/modules/application/ports/application-port";
import type {
  CatalogPort,
  EarlyTerminationFeeInput,
  EstimateInput,
  RewardCalculationResult,
} from "@/modules/catalog/ports/catalog-port";
import type { LineActivated, RewardEvent } from "@/modules/shared/events";
import type { Reward, RewardRepository } from "../domain";
import type { EventPublisher } from "./event-publisher";
import { getReward, handleLineActivated, payRewardUseCase, type RewardDeps } from "./reward-use-cases";

const now = "2026-10-06T03:00:00.000Z";

const lineActivated: LineActivated = {
  type: "LineActivated",
  occurredAt: "2026-10-06T02:00:00.000Z",
  payload: { applicationId: "app-1", counselorId: "counselor-1" },
};

function snapshotFound(earlyTerminationFee: EarlyTerminationFeeInput = { kind: "Entered", amount: 500_000 }): EstimateSnapshotLookup {
  const hasRemainingCommitment = earlyTerminationFee.kind !== "NotApplicable";
  return {
    kind: "Found",
    snapshot: {
      applicationId: "app-1",
      input: {
        planId: "plan-1",
        hasRemainingCommitment,
        remainingCommitmentMonths: hasRemainingCommitment ? 12 : null,
        earlyTerminationFee,
      },
      appliedEarlyTerminationFee: 500_000,
      rateTableVersion: "v1",
      // 스냅샷 금액은 일부러 재계산 결과와 다르게 둔다. 산정은 재계산 결과를 써야 한다 (R2)
      estimate: { baseReward: 1, feeCoverage: 1, total: 2 },
    },
  };
}

const recalculated: RewardCalculationResult = {
  kind: "Calculated",
  rateTableVersion: "v1",
  input: {
    planId: "plan-1",
    hasRemainingCommitment: true,
    remainingCommitmentMonths: 12,
    earlyTerminationFee: { kind: "Entered", amount: 500_000 },
  },
  appliedEarlyTerminationFee: 500_000,
  estimate: { baseReward: 400_000, feeCoverage: 300_000, total: 700_000 },
};

class FakeCatalog implements CatalogPort {
  calls: { input: EstimateInput; rateTableVersion: string }[] = [];
  constructor(public result: RewardCalculationResult = recalculated) {}
  async calculateRewardWithCurrentVersion(): Promise<RewardCalculationResult> {
    throw new Error("산정은 현재 버전으로 계산하지 않는다");
  }
  async calculateRewardWithVersion(input: EstimateInput, rateTableVersion: string) {
    this.calls.push({ input, rateTableVersion });
    return this.result;
  }
}

class FakeRewards implements RewardRepository {
  items = new Map<string, Reward>();
  async findByApplicationId(applicationId: string) {
    return this.items.get(applicationId) ?? null;
  }
  async save(reward: Reward) {
    this.items.set(reward.applicationId, reward);
  }
}

class FakePublisher implements EventPublisher {
  published: RewardEvent[] = [];
  async publish(event: RewardEvent) {
    this.published.push(event);
  }
}

let rewards: FakeRewards;
let catalog: FakeCatalog;
let publisher: FakePublisher;
let lookup: EstimateSnapshotLookup;
let deps: RewardDeps;

beforeEach(() => {
  rewards = new FakeRewards();
  catalog = new FakeCatalog();
  publisher = new FakePublisher();
  lookup = snapshotFound();
  deps = {
    rewards,
    catalog,
    applications: { findEstimateSnapshot: async () => lookup },
    publisher,
    now: () => now,
  };
});

describe("지원금 산정 (LineActivated 핸들러)", () => {
  it("R1: LineActivated를 받기 전에는 지원금이 없고 지급 요청도 거절한다", async () => {
    expect(await getReward(deps, "app-1")).toBeNull();
    expect(await payRewardUseCase(deps, { applicationId: "app-1", counselorId: "counselor-1" })).toEqual({
      kind: "Rejected",
      reason: "RewardNotFound",
    });
  });

  it("R2: 스냅샷의 입력과 기준표 버전으로 다시 계산해 산정하고 RewardCalculated를 발행한다", async () => {
    const result = await handleLineActivated(deps, lineActivated);

    expect(catalog.calls).toEqual([
      {
        input: { planId: "plan-1", hasRemainingCommitment: true, remainingCommitmentMonths: 12, earlyTerminationFee: 500_000 },
        rateTableVersion: "v1",
      },
    ]);
    const expected = {
      type: "RewardCalculated",
      occurredAt: now,
      payload: { applicationId: "app-1", rateTableVersion: "v1", baseReward: 400_000, feeCoverage: 300_000, totalReward: 700_000 },
    };
    expect(publisher.published).toEqual([expected]);
    expect(result).toEqual({ kind: "Calculated", events: [expected] });
    expect(await getReward(deps, "app-1")).toMatchObject({ status: "Calculated", totalReward: 700_000 });
  });

  it.each([
    ["Unknown(모름)", { kind: "Unknown" } as const, { hasRemainingCommitment: true, remainingCommitmentMonths: 12, earlyTerminationFee: null }],
    ["NotApplicable(약정 아니요)", { kind: "NotApplicable" } as const, { hasRemainingCommitment: false, remainingCommitmentMonths: null, earlyTerminationFee: null }],
  ])("R2: 스냅샷 위약금이 %s이면 계산 입력의 위약금을 null로 넘긴다", async (_, fee, expectedInput) => {
    lookup = snapshotFound(fee);

    await handleLineActivated(deps, lineActivated);

    expect(catalog.calls[0].input).toEqual({ planId: "plan-1", ...expectedInput });
  });

  it("R3: 스냅샷이 없으면 산정 대상 아님으로 두고 RewardCalculated를 내지 않는다", async () => {
    lookup = { kind: "NoSnapshot", applicationId: "app-1" };

    const result = await handleLineActivated(deps, lineActivated);

    expect(result).toEqual({ kind: "NotEligible", events: [] });
    expect(publisher.published).toEqual([]);
    expect(catalog.calls).toEqual([]);
    expect(await getReward(deps, "app-1")).toMatchObject({ status: "NotEligible" });
  });

  it("R4: 같은 LineActivated를 두 번 받아도 한 번만 산정한다", async () => {
    await handleLineActivated(deps, lineActivated);
    const second = await handleLineActivated(deps, lineActivated);

    expect(second).toEqual({ kind: "AlreadyExists", events: [] });
    expect(catalog.calls).toHaveLength(1);
    expect(publisher.published).toHaveLength(1);
    expect(rewards.items.size).toBe(1);
  });

  it("R4: 산정 대상 아님 뒤에 같은 이벤트를 다시 받아도 지원금은 하나 그대로다", async () => {
    lookup = { kind: "NoSnapshot", applicationId: "app-1" };
    await handleLineActivated(deps, lineActivated);
    lookup = snapshotFound();

    const second = await handleLineActivated(deps, lineActivated);

    expect(second.kind).toBe("AlreadyExists");
    expect(await getReward(deps, "app-1")).toMatchObject({ status: "NotEligible" });
  });

  it("R2: 접수를 찾을 수 없으면 지원금을 만들지 않는다", async () => {
    lookup = { kind: "ApplicationNotFound", applicationId: "app-1" };

    const result = await handleLineActivated(deps, lineActivated);

    expect(result).toEqual({ kind: "Failed", reason: "ApplicationNotFound", events: [] });
    expect(rewards.items.size).toBe(0);
  });

  it("R2: 다시 계산한 결과가 계산됨이 아니면 지원금을 만들지 않는다", async () => {
    catalog.result = { kind: "Rejected", reason: "UnknownRateTableVersion" };

    const result = await handleLineActivated(deps, lineActivated);

    expect(result).toEqual({ kind: "Failed", reason: "RecalculationFailed", events: [] });
    expect(rewards.items.size).toBe(0);
    expect(publisher.published).toEqual([]);
  });
});

describe("지급 유스케이스", () => {
  it("R5·R6: 산정됨 지원금을 지급하면 RewardPaid를 발행하고, 두 번째 지급은 거절한다", async () => {
    await handleLineActivated(deps, lineActivated);
    publisher.published = [];

    const first = await payRewardUseCase(deps, { applicationId: "app-1", counselorId: "counselor-9" });
    const second = await payRewardUseCase(deps, { applicationId: "app-1", counselorId: "counselor-9" });

    const expected = {
      type: "RewardPaid",
      occurredAt: now,
      payload: { applicationId: "app-1", counselorId: "counselor-9", totalReward: 700_000 },
    };
    expect(first).toEqual({ kind: "Paid", events: [expected] });
    expect(second).toEqual({ kind: "Rejected", reason: "AlreadyPaid" });
    expect(publisher.published).toEqual([expected]);
    expect(await getReward(deps, "app-1")).toMatchObject({ status: "Paid", paidBy: "counselor-9", paidAt: now });
  });

  it("R5: 산정 대상 아님 지원금의 지급 요청은 거절하고 발행하지 않는다", async () => {
    lookup = { kind: "NoSnapshot", applicationId: "app-1" };
    await handleLineActivated(deps, lineActivated);

    const result = await payRewardUseCase(deps, { applicationId: "app-1", counselorId: "counselor-1" });

    expect(result).toEqual({ kind: "Rejected", reason: "NotEligible" });
    expect(publisher.published).toEqual([]);
  });
});
