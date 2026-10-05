import { describe, expect, it } from "vitest";
import { listPlanComparison } from "../application/catalog-use-cases";
import { createSeedCatalogRepository } from "./seed";

describe("시드 요금제 (02 필터)", () => {
  it("시드 요금제 5개에 속도와 TV 포함이 있고, 요금제 비교 카드에 그대로 담긴다", async () => {
    const cards = await listPlanComparison(createSeedCatalogRepository());

    expect(cards.map(({ planId, speed, includesTv }) => ({ planId, speed, includesTv }))).toEqual([
      { planId: "plan-500m", speed: "500M", includesTv: false },
      { planId: "plan-500m-tv", speed: "500M", includesTv: true },
      { planId: "plan-1g", speed: "1G", includesTv: false },
      { planId: "plan-1g-tv", speed: "1G", includesTv: true },
      { planId: "plan-100m", speed: "100M", includesTv: false },
    ]);
  });
});
