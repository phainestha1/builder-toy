// `experiment` 유스케이스: 배정 확인, 노출·계산 기록, 전환 기록(ApplicationSubmitted 핸들러).
import type { RewardCalculationResult } from "@/modules/catalog/ports/catalog-port";
import type {
  ApplicationSubmitted,
  AssignedVariant,
  IsoDateTime,
  VisitorId,
} from "@/modules/shared/events";
import {
  decideAssignment,
  recordedVariant,
  type CustomerScreen,
  type ExperimentRepository,
  type Variant,
} from "../domain";

export interface ExperimentDeps {
  experiments: ExperimentRepository;
  /** A안·B안 가운데 하나를 고른다. 실패하면 예외를 던질 수 있다 */
  pickVariant: () => Variant;
  now: () => IsoDateTime;
}

/**
 * 배정 확인 (E1). 고객 화면 01~04가 진입할 때 부른다.
 * 레코드가 있으면 그대로 돌려주고, 없으면 들어온 화면으로 정해 만든다.
 * 저장에 실패하면 레코드 없이 제외(A안)를 돌려주고, 다음 진입 때 다시 정한다 [가정].
 */
export async function ensureAssignment(
  deps: ExperimentDeps,
  command: { visitorId: VisitorId; screen: CustomerScreen },
): Promise<AssignedVariant> {
  const existing = await deps.experiments.findAssignment(command.visitorId);
  if (existing) return existing.variant;

  const variant = decideAssignment(command.screen, deps.pickVariant);
  try {
    await deps.experiments.saveAssignment({ visitorId: command.visitorId, variant, assignedAt: deps.now() });
  } catch {
    return "Excluded";
  }
  return variant;
}

/** 노출 기록 (E3). 랜딩이 보일 때 부른다. 방문자당 첫 1회만 */
export async function recordExposure(
  deps: ExperimentDeps,
  command: { visitorId: VisitorId },
): Promise<{ kind: "Recorded" | "AlreadyRecorded" }> {
  if (await deps.experiments.findExposure(command.visitorId)) return { kind: "AlreadyRecorded" };

  const assignment = await deps.experiments.findAssignment(command.visitorId);
  await deps.experiments.saveExposure({
    visitorId: command.visitorId,
    variant: recordedVariant(assignment),
    recordedAt: deps.now(),
  });
  return { kind: "Recorded" };
}

/**
 * 계산 기록 (E4). 라우트가 `catalog` 계산 결과를 그대로 넘긴다.
 * 계산됨일 때만, 계산할 때마다 기록한다. 거절과 기준표 버전에 없는 요금제(C6)는 기록하지 않는다.
 */
export async function recordRewardEstimated(
  deps: ExperimentDeps,
  command: { visitorId: VisitorId; result: RewardCalculationResult },
): Promise<{ kind: "Recorded" | "Skipped" }> {
  if (command.result.kind !== "Calculated") return { kind: "Skipped" };

  const assignment = await deps.experiments.findAssignment(command.visitorId);
  await deps.experiments.addEstimateRecord({
    visitorId: command.visitorId,
    variant: recordedVariant(assignment),
    rateTableVersion: command.result.rateTableVersion,
    recordedAt: deps.now(),
  });
  return { kind: "Recorded" };
}

/** 계산기 사용자 (`CalculatorUser`): 계산 기록이 1건 이상 있는 방문자 (E4) */
export async function isCalculatorUser(deps: ExperimentDeps, visitorId: VisitorId): Promise<boolean> {
  return (await deps.experiments.listEstimateRecords(visitorId)).length > 0;
}

/**
 * 전환 기록 (E5). `ApplicationSubmitted`를 받아 방문자당 1회만 기록한다.
 * 변형은 접수에 기록된 값만 보고, 현재 배정 레코드는 보지 않는다.
 */
export async function handleApplicationSubmitted(
  deps: ExperimentDeps,
  event: ApplicationSubmitted,
): Promise<{ kind: "Recorded" | "AlreadyRecorded" }> {
  const { visitorId, applicationId, assignedVariant } = event.payload;
  if (await deps.experiments.findConversion(visitorId)) return { kind: "AlreadyRecorded" };

  await deps.experiments.saveConversion({
    visitorId,
    applicationId,
    variant: assignedVariant,
    recordedAt: deps.now(),
  });
  return { kind: "Recorded" };
}
