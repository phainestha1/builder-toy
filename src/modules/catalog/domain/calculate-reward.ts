import type {
  EarlyTerminationFeeInput,
  EstimateInput,
  EstimateRejectionReason,
  NormalizedEstimateInput,
  RewardCalculationResult,
} from "@/modules/catalog/ports/catalog-port";
import type { PlanId, Won } from "@/modules/shared/events";
import { baseRewardOf, type RewardRateTable } from "./rate-table";

const MAX_REMAINING_COMMITMENT_MONTHS = 36;
const MAX_EARLY_TERMINATION_FEE: Won = 10_000_000;

type Validation =
  | { ok: true; input: NormalizedEstimateInput }
  | { ok: false; reason: EstimateRejectionReason };

/**
 * 지원금 계산 (`calculateReward`). 계산기, 요금제 비교, 접수 스냅샷, 지원금 산정이 모두 이 공식을 쓴다 (C7).
 * 예상 지원금 = 기본 지원금 + min(적용 위약금, 보전 한도) (C1, C2).
 */
export function calculateReward(
  input: EstimateInput,
  table: RewardRateTable,
  planExists: (planId: PlanId) => boolean,
): RewardCalculationResult {
  const validation = normalizeEstimateInput(input);
  if (!validation.ok) return { kind: "Rejected", reason: validation.reason };
  const normalized = validation.input;

  if (!planExists(normalized.planId)) return { kind: "Rejected", reason: "UnknownPlan" };

  const baseReward = baseRewardOf(table, normalized.planId);
  if (baseReward === null) {
    return { kind: "PlanNotInRateTable", rateTableVersion: table.version, planId: normalized.planId };
  }

  const appliedEarlyTerminationFee = appliedFee(normalized.earlyTerminationFee, table);
  const feeCoverage = Math.min(appliedEarlyTerminationFee, table.feeCoverageCap);
  return {
    kind: "Calculated",
    rateTableVersion: table.version,
    input: normalized,
    appliedEarlyTerminationFee,
    estimate: { baseReward, feeCoverage, total: baseReward + feeCoverage },
  };
}

/** 계산 입력이 전부 비었는지 (C4: 접수는 이때 계산 없이 진행한다) */
export function isEmptyEstimateInput(input: EstimateInput): boolean {
  return (
    input.planId === null &&
    input.hasRemainingCommitment === null &&
    input.remainingCommitmentMonths === null &&
    input.earlyTerminationFee === null
  );
}

/** C4 검증과 정규화. 약정 아니요면 남은 약정 개월과 위약금을 검사 없이 먼저 버린다 */
function normalizeEstimateInput(input: EstimateInput): Validation {
  if (isEmptyEstimateInput(input)) return { ok: false, reason: "EmptyInput" };

  const { planId, hasRemainingCommitment } = input;
  if (planId === null || hasRemainingCommitment === null) return { ok: false, reason: "PartialInput" };

  if (!hasRemainingCommitment) {
    return {
      ok: true,
      input: {
        planId,
        hasRemainingCommitment: false,
        remainingCommitmentMonths: null,
        earlyTerminationFee: { kind: "NotApplicable" },
      },
    };
  }

  const months = input.remainingCommitmentMonths;
  if (months === null) return { ok: false, reason: "PartialInput" };
  if (!isIntegerBetween(months, 0, MAX_REMAINING_COMMITMENT_MONTHS)) {
    return { ok: false, reason: "OutOfRange" };
  }

  const fee = input.earlyTerminationFee;
  if (fee !== null && !isIntegerBetween(fee, 0, MAX_EARLY_TERMINATION_FEE)) {
    return { ok: false, reason: "OutOfRange" };
  }

  return {
    ok: true,
    input: {
      planId,
      hasRemainingCommitment: true,
      remainingCommitmentMonths: months,
      earlyTerminationFee: fee === null ? { kind: "Unknown" } : { kind: "Entered", amount: fee },
    },
  };
}

function appliedFee(fee: EarlyTerminationFeeInput, table: RewardRateTable): Won {
  switch (fee.kind) {
    case "Entered":
      return fee.amount;
    case "Unknown":
      return table.averageEarlyTerminationFee;
    case "NotApplicable":
      return 0;
  }
}

function isIntegerBetween(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
