import { beforeEach, describe, expect, it } from "vitest";
import type { CatalogPort, EstimateInput, RewardCalculationResult } from "@/modules/catalog/ports/catalog-port";
import type { AssignmentView, ExperimentPort } from "@/modules/experiment/ports/experiment-port";
import type { ApplicationEvent, AssignedVariant } from "@/modules/shared/events";
import type { Application } from "../domain/application";
import type { ApplicationRepository, PhoneNumberReveal } from "./application-repository";
import {
  type ApplicationUseCases,
  type SubmitApplicationCommand,
  createApplicationUseCases,
} from "./application-use-cases";

// --- 가짜 의존성 ---------------------------------------------------------

/** 저장소 가짜. 매 호출마다 한 번 양보해서 동시 접수(A5)가 실제로 겹치게 한다 */
class FakeApplicationRepository implements ApplicationRepository {
  readonly applications = new Map<string, Application>();
  readonly reveals: PhoneNumberReveal[] = [];
  private readonly tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  async save(application: Application) {
    await this.tick();
    this.applications.set(application.id, structuredClone(application));
  }
  async findById(id: string) {
    await this.tick();
    const found = this.applications.get(id);
    return found ? structuredClone(found) : null;
  }
  async findLatestByPhoneNumber(phoneNumber: string) {
    await this.tick();
    const matches = [...this.applications.values()].filter((a) => a.phoneNumber === phoneNumber);
    const latest = matches.at(-1);
    return latest ? structuredClone(latest) : null;
  }
  async list() {
    return [...this.applications.values()].map((a) => structuredClone(a));
  }
  async saveReveal(reveal: PhoneNumberReveal) {
    this.reveals.push(reveal);
  }
  async listReveals(applicationId: string) {
    return this.reveals.filter((r) => r.applicationId === applicationId);
  }
}

/** CatalogPort 가짜. 요금제마다 기본 지원금을 정하고, plan-100m은 기준표에 없음(C6), 그 밖은 없는 요금제 */
const BASE: Record<string, number> = { "plan-500m": 400_000, "plan-1g": 450_000 };
const fakeCatalog: CatalogPort = {
  async calculateRewardWithCurrentVersion(input: EstimateInput): Promise<RewardCalculationResult> {
    if (input.planId === null || input.hasRemainingCommitment === null) {
      return { kind: "Rejected", reason: input.earlyTerminationFee === null ? "EmptyInput" : "PartialInput" };
    }
    if (input.planId === "plan-100m") return { kind: "PlanNotInRateTable", rateTableVersion: "v1", planId: "plan-100m" };
    const base = BASE[input.planId];
    if (base === undefined) return { kind: "Rejected", reason: "UnknownPlan" };
    if (input.hasRemainingCommitment && (input.remainingCommitmentMonths ?? -1) > 36) {
      return { kind: "Rejected", reason: "OutOfRange" };
    }
    const fee = input.hasRemainingCommitment ? (input.earlyTerminationFee ?? 200_000) : 0;
    const coverage = Math.min(fee, 300_000);
    return {
      kind: "Calculated",
      rateTableVersion: "v1",
      input: {
        planId: input.planId,
        hasRemainingCommitment: input.hasRemainingCommitment,
        remainingCommitmentMonths: input.hasRemainingCommitment ? input.remainingCommitmentMonths : null,
        earlyTerminationFee: !input.hasRemainingCommitment
          ? { kind: "NotApplicable" }
          : input.earlyTerminationFee === null
            ? { kind: "Unknown" }
            : { kind: "Entered", amount: input.earlyTerminationFee },
      },
      appliedEarlyTerminationFee: fee,
      estimate: { baseReward: base, feeCoverage: coverage, total: base + coverage },
    };
  },
  async calculateRewardWithVersion() {
    throw new Error("application은 쓰지 않는다");
  },
};

function fakeExperiment(assignments: Record<string, AssignedVariant>): ExperimentPort {
  return {
    async findAssignment(visitorId): Promise<AssignmentView | null> {
      const variant = assignments[visitorId];
      return variant ? { visitorId, variant } : null;
    },
  };
}

// --- 공통 준비 -----------------------------------------------------------

const t0 = new Date("2026-10-05T00:00:00.000Z");
const hours = (h: number) => new Date(t0.getTime() + h * 3_600_000);

const emptyEstimate: EstimateInput = {
  planId: null,
  hasRemainingCommitment: null,
  remainingCommitmentMonths: null,
  earlyTerminationFee: null,
};
const estimate500: EstimateInput = {
  planId: "plan-500m",
  hasRemainingCommitment: true,
  remainingCommitmentMonths: 12,
  earlyTerminationFee: 100_000,
};

function command(overrides: Partial<SubmitApplicationCommand> = {}): SubmitApplicationCommand {
  return {
    visitorId: "visitor-1",
    contact: {
      name: "홍길동",
      phoneNumber: "010-1234-5678",
      privacyConsent: true,
      installationRegion: "서울 강남구",
      preferredContactTime: "Morning",
    },
    estimateInput: estimate500,
    ...overrides,
  };
}

let repository: FakeApplicationRepository;
let events: ApplicationEvent[];
let now: Date;
let useCases: ApplicationUseCases;

function setUp(assignments: Record<string, AssignedVariant> = { "visitor-1": "B" }) {
  repository = new FakeApplicationRepository();
  events = [];
  now = t0;
  let sequence = 0;
  useCases = createApplicationUseCases({
    repository,
    catalog: fakeCatalog,
    experiment: fakeExperiment(assignments),
    events: {
      async publish(event) {
        events.push(event);
      },
    },
    clock: () => now,
    nextApplicationId: () => `app-${++sequence}`,
  });
}

beforeEach(() => setUp());

async function submitted(cmd = command()) {
  const result = await useCases.submitApplication(cmd);
  if (result.kind !== "Submitted") throw new Error(JSON.stringify(result));
  return result;
}

// --- 테스트 --------------------------------------------------------------

describe("A1 접수 필수 항목 (유스케이스)", () => {
  it("A1: 필수 항목이 없으면 접수를 거절하고 아무것도 저장·발행하지 않는다", async () => {
    const result = await useCases.submitApplication(
      command({ contact: { ...command().contact, privacyConsent: false } }),
    );
    expect(result).toEqual({ kind: "Rejected", reason: "PrivacyConsentRequired" });
    expect(repository.applications.size).toBe(0);
    expect(events).toEqual([]);
  });
});

describe("A2 계산 결과 스냅샷", () => {
  it("A2: 계산 입력이 있으면 서버가 현재 기준표 버전으로 다시 계산해 스냅샷을 남기고 그 값을 돌려준다", async () => {
    const result = await submitted();
    expect(result.estimate).toEqual({ baseReward: 400_000, feeCoverage: 100_000, total: 500_000 });
    const saved = repository.applications.get(result.applicationId)!;
    expect(saved.estimateSnapshot).toMatchObject({
      rateTableVersion: "v1",
      appliedEarlyTerminationFee: 100_000,
      input: { planId: "plan-500m", earlyTerminationFee: { kind: "Entered", amount: 100_000 } },
    });
  });

  it("A2: 계산 입력이 전부 비면 계산 없이 접수한다", async () => {
    const result = await submitted(command({ estimateInput: emptyEstimate }));
    expect(result.estimate).toBeNull();
    expect(repository.applications.get(result.applicationId)!.estimateSnapshot).toBeNull();
  });

  it("A2·C6: 요금제가 기준표 버전에 없으면 스냅샷 없이 접수한다", async () => {
    const result = await submitted(command({ estimateInput: { ...estimate500, planId: "plan-100m" } }));
    expect(repository.applications.get(result.applicationId)!.estimateSnapshot).toBeNull();
  });

  it.each<[string, EstimateInput, string]>([
    ["일부만 있음", { ...emptyEstimate, earlyTerminationFee: 100_000 }, "PartialInput"],
    ["범위 밖", { ...estimate500, remainingCommitmentMonths: 37 }, "OutOfRange"],
    ["없는 요금제", { ...estimate500, planId: "plan-nope" }, "UnknownPlan"],
  ])("A2·C4: 계산 입력이 %s이면 접수를 거절한다", async (_label, estimateInput, reason) => {
    expect(await useCases.submitApplication(command({ estimateInput }))).toEqual({ kind: "Rejected", reason });
    expect(repository.applications.size).toBe(0);
  });
});

describe("A3 재접수 합침 (168시간)", () => {
  it("A3: 167:59:59.999 뒤 같은 번호 접수는 합치고 ApplicationMerged만 발행한다", async () => {
    await submitted();
    now = new Date(hours(168).getTime() - 1);
    const result = await useCases.submitApplication(command({ contact: { ...command().contact, phoneNumber: "01012345678" } }));
    expect(result.kind).toBe("Merged");
    expect(repository.applications.size).toBe(1);
    expect(events.map((e) => e.type)).toEqual(["ApplicationSubmitted", "ApplicationMerged"]);
    expect(events[1].payload).toEqual({ applicationId: "app-1", resubmissionCount: 1 });
  });

  it("A3: 168시간 정각이면 새 접수를 만든다", async () => {
    await submitted();
    now = hours(168);
    expect((await useCases.submitApplication(command())).kind).toBe("Submitted");
    expect(repository.applications.size).toBe(2);
  });

  it("A3: 기존 접수가 취소(끝 상태)면 168시간 안이어도 새 접수를 만든다", async () => {
    await submitted();
    await useCases.changeApplicationStatus({ applicationId: "app-1", to: "Cancelled", counselorId: "c-1" });
    now = hours(1);
    expect((await useCases.submitApplication(command())).kind).toBe("Submitted");
  });
});

describe("A4 합칠 때 규칙 (유스케이스)", () => {
  it("A4: 접수 상태에서 합치면 '새 내용으로 업데이트' 문구를 주고 기존 접수 내용은 담지 않는다", async () => {
    await submitted();
    now = hours(1);
    const result = await useCases.submitApplication(command({ estimateInput: emptyEstimate }));
    expect(result).toEqual({
      kind: "Merged",
      message: "이미 접수된 상담이 있어요. 새 내용으로 업데이트했어요",
      estimate: null,
    });
  });

  it("A4·A2: 접수 상태에서 새 계산 입력으로 합치면 다시 계산한 새 값을 저장하고 돌려준다", async () => {
    await submitted();
    now = hours(1);
    const result = await useCases.submitApplication(
      command({ estimateInput: { ...estimate500, planId: "plan-1g", earlyTerminationFee: 0 } }),
    );
    expect(result).toMatchObject({ kind: "Merged", estimate: { total: 450_000 } });
    expect(repository.applications.get("app-1")!.estimateSnapshot?.estimate.total).toBe(450_000);
  });

  it("A4: 상담중에서 합치면 연락처만 바꾸는 문구를 주고 스냅샷은 그대로 둔다", async () => {
    await submitted();
    await useCases.changeApplicationStatus({ applicationId: "app-1", to: "InConsultation", counselorId: "c-1" });
    now = hours(1);
    const result = await useCases.submitApplication(
      command({
        contact: { ...command().contact, name: "홍길순" },
        estimateInput: { ...estimate500, planId: "plan-1g" },
      }),
    );
    expect(result).toEqual({
      kind: "Merged",
      message: "이미 상담 중인 접수가 있어요. 연락처 정보만 업데이트했어요",
      estimate: null,
    });
    const saved = repository.applications.get("app-1")!;
    expect(saved.customerName).toBe("홍길순");
    expect(saved.estimateSnapshot?.estimate.total).toBe(500_000);
  });

  it("A4: 상담중 합침에서도 계산 입력이 틀리면 C4로 거절한다", async () => {
    await submitted();
    await useCases.changeApplicationStatus({ applicationId: "app-1", to: "InConsultation", counselorId: "c-1" });
    now = hours(1);
    const result = await useCases.submitApplication(command({ estimateInput: { ...estimate500, planId: "plan-nope" } }));
    expect(result).toEqual({ kind: "Rejected", reason: "UnknownPlan" });
    expect(repository.applications.get("app-1")!.resubmissionCount).toBe(0);
  });

  it("A4: 다른 방문자가 같은 번호로 합쳐도 visitorId와 배정 변형은 처음 값을 유지한다", async () => {
    setUp({ "visitor-1": "B", "visitor-2": "A" });
    await submitted();
    now = hours(1);
    await useCases.submitApplication(command({ visitorId: "visitor-2" }));
    expect(repository.applications.get("app-1")).toMatchObject({ visitorId: "visitor-1", assignedVariant: "B" });
  });
});

describe("A5 동시 접수", () => {
  it("A5: 같은 번호로 동시에 두 번 접수하면 하나만 새로 만들고 나머지는 합친다", async () => {
    const results = await Promise.all([
      useCases.submitApplication(command()),
      useCases.submitApplication(command({ contact: { ...command().contact, phoneNumber: "01012345678" } })),
    ]);
    expect(results.map((r) => r.kind).sort()).toEqual(["Merged", "Submitted"]);
    expect(repository.applications.size).toBe(1);
  });

  it("A5: 다른 번호의 동시 접수는 서로 막지 않고 각각 만든다", async () => {
    const results = await Promise.all([
      useCases.submitApplication(command()),
      useCases.submitApplication(command({ contact: { ...command().contact, phoneNumber: "01099998888" } })),
    ]);
    expect(results.map((r) => r.kind)).toEqual(["Submitted", "Submitted"]);
  });
});

describe("A9 접수의 visitorId와 배정 변형", () => {
  it.each<AssignedVariant>(["A", "B", "Excluded"])(
    "A9: 배정 레코드 값(%s)을 접수에 남기고 ApplicationSubmitted로 발행한다",
    async (variant) => {
      setUp({ "visitor-1": variant });
      const result = await submitted();
      expect(repository.applications.get(result.applicationId)).toMatchObject({
        visitorId: "visitor-1",
        assignedVariant: variant,
      });
      expect(events).toEqual([
        {
          type: "ApplicationSubmitted",
          occurredAt: t0.toISOString(),
          payload: { applicationId: result.applicationId, visitorId: "visitor-1", assignedVariant: variant },
        },
      ]);
    },
  );

  it("A9: 배정 레코드가 없으면 Excluded로 남긴다", async () => {
    setUp({});
    const result = await submitted();
    expect(repository.applications.get(result.applicationId)!.assignedVariant).toBe("Excluded");
  });

  it("P1: 발행한 이벤트 payload에 이름·전화번호가 없다", async () => {
    await submitted();
    now = hours(1);
    await useCases.submitApplication(command());
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("홍길동");
    expect(serialized).not.toContain("01012345678");
  });
});

describe("A6·A7 상태 변경 유스케이스", () => {
  it.each([
    ["InConsultation", "ConsultationStarted"],
    ["Cancelled", "ApplicationCancelled"],
  ] as const)("A7: %s로 바꾸면 %s를 counselorId와 함께 발행한다", async (to, type) => {
    await submitted();
    now = hours(2);
    const result = await useCases.changeApplicationStatus({ applicationId: "app-1", to, counselorId: "c-9" });
    expect(result).toEqual({ kind: "Changed" });
    expect(events.at(-1)).toEqual({
      type,
      occurredAt: hours(2).toISOString(),
      payload: { applicationId: "app-1", counselorId: "c-9" },
    });
    expect(repository.applications.get("app-1")!.statusHistory.at(-1)).toMatchObject({
      counselorId: "c-9",
      changedAt: hours(2).toISOString(),
    });
  });

  it("A6: 상담중 → 개통완료면 LineActivated를 발행한다", async () => {
    await submitted();
    await useCases.changeApplicationStatus({ applicationId: "app-1", to: "InConsultation", counselorId: "c-1" });
    await useCases.changeApplicationStatus({ applicationId: "app-1", to: "Activated", counselorId: "c-1" });
    expect(events.at(-1)?.type).toBe("LineActivated");
  });

  it("A6: 접수 → 개통완료는 거절하고 이벤트를 내지 않는다", async () => {
    await submitted();
    const before = events.length;
    expect(
      await useCases.changeApplicationStatus({ applicationId: "app-1", to: "Activated", counselorId: "c-1" }),
    ).toEqual({ kind: "Rejected", reason: "InvalidTransition" });
    expect(events.length).toBe(before);
  });

  it("A6: 같은 상태로 가는 요청은 오류 없이 무시하고 이벤트를 내지 않는다", async () => {
    await submitted();
    const before = events.length;
    expect(
      await useCases.changeApplicationStatus({ applicationId: "app-1", to: "Submitted", counselorId: "c-1" }),
    ).toEqual({ kind: "Unchanged" });
    expect(events.length).toBe(before);
  });

  it("없는 접수의 상태 변경은 NotFound", async () => {
    expect(
      await useCases.changeApplicationStatus({ applicationId: "app-x", to: "Cancelled", counselorId: "c-1" }),
    ).toEqual({ kind: "NotFound" });
  });
});

describe("A8 어드민 목록·상세와 전화번호 열람", () => {
  it("A8: 목록과 상세에는 가린 전화번호만 담는다", async () => {
    await submitted();
    const list = await useCases.listApplications({ phoneLastFour: null });
    if (list.kind !== "Listed") throw new Error(list.kind);
    expect(list.items[0]).toMatchObject({ maskedPhoneNumber: "010-****-5678", estimateTotal: 500_000 });
    const detail = await useCases.getApplicationDetail("app-1");
    expect(JSON.stringify(list)).not.toContain("01012345678");
    expect(JSON.stringify(detail)).not.toContain("01012345678");
    expect(detail).toMatchObject({ kind: "Found", detail: { maskedPhoneNumber: "010-****-5678" } });
  });

  it("A8: 전화번호 검색은 뒷자리 4자리로만 한다", async () => {
    await submitted();
    await submitted(command({ contact: { ...command().contact, phoneNumber: "010-5555-1111" } }));
    const found = await useCases.listApplications({ phoneLastFour: "1111" });
    expect(found).toMatchObject({ kind: "Listed", items: [{ maskedPhoneNumber: "010-****-1111" }] });
    expect(await useCases.listApplications({ phoneLastFour: "01055551111" })).toEqual({
      kind: "Rejected",
      reason: "InvalidPhoneSearch",
    });
  });

  it("A8: 원래 번호는 열람 명령으로만 주고, 누가 언제 봤는지 남긴다", async () => {
    await submitted();
    now = hours(3);
    const result = await useCases.revealPhoneNumber({ applicationId: "app-1", counselorId: "c-5" });
    expect(result).toEqual({ kind: "Revealed", phoneNumber: "01012345678" });
    expect(repository.reveals).toEqual([
      { applicationId: "app-1", counselorId: "c-5", revealedAt: hours(3).toISOString() },
    ]);
  });

  it("A8: 없는 접수는 열람 기록을 남기지 않는다", async () => {
    expect(await useCases.revealPhoneNumber({ applicationId: "app-x", counselorId: "c-5" })).toEqual({
      kind: "NotFound",
    });
    expect(repository.reveals).toEqual([]);
  });
});

describe("ApplicationPort 조회 (R2·R3 근거)", () => {
  it("스냅샷이 있으면 Found, 없으면 NoSnapshot, 접수가 없으면 ApplicationNotFound", async () => {
    await submitted();
    await submitted(command({ estimateInput: emptyEstimate, contact: { ...command().contact, phoneNumber: "01099990000" } }));
    expect(await useCases.findEstimateSnapshot("app-1")).toMatchObject({
      kind: "Found",
      snapshot: { applicationId: "app-1", rateTableVersion: "v1", estimate: { total: 500_000 } },
    });
    expect(await useCases.findEstimateSnapshot("app-2")).toEqual({ kind: "NoSnapshot", applicationId: "app-2" });
    expect(await useCases.findEstimateSnapshot("app-x")).toEqual({ kind: "ApplicationNotFound", applicationId: "app-x" });
  });
});
