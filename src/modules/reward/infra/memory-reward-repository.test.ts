import { describe, expect, it } from "vitest";
import { calculatedReward } from "../domain";
import { MemoryRewardRepository } from "./memory-reward-repository";

describe("메모리 지원금 저장소", () => {
  it("R4: 접수 ID로 저장하고 찾으며, 같은 접수는 덮어써 하나만 남긴다", async () => {
    const repo = new MemoryRewardRepository();
    const reward = calculatedReward({
      applicationId: "app-1",
      rateTableVersion: "v1",
      baseReward: 1,
      feeCoverage: 0,
      totalReward: 1,
      calculatedAt: "2026-10-05T03:00:00.000Z",
    });

    expect(await repo.findByApplicationId("app-1")).toBeNull();
    await repo.save(reward);
    await repo.save(reward);

    expect(await repo.findByApplicationId("app-1")).toEqual(reward);
    expect(repo.size()).toBe(1);
  });
});
