import type { PlanId, RateTableVersion, Won } from "@/modules/shared/events";

/** 요금제 (`Plan`). v1에서는 지우지 않고 판매 종료 상태도 두지 않는다 [가정] */
export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  readonly monthlyFee: Won;
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
