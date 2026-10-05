import { describe, expect, it } from "vitest";
import type { EstimateInput } from "@/modules/catalog/ports/catalog-port";
import { createCatalogPort } from "./catalog-port-adapter";
import { createSeedCatalogRepository } from "./seed";

const input: EstimateInput = {
  planId: "plan-500m",
  hasRemainingCommitment: true,
  remainingCommitmentMonths: 12,
  earlyTerminationFee: null,
};

describe("CatalogPort 구현", () => {
  it("C7: 현재 버전 계산과 버전 지정 계산은 같은 공식으로 같은 값을 낸다", async () => {
    const port = createCatalogPort(createSeedCatalogRepository());
    const current = await port.calculateRewardWithCurrentVersion(input);
    if (current.kind !== "Calculated") throw new Error(current.kind);
    expect(await port.calculateRewardWithVersion(input, current.rateTableVersion)).toEqual(current);
  });

  it("없는 기준표 버전을 지정하면 UnknownRateTableVersion으로 거절한다", async () => {
    const port = createCatalogPort(createSeedCatalogRepository());
    expect(await port.calculateRewardWithVersion(input, "v-nope")).toEqual({
      kind: "Rejected",
      reason: "UnknownRateTableVersion",
    });
  });

  it("C2·C5: 시드 v1은 보전 한도 30만 원, 평균 위약금 20만 원이고 기준표에 없는 요금제가 하나 있다 [가정]", async () => {
    const port = createCatalogPort(createSeedCatalogRepository());
    const result = await port.calculateRewardWithCurrentVersion(input);
    expect(result).toMatchObject({ kind: "Calculated", appliedEarlyTerminationFee: 200_000 });
    const capped = await port.calculateRewardWithCurrentVersion({ ...input, earlyTerminationFee: 900_000 });
    expect(capped).toMatchObject({ estimate: { feeCoverage: 300_000 } });
    const notInTable = await port.calculateRewardWithCurrentVersion({ ...input, planId: "plan-100m" });
    expect(notInTable.kind).toBe("PlanNotInRateTable");
  });
});
