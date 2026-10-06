// 화면 05 데이터. `application` 조회와 `reward` 조회를 접수 ID로 붙인다 (ADR 0001 2절).
// 예상 지원금은 `application`의 스냅샷 값, 산정액과 지원금 상태는 `reward` 조회 값이다.
import { application, catalog, reward } from "@/composition";
import type { ApplicationDetail } from "@/modules/application/application/application-use-cases";
import {
  type AdminApplicationDetail,
  type AdminApplicationRow,
  type AdminRewardView,
  type StatusFilter,
  STATUS_TABS,
  formatMonthDay,
} from "./view-model";

const CONTACT_TIME_LABEL = { Morning: "오전", Afternoon: "오후", Evening: "저녁" } as const;

export interface ApplicationListView {
  rows: AdminApplicationRow[];
  counts: Record<StatusFilter, number>;
  todayCount: number;
  searchError: string | null;
}

/** 검색어: 숫자 4자리면 전화번호 뒷자리(A8), 그 밖에는 이름 */
export async function loadApplicationList(filter: {
  status: StatusFilter;
  query: string | null;
  now?: Date;
}): Promise<ApplicationListView> {
  const query = filter.query?.trim() || null;
  const byPhone = query !== null && /^\d{4}$/.test(query);
  const listed = await application.listApplications({ phoneLastFour: byPhone ? query : null });
  const counts = Object.fromEntries(STATUS_TABS.map((tab) => [tab.key, 0])) as Record<StatusFilter, number>;
  if (listed.kind === "Rejected") {
    return { rows: [], counts, todayCount: 0, searchError: "전화번호는 뒷자리 4자리로 찾아요" };
  }

  const searched =
    query !== null && !byPhone ? listed.items.filter((item) => item.customerName.includes(query)) : listed.items;
  const details = await Promise.all(searched.map((item) => findDetail(item.applicationId)));
  const allRows = await Promise.all(details.filter((d) => d !== null).map(toRow));

  for (const row of allRows) {
    counts.All += 1;
    counts[row.status] += 1;
  }
  const today = formatMonthDay((filter.now ?? new Date()).toISOString());
  const rows = (filter.status === "All" ? allRows : allRows.filter((row) => row.status === filter.status)).sort(
    (a, b) => b.submittedAt.localeCompare(a.submittedAt),
  );
  return {
    rows,
    counts,
    todayCount: allRows.filter((row) => formatMonthDay(row.submittedAt) === today).length,
    searchError: null,
  };
}

export async function loadApplicationDetail(applicationId: string): Promise<AdminApplicationDetail | null> {
  const detail = await findDetail(applicationId);
  if (!detail) return null;
  const row = await toRow(detail);
  const input = detail.estimateSnapshot?.input ?? null;
  return {
    ...row,
    commitmentLabel: input === null ? null : input.hasRemainingCommitment ? `${input.remainingCommitmentMonths}개월` : "없음",
    installationRegion: detail.installationRegion,
    preferredContactTimeLabel: detail.preferredContactTime ? CONTACT_TIME_LABEL[detail.preferredContactTime] : null,
    reward: await findReward(applicationId),
  };
}

async function findDetail(applicationId: string): Promise<ApplicationDetail | null> {
  const found = await application.getApplicationDetail(applicationId);
  return found.kind === "Found" ? found.detail : null;
}

async function findReward(applicationId: string): Promise<AdminRewardView | null> {
  const found = await reward.getReward(applicationId);
  if (!found) return null;
  if (found.status === "NotEligible") return { status: found.status, totalReward: null, paidAt: null };
  return {
    status: found.status,
    totalReward: found.totalReward,
    paidAt: found.status === "Paid" ? found.paidAt : null,
  };
}

async function planNames(): Promise<Map<string, string>> {
  const plans = await catalog.listPlanComparison();
  return new Map(plans.map((plan) => [plan.planId, plan.name]));
}

async function toRow(detail: ApplicationDetail): Promise<AdminApplicationRow> {
  const planId = detail.estimateSnapshot?.input.planId ?? null;
  const names = planId === null ? null : await planNames();
  const rewardView = await findReward(detail.applicationId);
  return {
    applicationId: detail.applicationId,
    submittedAt: detail.submittedAt,
    customerName: detail.customerName,
    maskedPhoneNumber: detail.maskedPhoneNumber,
    planLabel: planId === null ? null : (names?.get(planId) ?? planId),
    estimateTotal: detail.estimateTotal,
    assignedVariant: detail.assignedVariant,
    status: detail.status,
    resubmissionCount: detail.resubmissionCount,
    rewardStatus: rewardView?.status ?? null,
  };
}
