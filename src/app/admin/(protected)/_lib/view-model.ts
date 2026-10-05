// 화면 05가 쓰는 표시용 타입과 한국어 라벨 (docs/glossary.md).
import type { ApplicationSummary } from "@/modules/application/application/application-use-cases";

export type ApplicationStatus = ApplicationSummary["status"];

/** `reward` 조회의 지원금 상태. 개통 전이면 지원금이 없다(`null`) */
export type RewardStatusView = "Calculated" | "Paid" | "NotEligible";

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  Submitted: "접수",
  InConsultation: "상담중",
  Activated: "개통완료",
  Cancelled: "취소",
};

export const REWARD_STATUS_LABEL: Record<RewardStatusView, string> = {
  Calculated: "산정됨",
  Paid: "지급완료",
  NotEligible: "산정 대상 아님",
};

export const VARIANT_LABEL: Record<ApplicationSummary["assignedVariant"], string> = {
  A: "A",
  B: "B",
  Excluded: "제외",
};

/** 상태 탭 (전체/접수/상담중/개통완료/취소) */
export const STATUS_TABS: readonly { key: ApplicationStatus | "All"; label: string }[] = [
  { key: "All", label: "전체" },
  { key: "Submitted", label: STATUS_LABEL.Submitted },
  { key: "InConsultation", label: STATUS_LABEL.InConsultation },
  { key: "Activated", label: STATUS_LABEL.Activated },
  { key: "Cancelled", label: STATUS_LABEL.Cancelled },
];

export function formatWon(amount: number | null): string {
  return amount === null ? "-" : `${amount.toLocaleString("ko-KR")}원`;
}

/** 목록 한 줄. `application` 조회와 `reward` 조회를 접수 ID로 붙인 값 (ADR 0001 2절) */
export interface AdminApplicationRow {
  applicationId: string;
  submittedAt: string;
  customerName: string;
  maskedPhoneNumber: string;
  /** 요금제 이름. 찾지 못하면 요금제 ID, 스냅샷이 없으면 `null` */
  planLabel: string | null;
  /** 계산 결과 스냅샷의 예상 지원금 합계 */
  estimateTotal: number | null;
  assignedVariant: ApplicationSummary["assignedVariant"];
  status: ApplicationStatus;
  resubmissionCount: number;
  rewardStatus: RewardStatusView | null;
}

export interface AdminRewardView {
  status: RewardStatusView;
  baseReward: number | null;
  feeCoverage: number | null;
  totalReward: number | null;
  paidAt: string | null;
}

export interface AdminApplicationDetail extends AdminApplicationRow {
  installationRegion: string | null;
  preferredContactTimeLabel: string | null;
  statusHistory: { from: ApplicationStatus; to: ApplicationStatus; counselorId: string; changedAt: string }[];
  reward: AdminRewardView | null;
}

export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}
