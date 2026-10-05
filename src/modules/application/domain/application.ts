import type {
  NormalizedEstimateInput,
  RewardEstimateView,
} from "@/modules/catalog/ports/catalog-port";
import type {
  ApplicationId,
  AssignedVariant,
  CounselorId,
  IsoDateTime,
  RateTableVersion,
  VisitorId,
  Won,
} from "@/modules/shared/events";
import { normalizePhoneNumber, type PhoneNumber } from "./phone-number";

/** 접수 상태 (`ApplicationStatus`). 접수 → 상담중 → 개통완료 / 취소 */
export type ApplicationStatus = "Submitted" | "InConsultation" | "Activated" | "Cancelled";

/** 상담 희망 시간대 (`preferredContactTime`) [가정] */
export type PreferredContactTime = "Morning" | "Afternoon" | "Evening";
const PREFERRED_CONTACT_TIMES: readonly PreferredContactTime[] = ["Morning", "Afternoon", "Evening"];

/** 계산 결과 스냅샷 (`EstimateSnapshot`). 접수할 때 서버가 다시 계산한 값 (A2) */
export interface EstimateSnapshot {
  input: NormalizedEstimateInput;
  appliedEarlyTerminationFee: Won;
  rateTableVersion: RateTableVersion;
  estimate: RewardEstimateView;
}

/** 상태 변경 기록 (A7) */
export interface StatusChange {
  from: ApplicationStatus;
  to: ApplicationStatus;
  counselorId: CounselorId;
  changedAt: IsoDateTime;
}

/** 접수 (`Application`) */
export interface Application {
  id: ApplicationId;
  visitorId: VisitorId;
  assignedVariant: AssignedVariant;
  customerName: string;
  phoneNumber: PhoneNumber;
  installationRegion: string | null;
  preferredContactTime: PreferredContactTime | null;
  privacyConsentedAt: IsoDateTime;
  status: ApplicationStatus;
  estimateSnapshot: EstimateSnapshot | null;
  resubmissionCount: number;
  submittedAt: IsoDateTime;
  /** 마지막 접수 시각 (합침 포함). 168시간 창의 기준 (A3) */
  lastSubmittedAt: IsoDateTime;
  statusHistory: StatusChange[];
}

/** 고객이 보낸 연락처성 정보 (검증 전) */
export interface ContactInfoInput {
  name: string | null;
  phoneNumber: string | null;
  privacyConsent: boolean;
  installationRegion: string | null;
  preferredContactTime: PreferredContactTime | null;
}

/** 검증한 연락처성 정보 */
export interface ContactInfo {
  name: string;
  phoneNumber: PhoneNumber;
  installationRegion: string | null;
  preferredContactTime: PreferredContactTime | null;
}

export type ContactRejectionReason =
  | "MissingName"
  | "MissingPhoneNumber"
  | "InvalidPhoneNumber"
  | "PrivacyConsentRequired"
  | "InvalidPreferredContactTime";

/** A1: 이름, 전화번호, 개인정보 동의는 필수. 설치 희망 지역과 상담 희망 시간대는 선택 */
export function validateContactInfo(
  input: ContactInfoInput,
): { ok: true; contact: ContactInfo } | { ok: false; reason: ContactRejectionReason } {
  const name = input.name?.trim() ?? "";
  if (name === "") return { ok: false, reason: "MissingName" };
  const rawPhone = input.phoneNumber?.trim() ?? "";
  if (rawPhone === "") return { ok: false, reason: "MissingPhoneNumber" };
  const phoneNumber = normalizePhoneNumber(rawPhone);
  if (phoneNumber === null) return { ok: false, reason: "InvalidPhoneNumber" };
  if (!input.privacyConsent) return { ok: false, reason: "PrivacyConsentRequired" };
  const time = input.preferredContactTime;
  if (time !== null && !PREFERRED_CONTACT_TIMES.includes(time)) {
    return { ok: false, reason: "InvalidPreferredContactTime" };
  }
  const region = input.installationRegion?.trim() || null;
  return { ok: true, contact: { name, phoneNumber, installationRegion: region, preferredContactTime: time } };
}

export function createApplication(params: {
  id: ApplicationId;
  visitorId: VisitorId;
  assignedVariant: AssignedVariant;
  contact: ContactInfo;
  estimateSnapshot: EstimateSnapshot | null;
  now: Date;
}): Application {
  const at = params.now.toISOString();
  return {
    id: params.id,
    visitorId: params.visitorId,
    assignedVariant: params.assignedVariant,
    customerName: params.contact.name,
    phoneNumber: params.contact.phoneNumber,
    installationRegion: params.contact.installationRegion,
    preferredContactTime: params.contact.preferredContactTime,
    privacyConsentedAt: at,
    status: "Submitted",
    estimateSnapshot: params.estimateSnapshot,
    resubmissionCount: 0,
    submittedAt: at,
    lastSubmittedAt: at,
    statusHistory: [],
  };
}

const RESUBMISSION_WINDOW_MS = 168 * 60 * 60 * 1000;

/** A3: 마지막 접수 시각부터 168시간 미만이고 `접수`·`상담중`이면 합친다 [가정] */
export function shouldMergeResubmission(existing: Application, now: Date): boolean {
  if (existing.status !== "Submitted" && existing.status !== "InConsultation") return false;
  return now.getTime() - Date.parse(existing.lastSubmittedAt) < RESUBMISSION_WINDOW_MS;
}

/** 재접수의 계산 결과. 입력 거절은 합치기 전에 유스케이스가 거절한다 */
export type ResubmissionEstimate =
  | { kind: "Empty" }
  | { kind: "Calculated"; snapshot: EstimateSnapshot }
  | { kind: "PlanNotInRateTable" };

/** A4: 재접수를 기존 접수에 합친다 */
export function mergeResubmission(
  existing: Application,
  resubmission: { contact: ContactInfo; estimate: ResubmissionEstimate; now: Date },
): { application: Application; mergedInto: "Submitted" | "InConsultation" } {
  if (existing.status !== "Submitted" && existing.status !== "InConsultation") {
    throw new Error(`끝 상태(${existing.status})의 접수에는 합칠 수 없습니다`);
  }
  const { contact, estimate, now } = resubmission;
  const at = now.toISOString();
  return {
    mergedInto: existing.status,
    application: {
      ...existing,
      customerName: contact.name,
      installationRegion: contact.installationRegion ?? existing.installationRegion,
      preferredContactTime: contact.preferredContactTime ?? existing.preferredContactTime,
      privacyConsentedAt: at,
      estimateSnapshot:
        existing.status === "Submitted" ? nextSnapshot(existing.estimateSnapshot, estimate) : existing.estimateSnapshot,
      resubmissionCount: existing.resubmissionCount + 1,
      lastSubmittedAt: at,
    },
  };
}

function nextSnapshot(current: EstimateSnapshot | null, estimate: ResubmissionEstimate): EstimateSnapshot | null {
  switch (estimate.kind) {
    case "Empty":
      return current;
    case "Calculated":
      return estimate.snapshot;
    case "PlanNotInRateTable":
      return null;
  }
}

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  Submitted: ["InConsultation", "Cancelled"],
  InConsultation: ["Activated", "Cancelled"],
  Activated: [],
  Cancelled: [],
};

export type StatusChangeResult =
  | { kind: "Changed"; application: Application; from: ApplicationStatus }
  | { kind: "Unchanged" }
  | { kind: "Rejected"; reason: "InvalidTransition" };

/** A6: 허용한 전이만 한다. 같은 상태로 가는 요청은 무시한다. A7: 상담원과 시각을 남긴다 */
export function changeStatus(
  application: Application,
  to: ApplicationStatus,
  counselorId: CounselorId,
  now: Date,
): StatusChangeResult {
  const from = application.status;
  if (from === to) return { kind: "Unchanged" };
  if (!ALLOWED_TRANSITIONS[from].includes(to)) return { kind: "Rejected", reason: "InvalidTransition" };
  return {
    kind: "Changed",
    from,
    application: {
      ...application,
      status: to,
      statusHistory: [...application.statusHistory, { from, to, counselorId, changedAt: now.toISOString() }],
    },
  };
}
