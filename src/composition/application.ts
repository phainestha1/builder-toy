import type { ApplicationRepository } from "@/modules/application/application/application-repository";
import {
  createApplicationUseCases,
  type ApplicationDependencies,
} from "@/modules/application/application/application-use-cases";
import { createApplicationPort } from "@/modules/application/infra/application-port-adapter";
import { InMemoryApplicationRepository } from "@/modules/application/infra/in-memory-application-repository";
import { catalog } from "./catalog";
import { eventBus } from "./event-bus";
import { experiment } from "./experiment";
import { globalSingleton } from "./global";

export type ApplicationCompositionDeps = Omit<ApplicationDependencies, "repository"> & {
  repository?: ApplicationRepository;
};

export function createApplication({ repository = new InMemoryApplicationRepository(), ...deps }: ApplicationCompositionDeps) {
  return {
    ...createApplicationUseCases({ repository, ...deps }),
    /** `reward`에 넣는 조회 Port */
    port: createApplicationPort(repository),
  };
}

export type ApplicationComposition = ReturnType<typeof createApplication>;

export const application: ApplicationComposition = globalSingleton("__composition_application", () =>
  createApplication({
    catalog: catalog.port,
    experiment: experiment.port,
    events: eventBus,
    clock: () => new Date(),
    nextApplicationId: () => crypto.randomUUID(),
  }),
);
