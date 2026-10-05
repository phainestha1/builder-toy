import { describe, expect, it } from "vitest";
import { calculatedReward, notEligibleReward, payReward } from "./reward";

const calculatedAt = "2026-10-05T03:00:00.000Z";
const paidAt = "2026-10-06T03:00:00.000Z";

const calculated = calculatedReward({
  applicationId: "app-1",
  rateTableVersion: "v1",
  baseReward: 400_000,
  feeCoverage: 300_000,
  totalReward: 700_000,
  calculatedAt,
});

describe("지원금 (reward 도메인)", () => {
  it("R3: 스냅샷이 없는 접수의 지원금은 산정 대상 아님이고 금액이 없다", () => {
    const reward = notEligibleReward({ applicationId: "app-1", decidedAt: calculatedAt });

    expect(reward.status).toBe("NotEligible");
    expect(reward).not.toHaveProperty("totalReward");
  });

  it("R5: 산정됨 지원금을 지급하면 지급완료가 된다", () => {
    const result = payReward(calculated, { counselorId: "counselor-1", paidAt });

    expect(result.kind).toBe("Paid");
    if (result.kind !== "Paid") return;
    expect(result.reward.status).toBe("Paid");
    expect(result.reward.totalReward).toBe(700_000);
  });

  it("R5: 지급완료 지원금을 다시 지급하면 거절한다", () => {
    const first = payReward(calculated, { counselorId: "counselor-1", paidAt });
    if (first.kind !== "Paid") throw new Error("첫 지급이 실패했다");

    const second = payReward(first.reward, { counselorId: "counselor-2", paidAt });

    expect(second).toEqual({ kind: "Rejected", reason: "AlreadyPaid" });
  });

  it("R5: 산정 대상 아님 지원금의 지급 요청은 거절한다", () => {
    const reward = notEligibleReward({ applicationId: "app-1", decidedAt: calculatedAt });

    expect(payReward(reward, { counselorId: "counselor-1", paidAt })).toEqual({
      kind: "Rejected",
      reason: "NotEligible",
    });
  });

  it("R6: 지급하면 처리한 상담원의 counselorId와 지급 시각을 남긴다", () => {
    const result = payReward(calculated, { counselorId: "counselor-1", paidAt });
    if (result.kind !== "Paid") throw new Error("지급이 실패했다");

    expect(result.reward.paidBy).toBe("counselor-1");
    expect(result.reward.paidAt).toBe(paidAt);
  });
});
