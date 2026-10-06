"use server";

import { catalog, experiment } from "@/composition";
import { parseEstimateQuery, toEstimateQuery } from "../_lib/estimate-query";
import { getVisitorId } from "../_lib/visitor";
import type { CalculatorState } from "./state";

/** 03 계산. catalog 결과를 그대로 계산 기록에 넘긴다 (E4, 기록 여부는 experiment가 판단) */
export async function calculateAction(_prev: CalculatorState, formData: FormData): Promise<CalculatorState> {
  const input = parseEstimateQuery({
    planId: String(formData.get("planId") ?? ""),
    commitment: String(formData.get("commitment") ?? ""),
    months: String(formData.get("months") ?? ""),
    fee: String(formData.get("fee") ?? ""),
  });
  const result = await catalog.estimateReward(input);
  await experiment.recordRewardEstimated({ visitorId: await getVisitorId(), result });

  switch (result.kind) {
    case "Calculated": {
      const fee = result.input.earlyTerminationFee;
      return {
        kind: "Calculated",
        baseReward: result.estimate.baseReward,
        feeCoverage: result.estimate.feeCoverage,
        total: result.estimate.total,
        capped: fee.kind === "Entered" && fee.amount > result.estimate.feeCoverage,
        averageFeeApplied: fee.kind === "Unknown" ? result.appliedEarlyTerminationFee : null,
        applyQuery: toEstimateQuery(result.input),
      };
    }
    case "PlanNotInRateTable":
      return { kind: "PlanNotInRateTable" };
    case "Rejected":
      return { kind: "Rejected", reason: result.reason };
  }
}
