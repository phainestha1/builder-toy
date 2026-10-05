import type { ApplicationId } from "@/modules/shared/events";
import type { Reward, RewardRepository } from "../domain";

/** 메모리 지원금 저장소. SQLite 구현은 T-G4에서 만든다 */
export class MemoryRewardRepository implements RewardRepository {
  private readonly items = new Map<ApplicationId, Reward>();

  async findByApplicationId(applicationId: ApplicationId): Promise<Reward | null> {
    return this.items.get(applicationId) ?? null;
  }

  async save(reward: Reward): Promise<void> {
    this.items.set(reward.applicationId, reward);
  }

  size(): number {
    return this.items.size;
  }
}
