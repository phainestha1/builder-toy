import type { EstimateInput, RewardCalculationResult } from "@/modules/catalog/ports/catalog-port";
import type { PlanId, RateTableVersion, Won } from "@/modules/shared/events";
import { calculateReward } from "../domain/calculate-reward";
import { baseRewardOf, type PlanSpeed, type RewardRateTable } from "../domain/rate-table";
import type { CatalogRepository } from "./catalog-repository";

/** 요금제 비교(02) 카드 한 장. 기준표 버전에 없는 요금제(C6)는 금액이 없다 */
export interface PlanComparisonCard {
  planId: PlanId;
  name: string;
  monthlyFee: Won;
  speed: PlanSpeed;
  includesTv: boolean;
  /** 약정 없음 기준의 예상 지원금 = 기본 지원금 (C8). 기준표에 없으면 `null` */
  rewardEstimate: Won | null;
  rateTableVersion: RateTableVersion;
}

/** 현재 기준표 버전으로 지원금 계산. 지원금 계산기(03), 04 요약 카드, 접수 스냅샷(A2)이 쓴다 */
export async function estimateReward(
  repository: CatalogRepository,
  input: EstimateInput,
): Promise<RewardCalculationResult> {
  return calculateWith(repository, input, await repository.findCurrentRateTable());
}

/** 지정한 기준표 버전으로 지원금 계산 (개통 뒤 산정, R2) */
export async function estimateRewardWithVersion(
  repository: CatalogRepository,
  input: EstimateInput,
  rateTableVersion: RateTableVersion,
): Promise<RewardCalculationResult> {
  const table = await repository.findRateTable(rateTableVersion);
  if (table === null) return { kind: "Rejected", reason: "UnknownRateTableVersion" };
  return calculateWith(repository, input, table);
}

/** 요금제 비교(02). 카드 금액은 약정 없음 기준, 곧 기본 지원금이다 (C8) */
export async function listPlanComparison(repository: CatalogRepository): Promise<PlanComparisonCard[]> {
  const [plans, table] = await Promise.all([repository.listPlans(), repository.findCurrentRateTable()]);
  return plans.map((plan) => ({
    planId: plan.id,
    name: plan.name,
    monthlyFee: plan.monthlyFee,
    speed: plan.speed,
    includesTv: plan.includesTv,
    rewardEstimate: baseRewardOf(table, plan.id),
    rateTableVersion: table.version,
  }));
}

async function calculateWith(
  repository: CatalogRepository,
  input: EstimateInput,
  table: RewardRateTable,
): Promise<RewardCalculationResult> {
  const planIds = new Set((await repository.listPlans()).map((plan) => plan.id));
  return calculateReward(input, table, (planId) => planIds.has(planId));
}
