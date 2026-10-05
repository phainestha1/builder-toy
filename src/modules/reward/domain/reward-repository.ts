import type { ApplicationId } from "@/modules/shared/events";
import type { Reward } from "./reward";

/** 지원금 저장소. 구현은 `infra`에 둔다 */
export interface RewardRepository {
  findByApplicationId(applicationId: ApplicationId): Promise<Reward | null>;
  save(reward: Reward): Promise<void>;
}
