import type { EstimateInput, NormalizedEstimateInput } from "@/composition";

// 03 → 04, 04 [수정] → 03에서 계산 입력 4개를 쿼리스트링으로 넘긴다. 금액은 넘기지 않는다 (A2).
// 받은 그대로 읽기만 하고, 검증과 정규화는 catalog가 한다 (C4).

export type QueryRecord = Record<string, string | string[] | undefined>;

const KEYS = ["planId", "commitment", "months", "fee"] as const;

function single(query: QueryRecord, key: string): string {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function numberOrNull(raw: string): number | null {
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function parseEstimateQuery(query: QueryRecord): EstimateInput {
  const commitment = single(query, "commitment");
  return {
    planId: single(query, "planId") || null,
    hasRemainingCommitment: commitment === "yes" ? true : commitment === "no" ? false : null,
    remainingCommitmentMonths: numberOrNull(single(query, "months")),
    earlyTerminationFee: numberOrNull(single(query, "fee")),
  };
}

/** 계산 입력이 하나라도 있으면 true. 없으면 계산 없이 들어온 것이다 */
export function hasEstimateQuery(query: QueryRecord): boolean {
  return KEYS.some((key) => single(query, key) !== "");
}

export function toEstimateQuery(input: NormalizedEstimateInput): string {
  const params = new URLSearchParams({ planId: input.planId, commitment: input.hasRemainingCommitment ? "yes" : "no" });
  if (input.remainingCommitmentMonths !== null) params.set("months", String(input.remainingCommitmentMonths));
  if (input.earlyTerminationFee.kind === "Entered") params.set("fee", String(input.earlyTerminationFee.amount));
  return params.toString();
}
