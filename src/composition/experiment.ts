import type { RewardCalculationResult } from "@/modules/catalog/ports/catalog-port";
import {
  ensureAssignment,
  handleApplicationSubmitted,
  isCalculatorUser,
  recordExposure,
  recordRewardEstimated,
  type ExperimentDeps,
} from "@/modules/experiment/application/experiment-use-cases";
import type { CustomerScreen, ExperimentRepository, Variant } from "@/modules/experiment/domain";
import { createExperimentPort } from "@/modules/experiment/infra/experiment-port-adapter";
import { MemoryExperimentRepository } from "@/modules/experiment/infra/memory-experiment-repository";
import type { ApplicationSubmitted, VisitorId } from "@/modules/shared/events";
import { globalSingleton } from "./global";

export interface ExperimentCompositionDeps {
  repository: ExperimentRepository;
  pickVariant: () => Variant;
  clock: () => Date;
}

export function createExperiment({ repository, pickVariant, clock }: ExperimentCompositionDeps) {
  const deps: ExperimentDeps = { experiments: repository, pickVariant, now: () => clock().toISOString() };
  return {
    /** `application`에 넣는 조회 Port */
    port: createExperimentPort(repository),
    ensureAssignment: (command: { visitorId: VisitorId; screen: CustomerScreen }) => ensureAssignment(deps, command),
    recordExposure: (command: { visitorId: VisitorId }) => recordExposure(deps, command),
    recordRewardEstimated: (command: { visitorId: VisitorId; result: RewardCalculationResult }) =>
      recordRewardEstimated(deps, command),
    isCalculatorUser: (visitorId: VisitorId) => isCalculatorUser(deps, visitorId),
    /** `ApplicationSubmitted` 구독 (E5). `subscriptions.ts`에서 버스에 붙인다 */
    handleApplicationSubmitted: (event: ApplicationSubmitted) => handleApplicationSubmitted(deps, event),
  };
}

export type ExperimentComposition = ReturnType<typeof createExperiment>;

export const experiment: ExperimentComposition = globalSingleton("__composition_experiment", () =>
  createExperiment({
    repository: new MemoryExperimentRepository(),
    pickVariant: () => (Math.random() < 0.5 ? "A" : "B"),
    clock: () => new Date(),
  }),
);
