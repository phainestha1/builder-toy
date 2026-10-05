// `reward` 유스케이스: 개통 뒤 지원금 산정(LineActivated 핸들러), 지급, 조회.
import type { ApplicationPort } from "@/modules/application/ports/application-port";
import type {
  CatalogPort,
  EstimateInput,
  NormalizedEstimateInput,
} from "@/modules/catalog/ports/catalog-port";
import type {
  ApplicationId,
  CounselorId,
  IsoDateTime,
  LineActivated,
  RewardCalculated,
  RewardPaid,
} from "@/modules/shared/events";
import {
  calculatedReward,
  notEligibleReward,
  payReward,
  type PayoutRejectionReason,
  type Reward,
  type RewardRepository,
} from "../domain";
import type { EventPublisher } from "./event-publisher";

export interface RewardDeps {
  rewards: RewardRepository;
  applications: ApplicationPort;
  catalog: CatalogPort;
  publisher: EventPublisher;
  now: () => IsoDateTime;
}

export type LineActivatedResult =
  | { kind: "Calculated"; events: RewardCalculated[] }
  | { kind: "NotEligible"; events: [] }
  | { kind: "AlreadyExists"; events: [] }
  | { kind: "Failed"; reason: "ApplicationNotFound" | "RecalculationFailed"; events: [] };

/** 스냅샷의 정규화된 입력을 계산 입력으로 되돌린다 (R2) */
function toEstimateInput(input: NormalizedEstimateInput): EstimateInput {
  const fee = input.earlyTerminationFee;
  return {
    planId: input.planId,
    hasRemainingCommitment: input.hasRemainingCommitment,
    remainingCommitmentMonths: input.remainingCommitmentMonths,
    earlyTerminationFee: fee.kind === "Entered" ? fee.amount : null,
  };
}

/** `LineActivated`를 받아 지원금을 산정한다 (R1~R4) */
export async function handleLineActivated(
  deps: RewardDeps,
  event: LineActivated,
): Promise<LineActivatedResult> {
  const { applicationId } = event.payload;
  // R4: 접수 1건에 지원금 하나. 이미 있으면 다시 산정하지 않는다
  if (await deps.rewards.findByApplicationId(applicationId)) {
    return { kind: "AlreadyExists", events: [] };
  }

  const lookup = await deps.applications.findEstimateSnapshot(applicationId);
  if (lookup.kind === "ApplicationNotFound") {
    return { kind: "Failed", reason: "ApplicationNotFound", events: [] };
  }
  if (lookup.kind === "NoSnapshot") {
    // R3: 고객이 본 적 없는 금액은 만들지 않는다
    await deps.rewards.save(notEligibleReward({ applicationId, decidedAt: deps.now() }));
    return { kind: "NotEligible", events: [] };
  }

  // R2: 스냅샷의 입력과 기준표 버전으로 같은 공식을 다시 계산한다
  const { snapshot } = lookup;
  const result = await deps.catalog.calculateRewardWithVersion(
    toEstimateInput(snapshot.input),
    snapshot.rateTableVersion,
  );
  if (result.kind !== "Calculated") {
    return { kind: "Failed", reason: "RecalculationFailed", events: [] };
  }

  const calculatedAt = deps.now();
  const reward = calculatedReward({
    applicationId,
    rateTableVersion: result.rateTableVersion,
    baseReward: result.estimate.baseReward,
    feeCoverage: result.estimate.feeCoverage,
    totalReward: result.estimate.total,
    calculatedAt,
  });
  await deps.rewards.save(reward);

  const calculated: RewardCalculated = {
    type: "RewardCalculated",
    occurredAt: calculatedAt,
    payload: {
      applicationId,
      rateTableVersion: reward.rateTableVersion,
      baseReward: reward.baseReward,
      feeCoverage: reward.feeCoverage,
      totalReward: reward.totalReward,
    },
  };
  await deps.publisher.publish(calculated);
  return { kind: "Calculated", events: [calculated] };
}

export type PayRewardResult =
  | { kind: "Paid"; events: RewardPaid[] }
  | { kind: "Rejected"; reason: PayoutRejectionReason | "RewardNotFound" };

/** 지급 (R5·R6). `counselorId`는 라우트가 어드민 세션에서 꺼내 넘긴다 */
export async function payRewardUseCase(
  deps: RewardDeps,
  command: { applicationId: ApplicationId; counselorId: CounselorId },
): Promise<PayRewardResult> {
  const reward = await deps.rewards.findByApplicationId(command.applicationId);
  // R1: 개통 전에는 지원금이 없다
  if (!reward) return { kind: "Rejected", reason: "RewardNotFound" };

  const result = payReward(reward, { counselorId: command.counselorId, paidAt: deps.now() });
  if (result.kind === "Rejected") return result;

  await deps.rewards.save(result.reward);
  const paid: RewardPaid = {
    type: "RewardPaid",
    occurredAt: result.reward.paidAt,
    payload: {
      applicationId: result.reward.applicationId,
      counselorId: result.reward.paidBy,
      totalReward: result.reward.totalReward,
    },
  };
  await deps.publisher.publish(paid);
  return { kind: "Paid", events: [paid] };
}

/** 어드민의 지원금 표시용 조회. 개통 전이면 `null` */
export async function getReward(
  deps: Pick<RewardDeps, "rewards">,
  applicationId: ApplicationId,
): Promise<Reward | null> {
  return deps.rewards.findByApplicationId(applicationId);
}
