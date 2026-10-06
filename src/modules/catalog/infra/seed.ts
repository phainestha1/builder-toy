import { createPlan, createRateTable } from "../domain/rate-table";
import { InMemoryCatalogRepository } from "./in-memory-catalog-repository";

// 데모용 기준표 v1 [가정]. 보전 한도 30만 원(C2)만 ADR이 정한 값이고, 나머지는 데이터 없이 정한 값이다.
export const SEED_PLANS = [
  createPlan({ id: "plan-500m", name: "인터넷 500M", monthlyFee: 33_000, speed: "500M", includesTv: false }),
  createPlan({ id: "plan-500m-tv", name: "인터넷 500M + TV", monthlyFee: 44_000, speed: "500M", includesTv: true }),
  createPlan({ id: "plan-1g", name: "인터넷 1G", monthlyFee: 38_500, speed: "1G", includesTv: false }),
  createPlan({ id: "plan-1g-tv", name: "인터넷 1G + TV", monthlyFee: 49_500, speed: "1G", includesTv: true }),
  // 기준표 v1에 없는 요금제 (C6: "지원금 상담 시 안내")
  createPlan({ id: "plan-100m", name: "인터넷 100M", monthlyFee: 22_000, speed: "100M", includesTv: false }),
];

export const SEED_RATE_TABLE_V1 = createRateTable({
  version: "v1",
  baseRewards: {
    "plan-500m": 400_000,
    "plan-500m-tv": 450_000,
    "plan-1g": 450_000,
    "plan-1g-tv": 500_000,
  },
  averageEarlyTerminationFee: 200_000,
  feeCoverageCap: 300_000,
});

export function createSeedCatalogRepository(): InMemoryCatalogRepository {
  return new InMemoryCatalogRepository({
    plans: SEED_PLANS,
    rateTables: [SEED_RATE_TABLE_V1],
    currentVersion: SEED_RATE_TABLE_V1.version,
  });
}
