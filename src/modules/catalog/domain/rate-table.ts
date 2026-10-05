import type { PlanId, RateTableVersion, Won } from "@/modules/shared/events";

/** 인터넷 속도. 요금제 비교(02)의 속도 필터 값이다 */
export type PlanSpeed = "100M" | "500M" | "1G";

/** 요금제 (`Plan`). v1에서는 지우지 않고 판매 종료 상태도 두지 않는다 [가정] */
export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  readonly monthlyFee: Won;
  readonly speed: PlanSpeed;
  /** TV 포함 여부. 요금제 비교(02)의 TV 포함 필터 값이다 */
  readonly includesTv: boolean;
}

/**
 * 지원금 기준표의 한 판 (`RewardRateTable`, `RateTableVersion`).
 * 만든 버전은 고치지 않는다 (C7). 평균 위약금과 보전 한도는 버전마다 하나다 (C2, C5).
 */
export interface RewardRateTable {
  readonly version: RateTableVersion;
  readonly baseRewards: Readonly<Record<PlanId, Won>>;
  readonly averageEarlyTerminationFee: Won;
  readonly feeCoverageCap: Won;
}

export function createPlan(plan: Plan): Plan {
  return Object.freeze({ ...plan });
}

export function createRateTable(table: RewardRateTable): RewardRateTable {
  return Object.freeze({
    ...table,
    baseRewards: Object.freeze({ ...table.baseRewards }),
  });
}

export function baseRewardOf(table: RewardRateTable, planId: PlanId): Won | null {
  return Object.hasOwn(table.baseRewards, planId) ? table.baseRewards[planId] : null;
}
