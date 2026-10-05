import type { RateTableVersion } from "@/modules/shared/events";
import type { Plan, RewardRateTable } from "../domain/rate-table";

/** 요금제와 기준표 버전 저장소. 기준표 버전은 추가만 하고 고치지 않는다 (C7) */
export interface CatalogRepository {
  listPlans(): Promise<readonly Plan[]>;
  findCurrentRateTable(): Promise<RewardRateTable>;
  findRateTable(version: RateTableVersion): Promise<RewardRateTable | null>;
}
