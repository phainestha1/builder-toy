import type { ApplicationPort } from "@/modules/application/ports/application-port";
import type { CatalogPort } from "@/modules/catalog/ports/catalog-port";
import type { EventPublisher } from "@/modules/reward/application/event-publisher";
import {
  getReward,
  handleLineActivated,
  payRewardUseCase,
  type RewardDeps,
} from "@/modules/reward/application/reward-use-cases";
import type { RewardRepository } from "@/modules/reward/domain";
import { MemoryRewardRepository } from "@/modules/reward/infra/memory-reward-repository";
import type { ApplicationId, CounselorId, LineActivated } from "@/modules/shared/events";
import { application } from "./application";
import { catalog } from "./catalog";
import { eventBus } from "./event-bus";
import { globalSingleton } from "./global";

export interface RewardCompositionDeps {
  repository?: RewardRepository;
  applications: ApplicationPort;
  catalog: CatalogPort;
  publisher: EventPublisher;
  clock: () => Date;
}

export function createReward({ repository = new MemoryRewardRepository(), clock, ...ports }: RewardCompositionDeps) {
  const deps: RewardDeps = { rewards: repository, ...ports, now: () => clock().toISOString() };
  return {
    payReward: (command: { applicationId: ApplicationId; counselorId: CounselorId }) => payRewardUseCase(deps, command),
    getReward: (applicationId: ApplicationId) => getReward(deps, applicationId),
    /** `LineActivated` 구독 (R1). `subscriptions.ts`에서 버스에 붙인다 */
    handleLineActivated: (event: LineActivated) => handleLineActivated(deps, event),
  };
}

export type RewardComposition = ReturnType<typeof createReward>;

export const reward: RewardComposition = globalSingleton("__composition_reward", () =>
  createReward({
    applications: application.port,
    catalog: catalog.port,
    publisher: eventBus,
    clock: () => new Date(),
  }),
);
