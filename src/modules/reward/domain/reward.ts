// 지원금 (`Reward`). 접수 1건에 하나라서 `applicationId`로 식별한다 (R4).
import type {
  ApplicationId,
  CounselorId,
  IsoDateTime,
  RateTableVersion,
  Won,
} from "@/modules/shared/events";

interface RewardAmount {
  rateTableVersion: RateTableVersion;
  baseReward: Won;
  feeCoverage: Won;
  totalReward: Won;
}

/** 산정됨 (`Calculated`) */
export interface CalculatedReward extends RewardAmount {
  applicationId: ApplicationId;
  status: "Calculated";
  calculatedAt: IsoDateTime;
}

/** 지급완료 (`Paid`). 실제 송금 없이 기록만 남긴다 (R5). 처리한 상담원과 시각을 남긴다 (R6) */
export interface PaidReward extends RewardAmount {
  applicationId: ApplicationId;
  status: "Paid";
  calculatedAt: IsoDateTime;
  paidBy: CounselorId;
  paidAt: IsoDateTime;
}

/** 산정 대상 아님 (`NotEligible`). 스냅샷이 없는 접수라 금액이 없다 (R3) */
export interface NotEligibleReward {
  applicationId: ApplicationId;
  status: "NotEligible";
  decidedAt: IsoDateTime;
}

export type Reward = CalculatedReward | PaidReward | NotEligibleReward;
export type RewardStatus = Reward["status"];

export function calculatedReward(
  props: RewardAmount & { applicationId: ApplicationId; calculatedAt: IsoDateTime },
): CalculatedReward {
  return { ...props, status: "Calculated" };
}

export function notEligibleReward(props: {
  applicationId: ApplicationId;
  decidedAt: IsoDateTime;
}): NotEligibleReward {
  return { ...props, status: "NotEligible" };
}

export type PayoutRejectionReason = "AlreadyPaid" | "NotEligible";

export type PayoutResult =
  | { kind: "Paid"; reward: PaidReward }
  | { kind: "Rejected"; reason: PayoutRejectionReason };

/** 지급 (`Payout`). `산정됨`에서만 한 번 할 수 있다 (R5) */
export function payReward(
  reward: Reward,
  payout: { counselorId: CounselorId; paidAt: IsoDateTime },
): PayoutResult {
  if (reward.status === "Paid") return { kind: "Rejected", reason: "AlreadyPaid" };
  if (reward.status === "NotEligible") return { kind: "Rejected", reason: "NotEligible" };
  return {
    kind: "Paid",
    reward: { ...reward, status: "Paid", paidBy: payout.counselorId, paidAt: payout.paidAt },
  };
}
