import { describe, expect, it } from "vitest";
import type { EstimateInput } from "@/modules/catalog/ports/catalog-port";
import { calculateReward } from "./calculate-reward";
import { createPlan, createRateTable } from "./rate-table";

const plans = [
  createPlan({ id: "plan-500", name: "인터넷 500M", monthlyFee: 33_000, speed: "500M", includesTv: false }),
  createPlan({ id: "plan-1g", name: "인터넷 1G", monthlyFee: 38_500, speed: "1G", includesTv: false }),
  createPlan({ id: "plan-old", name: "인터넷 100M (판매 종료)", monthlyFee: 22_000, speed: "100M", includesTv: false }),
];
const planExists = (id: string) => plans.some((plan) => plan.id === id);

const v1 = createRateTable({
  version: "v1",
  baseRewards: { "plan-500": 400_000, "plan-1g": 450_000 },
  averageEarlyTerminationFee: 200_000,
  feeCoverageCap: 300_000,
});

function input(overrides: Partial<EstimateInput>): EstimateInput {
  return {
    planId: "plan-500",
    hasRemainingCommitment: true,
    remainingCommitmentMonths: 12,
    earlyTerminationFee: 200_000,
    ...overrides,
  };
}

function calc(estimateInput: EstimateInput, table = v1) {
  return calculateReward(estimateInput, table, planExists);
}

function totalOf(estimateInput: EstimateInput, table = v1) {
  const result = calc(estimateInput, table);
  if (result.kind !== "Calculated") throw new Error(`계산되지 않음: ${result.kind}`);
  return result;
}

describe("C1 지원금 계산 = 기본 지원금 + 위약금 보전액", () => {
  it("C1: 기본 400,000 + 위약금 200,000 → 합계 600,000", () => {
    const result = totalOf(input({}));
    expect(result.estimate).toEqual({ baseReward: 400_000, feeCoverage: 200_000, total: 600_000 });
    expect(result.appliedEarlyTerminationFee).toBe(200_000);
    expect(result.rateTableVersion).toBe("v1");
    expect(result.input.earlyTerminationFee).toEqual({ kind: "Entered", amount: 200_000 });
  });

  it.each([
    [299_999, 299_999],
    [300_000, 300_000],
    [300_001, 300_000],
  ])("C1·C2: 위약금 %i원이면 보전액은 보전 한도 30만 원 안에서 %i원", (fee, coverage) => {
    expect(totalOf(input({ earlyTerminationFee: fee })).estimate.feeCoverage).toBe(coverage);
  });

  it("C2: 보전 한도는 기준표 버전에 속한다 (버전마다 다른 한도)", () => {
    const v2 = createRateTable({
      version: "v2",
      baseRewards: { "plan-500": 400_000 },
      averageEarlyTerminationFee: 200_000,
      feeCoverageCap: 100_000,
    });
    expect(totalOf(input({ earlyTerminationFee: 250_000 }), v2).estimate.feeCoverage).toBe(100_000);
  });
});

describe("C3 약정 없음", () => {
  it("C3: 약정이 없으면 위약금 보전액은 0원이고 합계는 기본 지원금이다", () => {
    const result = totalOf(
      input({ hasRemainingCommitment: false, remainingCommitmentMonths: null, earlyTerminationFee: null }),
    );
    expect(result.estimate).toEqual({ baseReward: 400_000, feeCoverage: 0, total: 400_000 });
    expect(result.appliedEarlyTerminationFee).toBe(0);
    expect(result.input).toEqual({
      planId: "plan-500",
      hasRemainingCommitment: false,
      remainingCommitmentMonths: null,
      earlyTerminationFee: { kind: "NotApplicable" },
    });
  });
});

describe("C4 계산 입력 검증", () => {
  it.each([
    [12, 500_000],
    [99, -1],
  ])("C4: 약정 아니요면 남은 약정 개월(%i)과 위약금(%i)을 검사 없이 먼저 버리고 계산한다", (months, fee) => {
    const result = totalOf(
      input({ hasRemainingCommitment: false, remainingCommitmentMonths: months, earlyTerminationFee: fee }),
    );
    expect(result.estimate.total).toBe(400_000);
    expect(result.input.remainingCommitmentMonths).toBeNull();
    expect(result.input.earlyTerminationFee).toEqual({ kind: "NotApplicable" });
  });

  it("C4: 입력이 전부 비었으면 EmptyInput으로 거절한다", () => {
    expect(
      calc({ planId: null, hasRemainingCommitment: null, remainingCommitmentMonths: null, earlyTerminationFee: null }),
    ).toEqual({ kind: "Rejected", reason: "EmptyInput" });
  });

  it.each<[string, EstimateInput]>([
    ["위약금만", { planId: null, hasRemainingCommitment: null, remainingCommitmentMonths: null, earlyTerminationFee: 100_000 }],
    ["요금제만", { planId: "plan-500", hasRemainingCommitment: null, remainingCommitmentMonths: null, earlyTerminationFee: null }],
    ["약정 예인데 개월 없음", input({ remainingCommitmentMonths: null })],
    ["요금제 없이 약정 아니요", input({ planId: null, hasRemainingCommitment: false })],
  ])("C4: 일부만 있으면(%s) PartialInput으로 거절한다", (_label, estimateInput) => {
    expect(calc(estimateInput)).toEqual({ kind: "Rejected", reason: "PartialInput" });
  });

  it.each([0, 36])("C4: 약정 예일 때 남은 약정 개월 %i은 받는다", (months) => {
    expect(calc(input({ remainingCommitmentMonths: months })).kind).toBe("Calculated");
  });

  it.each([-1, 37, 1.5])("C4: 약정 예일 때 남은 약정 개월 %d은 OutOfRange로 거절한다", (months) => {
    expect(calc(input({ remainingCommitmentMonths: months }))).toEqual({ kind: "Rejected", reason: "OutOfRange" });
  });

  it.each([0, 10_000_000])("C4: 약정 예일 때 위약금 %i원은 받는다", (fee) => {
    expect(calc(input({ earlyTerminationFee: fee })).kind).toBe("Calculated");
  });

  it.each([-1, 10_000_001, 0.5])("C4: 약정 예일 때 위약금 %d원은 OutOfRange로 거절한다", (fee) => {
    expect(calc(input({ earlyTerminationFee: fee }))).toEqual({ kind: "Rejected", reason: "OutOfRange" });
  });

  it("C4: 존재하지 않는 요금제 ID는 UnknownPlan으로 거절한다", () => {
    expect(calc(input({ planId: "plan-nope" }))).toEqual({ kind: "Rejected", reason: "UnknownPlan" });
  });
});

describe("C5 위약금 모름", () => {
  it("C5: 약정 예인데 위약금이 빈 칸이면 기준표 버전의 평균 위약금을 쓴다", () => {
    const result = totalOf(input({ earlyTerminationFee: null }));
    expect(result.input.earlyTerminationFee).toEqual({ kind: "Unknown" });
    expect(result.appliedEarlyTerminationFee).toBe(200_000);
    expect(result.estimate).toEqual({ baseReward: 400_000, feeCoverage: 200_000, total: 600_000 });
  });
});

describe("C6 기준표 버전에 없는 요금제", () => {
  it("C6: 요금제는 있지만 기준표 버전에 없으면 거절하지 않고 PlanNotInRateTable을 돌려준다", () => {
    expect(calc(input({ planId: "plan-old" }))).toEqual({
      kind: "PlanNotInRateTable",
      rateTableVersion: "v1",
      planId: "plan-old",
    });
  });
});

describe("C7 기준표 버전은 고치지 않는다", () => {
  it("C7: 만든 기준표 버전은 값을 바꿀 수 없다", () => {
    expect(() => {
      (v1 as { feeCoverageCap: number }).feeCoverageCap = 1;
    }).toThrow();
    expect(() => {
      (v1.baseRewards as Record<string, number>)["plan-500"] = 1;
    }).toThrow();
    expect(totalOf(input({})).estimate.total).toBe(600_000);
  });

  it("C7: 같은 입력도 버전마다 그 버전의 값으로 계산한다", () => {
    const v2 = createRateTable({
      version: "v2",
      baseRewards: { "plan-500": 350_000 },
      averageEarlyTerminationFee: 150_000,
      feeCoverageCap: 300_000,
    });
    expect(totalOf(input({ earlyTerminationFee: null }), v1).estimate.total).toBe(600_000);
    const second = totalOf(input({ earlyTerminationFee: null }), v2);
    expect(second.rateTableVersion).toBe("v2");
    expect(second.estimate.total).toBe(500_000);
  });
});
