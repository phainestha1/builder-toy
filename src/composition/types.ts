// 라우트(src/app)와 화면(src/components)이 쓰는 타입을 BC에서 모아 다시 내보낸다.
export type {
  EstimateInput,
  NormalizedEstimateInput,
  RewardCalculationResult,
  RewardEstimateView,
} from "@/modules/catalog/ports/catalog-port";
export type { PlanComparisonCard } from "@/modules/catalog/application/catalog-use-cases";
export type { PlanSpeed } from "@/modules/catalog/domain/rate-table";
export type { SubmitApplicationResult } from "@/modules/application/application/application-use-cases";
export type { PreferredContactTime } from "@/modules/application/domain/application";

import type { SubmitApplicationResult } from "@/modules/application/application/application-use-cases";

/** 접수 거절 사유 (A1, C4) */
export type ApplicationRejectionReason = Extract<SubmitApplicationResult, { kind: "Rejected" }>["reason"];
