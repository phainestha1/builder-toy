import { describe, expect, it } from "vitest";
import { hasEstimateQuery, parseEstimateQuery, toEstimateQuery } from "./estimate-query";

describe("계산 입력 쿼리스트링 (03 → 04, A2)", () => {
  it("쿼리의 계산 입력 4개를 받은 그대로 EstimateInput으로 읽고, 금액은 넘기지 않는다", () => {
    expect(parseEstimateQuery({ planId: "plan-500m", commitment: "yes", months: "12", fee: "" })).toEqual({
      planId: "plan-500m",
      hasRemainingCommitment: true,
      remainingCommitmentMonths: 12,
      earlyTerminationFee: null,
    });
    expect(parseEstimateQuery({ planId: "plan-1g", commitment: "no", total: "999" })).toEqual({
      planId: "plan-1g",
      hasRemainingCommitment: false,
      remainingCommitmentMonths: null,
      earlyTerminationFee: null,
    });
  });

  it("빈 칸과 숫자가 아닌 값은 null로 읽어 검증은 catalog가 하게 둔다", () => {
    expect(parseEstimateQuery({ commitment: "maybe", months: "abc", fee: "900000" })).toEqual({
      planId: null,
      hasRemainingCommitment: null,
      remainingCommitmentMonths: null,
      earlyTerminationFee: 900_000,
    });
  });

  it("계산 입력이 하나도 없으면 계산 없이 들어온 것이다", () => {
    expect(hasEstimateQuery({})).toBe(false);
    expect(hasEstimateQuery({ planId: "", utm: "x" })).toBe(false);
    expect(hasEstimateQuery({ planId: "plan-500m" })).toBe(true);
  });

  it("정규화한 입력을 쿼리로 바꾸면 다시 읽었을 때 같은 입력이 된다", () => {
    const query = toEstimateQuery({
      planId: "plan-500m",
      hasRemainingCommitment: true,
      remainingCommitmentMonths: 12,
      earlyTerminationFee: { kind: "Unknown" },
    });
    expect(query).toBe("planId=plan-500m&commitment=yes&months=12");
    expect(parseEstimateQuery(Object.fromEntries(new URLSearchParams(query)))).toEqual({
      planId: "plan-500m",
      hasRemainingCommitment: true,
      remainingCommitmentMonths: 12,
      earlyTerminationFee: null,
    });
    expect(
      toEstimateQuery({
        planId: "plan-1g",
        hasRemainingCommitment: false,
        remainingCommitmentMonths: null,
        earlyTerminationFee: { kind: "NotApplicable" },
      }),
    ).toBe("planId=plan-1g&commitment=no");
  });
});
