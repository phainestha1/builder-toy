import { describe, expect, it } from "vitest";
import { availableActions } from "./available-actions";

describe("어드민 버튼 표시 규칙 (A6, R5, 화면 05 예외)", () => {
  it("접수 상태에서는 상담 시작과 취소만 누를 수 있다", () => {
    expect(availableActions("Submitted", null)).toMatchObject({
      startConsultation: true,
      activate: false,
      cancel: true,
    });
  });

  it("상담중에서는 개통 완료와 취소만 누를 수 있다", () => {
    expect(availableActions("InConsultation", null)).toMatchObject({
      startConsultation: false,
      activate: true,
      cancel: true,
    });
  });

  it("개통완료와 취소는 끝 상태라 상태 버튼을 모두 비활성으로 둔다", () => {
    for (const status of ["Activated", "Cancelled"] as const) {
      expect(availableActions(status, null)).toMatchObject({
        startConsultation: false,
        activate: false,
        cancel: false,
      });
    }
  });

  it("개통완료이고 지원금이 산정됨이면 지급 버튼을 누를 수 있다", () => {
    expect(availableActions("Activated", "Calculated").payout).toBe("enabled");
  });

  it("지급완료면 지급 버튼을 비활성으로 두고 지급완료로 표시한다", () => {
    expect(availableActions("Activated", "Paid").payout).toBe("paid");
  });

  it("산정 대상 아님이면 지급 버튼을 숨긴다", () => {
    expect(availableActions("Activated", "NotEligible").payout).toBe("hidden");
  });

  it("개통완료인데 지원금 조회 결과가 아직 없으면 산정 중으로 표시하고 지급할 수 없다", () => {
    expect(availableActions("Activated", null).payout).toBe("pending");
  });

  it("개통 전 취소면 지원금이 없어 지급 영역을 숨긴다", () => {
    expect(availableActions("Cancelled", null).payout).toBe("hidden");
  });

  it("개통 전(접수·상담중)에는 지급 버튼을 보이되 비활성으로 둔다 (Figma 05: 개통 전 · 산정 대기)", () => {
    expect(availableActions("Submitted", null).payout).toBe("disabled");
    expect(availableActions("InConsultation", null).payout).toBe("disabled");
  });
});
