import { beforeEach, describe, expect, it } from "vitest";
import type { RewardCalculationResult } from "@/modules/catalog/ports/catalog-port";
import type { ApplicationSubmitted, AssignedVariant } from "@/modules/shared/events";
import type {
  Assignment,
  Conversion,
  EstimateRecord,
  ExperimentRepository,
  Exposure,
  Variant,
} from "../domain";
import {
  ensureAssignment,
  handleApplicationSubmitted,
  isCalculatorUser,
  recordExposure,
  recordRewardEstimated,
  type ExperimentDeps,
} from "./experiment-use-cases";

const now = "2026-10-05T03:00:00.000Z";

class FakeExperiments implements ExperimentRepository {
  assignments = new Map<string, Assignment>();
  exposures = new Map<string, Exposure>();
  estimates: EstimateRecord[] = [];
  conversions = new Map<string, Conversion>();
  failSaveAssignment = false;

  async findAssignment(visitorId: string) {
    return this.assignments.get(visitorId) ?? null;
  }
  async saveAssignment(assignment: Assignment) {
    if (this.failSaveAssignment) throw new Error("저장 실패");
    this.assignments.set(assignment.visitorId, assignment);
  }
  async findExposure(visitorId: string) {
    return this.exposures.get(visitorId) ?? null;
  }
  async saveExposure(exposure: Exposure) {
    this.exposures.set(exposure.visitorId, exposure);
  }
  async addEstimateRecord(record: EstimateRecord) {
    this.estimates.push(record);
  }
  async listEstimateRecords(visitorId: string) {
    return this.estimates.filter((r) => r.visitorId === visitorId);
  }
  async findConversion(visitorId: string) {
    return this.conversions.get(visitorId) ?? null;
  }
  async saveConversion(conversion: Conversion) {
    this.conversions.set(conversion.visitorId, conversion);
  }
}

const calculated: RewardCalculationResult = {
  kind: "Calculated",
  rateTableVersion: "v1",
  input: {
    planId: "plan-1",
    hasRemainingCommitment: false,
    remainingCommitmentMonths: null,
    earlyTerminationFee: { kind: "NotApplicable" },
  },
  appliedEarlyTerminationFee: 0,
  estimate: { baseReward: 400_000, feeCoverage: 0, total: 400_000 },
};

function submitted(visitorId: string, applicationId: string, assignedVariant: AssignedVariant): ApplicationSubmitted {
  return { type: "ApplicationSubmitted", occurredAt: now, payload: { applicationId, visitorId, assignedVariant } };
}

let experiments: FakeExperiments;
let pickCount: number;
let nextVariant: Variant;
let deps: ExperimentDeps;

beforeEach(() => {
  experiments = new FakeExperiments();
  pickCount = 0;
  nextVariant = "B";
  deps = {
    experiments,
    pickVariant: () => {
      pickCount += 1;
      return nextVariant;
    },
    now: () => now,
  };
});

describe("배정 확인 유스케이스", () => {
  it("E1: 랜딩으로 처음 들어오면 변형을 골라 배정 레코드를 만든다", async () => {
    expect(await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" })).toBe("B");
    expect(experiments.assignments.get("v-1")).toEqual({ visitorId: "v-1", variant: "B", assignedAt: now });
  });

  it("E1: 다시 들어오면 변형을 다시 고르지 않고 같은 값을 돌려준다", async () => {
    await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" });
    nextVariant = "A";

    expect(await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" })).toBe("B");
    expect(await ensureAssignment(deps, { visitorId: "v-1", screen: "Calculator" })).toBe("B");
    expect(pickCount).toBe(1);
  });

  it("E1·E2: 계산기로 처음 들어온 방문자는 제외이고, 나중에 랜딩에 와도 제외 그대로다", async () => {
    expect(await ensureAssignment(deps, { visitorId: "v-1", screen: "Calculator" })).toBe("Excluded");
    expect(await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" })).toBe("Excluded");
    expect(pickCount).toBe(0);
  });

  it("E1: 변형 선택에 실패하면 제외로 저장한다", async () => {
    deps.pickVariant = () => {
      throw new Error("선택 실패");
    };

    expect(await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" })).toBe("Excluded");
    expect(experiments.assignments.get("v-1")?.variant).toBe("Excluded");
  });

  it("E1: 배정 레코드 저장에 실패하면 제외를 돌려주고, 다음 진입 때 들어온 화면으로 다시 정한다", async () => {
    experiments.failSaveAssignment = true;
    expect(await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" })).toBe("Excluded");
    expect(experiments.assignments.size).toBe(0);

    experiments.failSaveAssignment = false;
    expect(await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" })).toBe("B");
  });
});

describe("노출 기록", () => {
  it("E3: 같은 방문자의 노출은 첫 1회만 배정 변형으로 기록한다", async () => {
    await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" });

    expect(await recordExposure(deps, { visitorId: "v-1" })).toEqual({ kind: "Recorded" });
    expect(await recordExposure(deps, { visitorId: "v-1" })).toEqual({ kind: "AlreadyRecorded" });
    expect([...experiments.exposures.values()]).toEqual([{ visitorId: "v-1", variant: "B", recordedAt: now }]);
  });

  it("E2: 제외 방문자의 노출도 제외 표시를 달아 기록한다", async () => {
    await ensureAssignment(deps, { visitorId: "v-1", screen: "PlanComparison" });

    await recordExposure(deps, { visitorId: "v-1" });

    expect(experiments.exposures.get("v-1")?.variant).toBe("Excluded");
  });
});

describe("계산 기록", () => {
  it("E4: 계산됨 결과면 계산할 때마다 기록하고, 그 방문자는 계산기 사용자다", async () => {
    await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" });

    expect(await recordRewardEstimated(deps, { visitorId: "v-1", result: calculated })).toEqual({ kind: "Recorded" });
    await recordRewardEstimated(deps, { visitorId: "v-1", result: calculated });

    expect(experiments.estimates).toEqual([
      { visitorId: "v-1", variant: "B", rateTableVersion: "v1", recordedAt: now },
      { visitorId: "v-1", variant: "B", rateTableVersion: "v1", recordedAt: now },
    ]);
    expect(await isCalculatorUser(deps, "v-1")).toBe(true);
  });

  it.each<[string, RewardCalculationResult]>([
    ["입력 거절", { kind: "Rejected", reason: "PartialInput" }],
    ["기준표 버전에 없는 요금제", { kind: "PlanNotInRateTable", rateTableVersion: "v1", planId: "plan-9" }],
  ])("E4: %s 결과면 기록하지 않고 계산기 사용자가 아니다", async (_, result) => {
    expect(await recordRewardEstimated(deps, { visitorId: "v-1", result })).toEqual({ kind: "Skipped" });
    expect(experiments.estimates).toEqual([]);
    expect(await isCalculatorUser(deps, "v-1")).toBe(false);
  });

  it("E2: 제외 방문자의 계산 기록에도 제외 표시를 단다", async () => {
    await ensureAssignment(deps, { visitorId: "v-1", screen: "Calculator" });

    await recordRewardEstimated(deps, { visitorId: "v-1", result: calculated });

    expect(experiments.estimates[0].variant).toBe("Excluded");
  });
});

describe("전환 기록 (ApplicationSubmitted 핸들러)", () => {
  it("E5: 접수에 기록된 배정 변형으로 전환을 기록한다", async () => {
    expect(await handleApplicationSubmitted(deps, submitted("v-1", "app-1", "A"))).toEqual({ kind: "Recorded" });
    expect(experiments.conversions.get("v-1")).toEqual({
      visitorId: "v-1",
      applicationId: "app-1",
      variant: "A",
      recordedAt: now,
    });
  });

  it("E5·E2: 현재 배정 레코드가 A여도 접수의 변형이 제외면 제외로 기록한다", async () => {
    nextVariant = "A";
    await ensureAssignment(deps, { visitorId: "v-1", screen: "Landing" });

    await handleApplicationSubmitted(deps, submitted("v-1", "app-1", "Excluded"));

    expect(experiments.conversions.get("v-1")?.variant).toBe("Excluded");
  });

  it("E5: 같은 방문자의 두 번째 접수는 전환을 더 만들지 않는다", async () => {
    await handleApplicationSubmitted(deps, submitted("v-1", "app-1", "B"));

    expect(await handleApplicationSubmitted(deps, submitted("v-1", "app-2", "B"))).toEqual({ kind: "AlreadyRecorded" });
    expect(experiments.conversions.get("v-1")?.applicationId).toBe("app-1");
  });
});
