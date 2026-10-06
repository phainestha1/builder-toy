import { describe, expect, it } from "vitest";
import type { EstimateInput } from "@/modules/catalog/ports/catalog-port";
import { createPlan, createRateTable, type RewardRateTable } from "../domain/rate-table";
import type { CatalogRepository } from "./catalog-repository";
import { estimateReward, estimateRewardWithVersion, listPlanComparison } from "./catalog-use-cases";

const plans = [
  createPlan({ id: "plan-500", name: "인터넷 500M", monthlyFee: 33_000, speed: "500M", includesTv: false }),
  createPlan({ id: "plan-1g", name: "인터넷 1G", monthlyFee: 38_500, speed: "1G", includesTv: false }),
  createPlan({ id: "plan-old", name: "인터넷 100M", monthlyFee: 22_000, speed: "100M", includesTv: false }),
];
const v1 = createRateTable({
  version: "v1",
  baseRewards: { "plan-500": 400_000, "plan-1g": 450_000 },
  averageEarlyTerminationFee: 200_000,
  feeCoverageCap: 300_000,
});
const v2 = createRateTable({
  version: "v2",
  baseRewards: { "plan-500": 350_000 },
  averageEarlyTerminationFee: 200_000,
  feeCoverageCap: 300_000,
});

function fakeRepository(current: RewardRateTable, tables = [v1, v2]): CatalogRepository {
  return {
    listPlans: async () => plans,
    findCurrentRateTable: async () => current,
    findRateTable: async (version) => tables.find((t) => t.version === version) ?? null,
  };
}

const noCommitment = (planId: string): EstimateInput => ({
  planId,
  hasRemainingCommitment: false,
  remainingCommitmentMonths: null,
  earlyTerminationFee: null,
});

describe("지원금 계산기 (03)", () => {
  it("C4: 계산기에서 입력이 전부 비면 거절한다", async () => {
    const result = await estimateReward(fakeRepository(v1), {
      planId: null,
      hasRemainingCommitment: null,
      remainingCommitmentMonths: null,
      earlyTerminationFee: null,
    });
    expect(result).toEqual({ kind: "Rejected", reason: "EmptyInput" });
  });

  it("C7: 계산기는 현재 기준표 버전으로 계산한다", async () => {
    const result = await estimateReward(fakeRepository(v2), noCommitment("plan-500"));
    expect(result).toMatchObject({ kind: "Calculated", rateTableVersion: "v2", estimate: { total: 350_000 } });
  });

  it("C7: 버전을 지정하면 현재 버전이 바뀌어도 그 버전으로 계산한다", async () => {
    const result = await estimateRewardWithVersion(fakeRepository(v2), noCommitment("plan-500"), "v1");
    expect(result).toMatchObject({ kind: "Calculated", rateTableVersion: "v1", estimate: { total: 400_000 } });
  });

  it("없는 기준표 버전을 지정하면 UnknownRateTableVersion으로 거절한다", async () => {
    expect(await estimateRewardWithVersion(fakeRepository(v1), noCommitment("plan-500"), "v9")).toEqual({
      kind: "Rejected",
      reason: "UnknownRateTableVersion",
    });
  });
});

describe("요금제 비교 (02)", () => {
  it("C8: 카드 금액은 기본 지원금이고, 계산기에서 약정 없음을 고른 합계와 같다", async () => {
    const repository = fakeRepository(v1);
    const cards = await listPlanComparison(repository);
    const card = cards.find((c) => c.planId === "plan-1g");
    expect(card?.rewardEstimate).toBe(450_000);

    const calculated = await estimateReward(repository, noCommitment("plan-1g"));
    if (calculated.kind !== "Calculated") throw new Error(calculated.kind);
    expect(calculated.estimate.total).toBe(card?.rewardEstimate);
  });

  it("C6: 현재 기준표 버전에 없는 요금제는 카드 금액이 없다 (지원금 상담 시 안내)", async () => {
    const cards = await listPlanComparison(fakeRepository(v1));
    expect(cards.find((c) => c.planId === "plan-old")).toMatchObject({ rewardEstimate: null });
    expect(cards).toHaveLength(3);
  });
});
