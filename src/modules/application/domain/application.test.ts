import { describe, expect, it } from "vitest";
import {
  type Application,
  type ApplicationStatus,
  type ContactInfoInput,
  type EstimateSnapshot,
  changeStatus,
  createApplication,
  mergeResubmission,
  shouldMergeResubmission,
  validateContactInfo,
} from "./application";

const t0 = new Date("2026-10-05T00:00:00.000Z");
const hours = (h: number) => new Date(t0.getTime() + h * 3_600_000);

const contact: ContactInfoInput = {
  name: "홍길동",
  phoneNumber: "010-1234-5678",
  privacyConsent: true,
  installationRegion: "서울 강남구",
  preferredContactTime: "Morning",
};

const snapshot = (total: number): EstimateSnapshot => ({
  input: {
    planId: "plan-500m",
    hasRemainingCommitment: false,
    remainingCommitmentMonths: null,
    earlyTerminationFee: { kind: "NotApplicable" },
  },
  appliedEarlyTerminationFee: 0,
  rateTableVersion: "v1",
  estimate: { baseReward: total, feeCoverage: 0, total },
});

function validContact(input: ContactInfoInput = contact) {
  const result = validateContactInfo(input);
  if (!result.ok) throw new Error(result.reason);
  return result.contact;
}

function application(overrides: Partial<Application> = {}): Application {
  return {
    ...createApplication({
      id: "app-1",
      visitorId: "visitor-1",
      assignedVariant: "B",
      contact: validContact(),
      estimateSnapshot: snapshot(400_000),
      now: t0,
    }),
    ...overrides,
  };
}

describe("A1 접수 필수 항목", () => {
  it("A1: 선택 항목(설치 희망 지역, 상담 희망 시간대) 없이도 받는다", () => {
    const result = validateContactInfo({ ...contact, installationRegion: null, preferredContactTime: null });
    expect(result).toMatchObject({ ok: true, contact: { installationRegion: null, preferredContactTime: null } });
  });

  it.each<[string, Partial<ContactInfoInput>, string]>([
    ["이름 없음", { name: "  " }, "MissingName"],
    ["전화번호 없음", { phoneNumber: "" }, "MissingPhoneNumber"],
    ["전화번호 형식 틀림", { phoneNumber: "02-123-4567" }, "InvalidPhoneNumber"],
    ["개인정보 동의 안 함", { privacyConsent: false }, "PrivacyConsentRequired"],
  ])("A1: %s이면 거절한다", (_label, overrides, reason) => {
    expect(validateContactInfo({ ...contact, ...overrides })).toEqual({ ok: false, reason });
  });

  it("A1: 상담 희망 시간대는 오전·오후·저녁 가운데 하나만 받는다", () => {
    expect(validateContactInfo({ ...contact, preferredContactTime: "Night" as never })).toEqual({
      ok: false,
      reason: "InvalidPreferredContactTime",
    });
  });

  it("A1: 전화번호는 정규화해 남기고, 동의한 사실과 시각을 접수에 남긴다", () => {
    const created = application();
    expect(created.phoneNumber).toBe("01012345678");
    expect(created.privacyConsentedAt).toBe(t0.toISOString());
    expect(created.status).toBe("Submitted");
    expect(created.resubmissionCount).toBe(0);
  });
});

describe("A3 재접수 합침 판정 (168시간)", () => {
  it("A3: 마지막 접수 뒤 168시간 미만(167:59:59.999)이면 합친다", () => {
    expect(shouldMergeResubmission(application(), new Date(hours(168).getTime() - 1))).toBe(true);
  });

  it("A3: 168시간 정각부터는 새 접수를 만든다", () => {
    expect(shouldMergeResubmission(application(), hours(168))).toBe(false);
  });

  it.each<ApplicationStatus>(["Activated", "Cancelled"])(
    "A3: 기존 접수가 %s(끝 상태)면 168시간 안이어도 새 접수를 만든다",
    (status) => {
      expect(shouldMergeResubmission(application({ status }), hours(1))).toBe(false);
    },
  );

  it("A3: 상담중이면 합친다", () => {
    expect(shouldMergeResubmission(application({ status: "InConsultation" }), hours(1))).toBe(true);
  });

  it("A3: 합칠 때마다 168시간 창이 다시 시작된다", () => {
    const merged = mergeResubmission(application(), {
      contact: validContact(),
      estimate: { kind: "Empty" },
      now: hours(100),
    });
    expect(shouldMergeResubmission(merged.application, hours(267))).toBe(true);
    expect(shouldMergeResubmission(merged.application, hours(268))).toBe(false);
  });
});

describe("A4 합칠 때 규칙", () => {
  const newContact = validContact({
    name: "홍길순",
    phoneNumber: "01012345678",
    privacyConsent: true,
    installationRegion: null,
    preferredContactTime: "Evening",
  });

  it("A4: 연락처성 정보는 새 값으로 바꾸고, 빈 선택 항목은 기존 값을 유지한다", () => {
    const { application: merged } = mergeResubmission(application(), {
      contact: newContact,
      estimate: { kind: "Empty" },
      now: hours(1),
    });
    expect(merged.customerName).toBe("홍길순");
    expect(merged.installationRegion).toBe("서울 강남구");
    expect(merged.preferredContactTime).toBe("Evening");
    expect(merged.privacyConsentedAt).toBe(hours(1).toISOString());
  });

  it("A4: 접수 상태에서 계산 입력이 비었으면 스냅샷을 유지한다", () => {
    const { application: merged } = mergeResubmission(application(), {
      contact: newContact,
      estimate: { kind: "Empty" },
      now: hours(1),
    });
    expect(merged.estimateSnapshot).toEqual(snapshot(400_000));
  });

  it("A4: 접수 상태에서 계산 입력이 있으면 새 계산으로 바꾼다", () => {
    const { application: merged } = mergeResubmission(application(), {
      contact: newContact,
      estimate: { kind: "Calculated", snapshot: snapshot(450_000) },
      now: hours(1),
    });
    expect(merged.estimateSnapshot).toEqual(snapshot(450_000));
  });

  it("A4: 접수 상태에서 입력한 요금제가 기준표 버전에 없으면(C6) 스냅샷을 없앤다", () => {
    const { application: merged } = mergeResubmission(application(), {
      contact: newContact,
      estimate: { kind: "PlanNotInRateTable" },
      now: hours(1),
    });
    expect(merged.estimateSnapshot).toBeNull();
  });

  it("A4: 상담중이면 계산 입력이 있어도 스냅샷을 바꾸지 않고 연락처만 바꾼다", () => {
    const { application: merged, mergedInto } = mergeResubmission(application({ status: "InConsultation" }), {
      contact: newContact,
      estimate: { kind: "Calculated", snapshot: snapshot(450_000) },
      now: hours(1),
    });
    expect(merged.estimateSnapshot).toEqual(snapshot(400_000));
    expect(merged.customerName).toBe("홍길순");
    expect(mergedInto).toBe("InConsultation");
  });

  it("A4: visitorId·배정 변형·상태는 처음 값을 유지하고 재접수 횟수를 1 올린다", () => {
    const { application: merged, mergedInto } = mergeResubmission(application(), {
      contact: newContact,
      estimate: { kind: "Empty" },
      now: hours(1),
    });
    expect(merged).toMatchObject({ visitorId: "visitor-1", assignedVariant: "B", status: "Submitted" });
    expect(merged.resubmissionCount).toBe(1);
    expect(mergedInto).toBe("Submitted");
  });
});

describe("A6 상태 전이", () => {
  it.each<[ApplicationStatus, ApplicationStatus]>([
    ["Submitted", "InConsultation"],
    ["InConsultation", "Activated"],
    ["Submitted", "Cancelled"],
    ["InConsultation", "Cancelled"],
  ])("A6: %s → %s는 허용한다", (from, to) => {
    const result = changeStatus(application({ status: from }), to, "counselor-1", hours(1));
    expect(result.kind).toBe("Changed");
    if (result.kind === "Changed") expect(result.application.status).toBe(to);
  });

  it.each<[ApplicationStatus, ApplicationStatus]>([
    ["Submitted", "Activated"],
    ["InConsultation", "Submitted"],
    ["Activated", "Cancelled"],
    ["Activated", "InConsultation"],
    ["Cancelled", "InConsultation"],
    ["Cancelled", "Submitted"],
  ])("A6: %s → %s(건너뛰기, 거꾸로, 끝 상태에서)는 거절한다", (from, to) => {
    expect(changeStatus(application({ status: from }), to, "counselor-1", hours(1))).toEqual({
      kind: "Rejected",
      reason: "InvalidTransition",
    });
  });

  it.each<ApplicationStatus>(["Submitted", "InConsultation", "Activated", "Cancelled"])(
    "A6: 지금과 같은 상태(%s)로 가는 요청은 오류 없이 무시한다",
    (status) => {
      expect(changeStatus(application({ status }), status, "counselor-1", hours(1))).toEqual({ kind: "Unchanged" });
    },
  );
});

describe("A7 상태 변경 기록", () => {
  it("A7: 상태 변경에 처리한 상담원의 counselorId와 시각을 남긴다", () => {
    const result = changeStatus(application(), "InConsultation", "counselor-7", hours(2));
    if (result.kind !== "Changed") throw new Error(result.kind);
    expect(result.application.statusHistory).toEqual([
      { from: "Submitted", to: "InConsultation", counselorId: "counselor-7", changedAt: hours(2).toISOString() },
    ]);
  });
});
