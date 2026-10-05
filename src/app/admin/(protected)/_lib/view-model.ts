// 화면 05가 쓰는 표시용 타입, 한국어 라벨(docs/glossary.md), 표시 형식(Figma 05).
import type { ApplicationSummary } from "@/modules/application/application/application-use-cases";

export type ApplicationStatus = ApplicationSummary["status"];
export type AssignedVariant = ApplicationSummary["assignedVariant"];

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

/** 목록의 변형 열 */
export const VARIANT_LABEL: Record<AssignedVariant, string> = {
  A: "A",
  B: "B",
  Excluded: "제외",
};

/** 상세의 실험 변형 행 */
export const VARIANT_DETAIL_LABEL: Record<AssignedVariant, string> = {
  A: "A · 최대 지원금",
  B: "B · 위약금 보전",
  Excluded: "제외",
};

export type StatusFilter = ApplicationStatus | "All";

/** 상태 탭 (전체/접수/상담중/개통완료/취소) */
export const STATUS_TABS: readonly { key: StatusFilter; label: string }[] = [
  { key: "All", label: "전체" },
  { key: "Submitted", label: STATUS_LABEL.Submitted },
  { key: "InConsultation", label: STATUS_LABEL.InConsultation },
  { key: "Activated", label: STATUS_LABEL.Activated },
  { key: "Cancelled", label: STATUS_LABEL.Cancelled },
];

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
  assignedVariant: AssignedVariant;
  status: ApplicationStatus;
  resubmissionCount: number;
  rewardStatus: RewardStatusView | null;
}

export interface AdminRewardView {
  status: RewardStatusView;
  totalReward: number | null;
  paidAt: string | null;
}

export interface AdminApplicationDetail extends AdminApplicationRow {
  /** 남은 약정. 예: "8개월", "없음". 스냅샷이 없으면 `null` */
  commitmentLabel: string | null;
  installationRegion: string | null;
  preferredContactTimeLabel: string | null;
  reward: AdminRewardView | null;
}

/** 지원금 영역의 "지급 상태" 문구 */
export function payoutStatusLabel(status: ApplicationStatus, reward: AdminRewardView | null): string {
  if (status === "Cancelled") return "개통 전 취소 · 지원금 없음";
  if (status !== "Activated") return "개통 전 · 산정 대기";
  if (reward === null) return "산정 중";
  return REWARD_STATUS_LABEL[reward.status];
}

/** 금액: 58만 원, 58만 3,500원, 3,500원 */
export function formatWon(amount: number | null): string {
  if (amount === null) return "-";
  const man = Math.floor(amount / 10000);
  const rest = amount % 10000;
  if (man === 0) return `${rest.toLocaleString("ko-KR")}원`;
  if (rest === 0) return `${man.toLocaleString("ko-KR")}만 원`;
  return `${man.toLocaleString("ko-KR")}만 ${rest.toLocaleString("ko-KR")}원`;
}

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" });

/** 접수일: 한국 시간 기준 MM/DD */
export function formatMonthDay(iso: string): string {
  return MONTH_DAY.format(new Date(iso));
}
