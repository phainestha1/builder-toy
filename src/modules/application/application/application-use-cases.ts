import type { EstimateSnapshotLookup } from "@/modules/application/ports/application-port";
import type {
  CatalogPort,
  EstimateInput,
  EstimateRejectionReason,
  RewardEstimateView,
} from "@/modules/catalog/ports/catalog-port";
import type { ExperimentPort } from "@/modules/experiment/ports/experiment-port";
import type {
  ApplicationId,
  AssignedVariant,
  CounselorId,
  IsoDateTime,
  VisitorId,
  Won,
} from "@/modules/shared/events";
import {
  type Application,
  type ApplicationStatus,
  type ContactInfoInput,
  type ContactRejectionReason,
  type EstimateSnapshot,
  type PreferredContactTime,
  type ResubmissionEstimate,
  type StatusChange,
  changeStatus,
  createApplication,
  mergeResubmission,
  shouldMergeResubmission,
  validateContactInfo,
} from "../domain/application";
import { lastFourOf, maskPhoneNumber } from "../domain/phone-number";
import type { ApplicationRepository } from "./application-repository";
import type { EventPublisher } from "./event-publisher";
import { KeyedLock } from "./keyed-lock";

export interface ApplicationDependencies {
  repository: ApplicationRepository;
  catalog: CatalogPort;
  experiment: ExperimentPort;
  events: EventPublisher;
  clock: () => Date;
  nextApplicationId: () => ApplicationId;
}

export interface SubmitApplicationCommand {
  visitorId: VisitorId;
  contact: ContactInfoInput;
  estimateInput: EstimateInput;
}

export type SubmitApplicationResult =
  | {
      kind: "Submitted";
      applicationId: ApplicationId;
      /** 접수할 때 서버가 계산한 값. 완료 화면에 이 값을 보여 준다 (A2) */
      estimate: RewardEstimateView | null;
    }
  | {
      kind: "Merged";
      message: string;
      /** 이번 합침에서 스냅샷을 새로 계산했을 때만 그 값. 기존 접수 내용은 담지 않는다 (A4) */
      estimate: RewardEstimateView | null;
    }
  | { kind: "Rejected"; reason: ContactRejectionReason | Exclude<EstimateRejectionReason, "EmptyInput"> };

export type ChangeApplicationStatusResult =
  | { kind: "Changed" }
  | { kind: "Unchanged" }
  | { kind: "Rejected"; reason: "InvalidTransition" }
  | { kind: "NotFound" };

/** 어드민 목록 한 줄. 전화번호는 가린 값만 담는다 (A8) */
export interface ApplicationSummary {
  applicationId: ApplicationId;
  customerName: string;
  maskedPhoneNumber: string;
  status: ApplicationStatus;
  assignedVariant: AssignedVariant;
  resubmissionCount: number;
  /** 계산 결과 스냅샷의 예상 지원금 합계. 스냅샷이 없으면 `null` */
  estimateTotal: Won | null;
  submittedAt: IsoDateTime;
  lastSubmittedAt: IsoDateTime;
}

export interface ApplicationDetail extends ApplicationSummary {
  visitorId: VisitorId;
  installationRegion: string | null;
  preferredContactTime: PreferredContactTime | null;
  privacyConsentedAt: IsoDateTime;
  estimateSnapshot: EstimateSnapshot | null;
  statusHistory: StatusChange[];
}

const MERGE_MESSAGES = {
  Submitted: "이미 접수된 상담이 있어요. 새 내용으로 업데이트했어요",
  InConsultation: "이미 상담 중인 접수가 있어요. 연락처 정보만 업데이트했어요",
} as const;

const STATUS_EVENT = {
  InConsultation: "ConsultationStarted",
  Activated: "LineActivated",
  Cancelled: "ApplicationCancelled",
} as const;

export function createApplicationUseCases(deps: ApplicationDependencies) {
  const { repository, catalog, experiment, events, clock, nextApplicationId } = deps;
  const phoneLock = new KeyedLock();

  /** C4로 검사하고 계산한다. 입력이 전부 비면 계산 없이 진행한다 (A2) */
  async function estimateFor(
    input: EstimateInput,
  ): Promise<ResubmissionEstimate | { kind: "Rejected"; reason: Exclude<EstimateRejectionReason, "EmptyInput"> }> {
    const result = await catalog.calculateRewardWithCurrentVersion(input);
    switch (result.kind) {
      case "Calculated":
        return {
          kind: "Calculated",
          snapshot: {
            input: result.input,
            appliedEarlyTerminationFee: result.appliedEarlyTerminationFee,
            rateTableVersion: result.rateTableVersion,
            estimate: result.estimate,
          },
        };
      case "PlanNotInRateTable":
        return { kind: "PlanNotInRateTable" };
      case "Rejected":
        return result.reason === "EmptyInput" ? { kind: "Empty" } : { kind: "Rejected", reason: result.reason };
    }
  }

  /** 접수 (A1~A5, A9) */
  async function submitApplication(command: SubmitApplicationCommand): Promise<SubmitApplicationResult> {
    const contactResult = validateContactInfo(command.contact);
    if (!contactResult.ok) return { kind: "Rejected", reason: contactResult.reason };
    const contact = contactResult.contact;

    const estimate = await estimateFor(command.estimateInput);
    if (estimate.kind === "Rejected") return estimate;

    return phoneLock.run(contact.phoneNumber, async () => {
      const now = clock();
      const existing = await repository.findLatestByPhoneNumber(contact.phoneNumber);

      if (existing && shouldMergeResubmission(existing, now)) {
        const { application, mergedInto } = mergeResubmission(existing, { contact, estimate, now });
        await repository.save(application);
        await events.publish({
          type: "ApplicationMerged",
          occurredAt: now.toISOString(),
          payload: { applicationId: application.id, resubmissionCount: application.resubmissionCount },
        });
        const recalculated = mergedInto === "Submitted" && estimate.kind === "Calculated";
        return {
          kind: "Merged",
          message: MERGE_MESSAGES[mergedInto],
          estimate: recalculated ? estimate.snapshot.estimate : null,
        };
      }

      const assignment = await experiment.findAssignment(command.visitorId);
      const application = createApplication({
        id: nextApplicationId(),
        visitorId: command.visitorId,
        assignedVariant: assignment?.variant ?? "Excluded",
        contact,
        estimateSnapshot: estimate.kind === "Calculated" ? estimate.snapshot : null,
        now,
      });
      await repository.save(application);
      await events.publish({
        type: "ApplicationSubmitted",
        occurredAt: application.submittedAt,
        payload: {
          applicationId: application.id,
          visitorId: application.visitorId,
          assignedVariant: application.assignedVariant,
        },
      });
      return {
        kind: "Submitted",
        applicationId: application.id,
        estimate: application.estimateSnapshot?.estimate ?? null,
      };
    });
  }

  /** 상태 변경 (A6, A7) */
  async function changeApplicationStatus(command: {
    applicationId: ApplicationId;
    to: ApplicationStatus;
    counselorId: CounselorId;
  }): Promise<ChangeApplicationStatusResult> {
    const application = await repository.findById(command.applicationId);
    if (!application) return { kind: "NotFound" };
    const now = clock();
    const result = changeStatus(application, command.to, command.counselorId, now);
    if (result.kind !== "Changed") return result;

    await repository.save(result.application);
    const to = result.application.status as keyof typeof STATUS_EVENT;
    await events.publish({
      type: STATUS_EVENT[to],
      occurredAt: now.toISOString(),
      payload: { applicationId: application.id, counselorId: command.counselorId },
    });
    return { kind: "Changed" };
  }

  /** 어드민 목록. 전화번호 검색은 뒷자리 4자리로만 한다 (A8) */
  async function listApplications(query: {
    phoneLastFour: string | null;
  }): Promise<{ kind: "Listed"; items: ApplicationSummary[] } | { kind: "Rejected"; reason: "InvalidPhoneSearch" }> {
    const { phoneLastFour } = query;
    if (phoneLastFour !== null && !/^\d{4}$/.test(phoneLastFour)) {
      return { kind: "Rejected", reason: "InvalidPhoneSearch" };
    }
    const all = await repository.list();
    const matched = phoneLastFour === null ? all : all.filter((a) => lastFourOf(a.phoneNumber) === phoneLastFour);
    return { kind: "Listed", items: matched.map(toSummary) };
  }

  async function getApplicationDetail(
    applicationId: ApplicationId,
  ): Promise<{ kind: "Found"; detail: ApplicationDetail } | { kind: "NotFound" }> {
    const application = await repository.findById(applicationId);
    if (!application) return { kind: "NotFound" };
    return {
      kind: "Found",
      detail: {
        ...toSummary(application),
        visitorId: application.visitorId,
        installationRegion: application.installationRegion,
        preferredContactTime: application.preferredContactTime,
        privacyConsentedAt: application.privacyConsentedAt,
        estimateSnapshot: application.estimateSnapshot,
        statusHistory: application.statusHistory,
      },
    };
  }

  /** 전화번호 열람. 원래 번호는 이 명령으로만 주고 누가, 언제 봤는지 남긴다 (A8) */
  async function revealPhoneNumber(command: {
    applicationId: ApplicationId;
    counselorId: CounselorId;
  }): Promise<{ kind: "Revealed"; phoneNumber: string } | { kind: "NotFound" }> {
    const application = await repository.findById(command.applicationId);
    if (!application) return { kind: "NotFound" };
    await repository.saveReveal({
      applicationId: application.id,
      counselorId: command.counselorId,
      revealedAt: clock().toISOString(),
    });
    return { kind: "Revealed", phoneNumber: application.phoneNumber };
  }

  /** `ApplicationPort` 조회: 접수의 계산 결과 스냅샷 (R2, R3) */
  async function findEstimateSnapshot(applicationId: ApplicationId): Promise<EstimateSnapshotLookup> {
    const application = await repository.findById(applicationId);
    if (!application) return { kind: "ApplicationNotFound", applicationId };
    if (!application.estimateSnapshot) return { kind: "NoSnapshot", applicationId };
    return { kind: "Found", snapshot: { applicationId, ...application.estimateSnapshot } };
  }

  return {
    submitApplication,
    changeApplicationStatus,
    listApplications,
    getApplicationDetail,
    revealPhoneNumber,
    findEstimateSnapshot,
  };
}

export type ApplicationUseCases = ReturnType<typeof createApplicationUseCases>;

function toSummary(application: Application): ApplicationSummary {
  return {
    applicationId: application.id,
    customerName: application.customerName,
    maskedPhoneNumber: maskPhoneNumber(application.phoneNumber),
    status: application.status,
    assignedVariant: application.assignedVariant,
    resubmissionCount: application.resubmissionCount,
    estimateTotal: application.estimateSnapshot?.estimate.total ?? null,
    submittedAt: application.submittedAt,
    lastSubmittedAt: application.lastSubmittedAt,
  };
}
