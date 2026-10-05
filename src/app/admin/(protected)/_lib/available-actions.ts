// 화면 05의 버튼 표시 규칙. 표시만 정하고, 최종 판단은 유스케이스(A6, R5)가 한다.
import type { ApplicationStatus, RewardStatusView } from "./view-model";

export type PayoutAction = "hidden" | "pending" | "enabled" | "paid";

export interface AvailableActions {
  startConsultation: boolean;
  activate: boolean;
  cancel: boolean;
  payout: PayoutAction;
}

export function availableActions(status: ApplicationStatus, rewardStatus: RewardStatusView | null): AvailableActions {
  return {
    startConsultation: status === "Submitted",
    activate: status === "InConsultation",
    cancel: status === "Submitted" || status === "InConsultation",
    payout: payoutAction(status, rewardStatus),
  };
}

function payoutAction(status: ApplicationStatus, rewardStatus: RewardStatusView | null): PayoutAction {
  // 개통 전(취소 포함)에는 지원금이 없다 (R1)
  if (status !== "Activated") return "hidden";
  switch (rewardStatus) {
    case "Calculated":
      return "enabled";
    case "Paid":
      return "paid";
    case "NotEligible":
      return "hidden";
    case null:
      return "pending";
  }
}
