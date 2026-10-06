import type { RewardCalculationResult } from "@/composition";

/** 03 계산 결과 화면 상태. 금액과 판단은 모두 서버(catalog)가 정한 값이다 */
export type CalculatorState =
  | { kind: "Idle" }
  | {
      kind: "Calculated";
      baseReward: number;
      feeCoverage: number;
      total: number;
      /** 입력한 위약금이 보전 한도를 넘었다 */
      capped: boolean;
      /** 위약금을 비워 평균 위약금으로 계산했을 때 그 값 */
      averageFeeApplied: number | null;
      /** 04로 넘길 계산 입력 쿼리 (금액 없음, A2) */
      applyQuery: string;
    }
  | { kind: "PlanNotInRateTable" }
  | { kind: "Rejected"; reason: Extract<RewardCalculationResult, { kind: "Rejected" }>["reason"] };
