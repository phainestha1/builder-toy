import type { CatalogRepository } from "@/modules/catalog/application/catalog-repository";
import { estimateReward, listPlanComparison } from "@/modules/catalog/application/catalog-use-cases";
import { createCatalogPort } from "@/modules/catalog/infra/catalog-port-adapter";
import { createSeedCatalogRepository } from "@/modules/catalog/infra/seed";
import type { EstimateInput } from "@/modules/catalog/ports/catalog-port";
import { globalSingleton } from "./global";

export interface CatalogCompositionDeps {
  repository: CatalogRepository;
}

export function createCatalog({ repository }: CatalogCompositionDeps) {
  return {
    /** `application`, `reward`에 넣는 조회 Port */
    port: createCatalogPort(repository),
    estimateReward: (input: EstimateInput) => estimateReward(repository, input),
    listPlanComparison: () => listPlanComparison(repository),
  };
}

export type CatalogComposition = ReturnType<typeof createCatalog>;

export const catalog: CatalogComposition = globalSingleton("__composition_catalog", () =>
  createCatalog({ repository: createSeedCatalogRepository() }),
);
