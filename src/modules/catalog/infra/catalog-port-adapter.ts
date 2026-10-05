import type { CatalogPort } from "@/modules/catalog/ports/catalog-port";
import type { CatalogRepository } from "../application/catalog-repository";
import { estimateReward, estimateRewardWithVersion } from "../application/catalog-use-cases";

/** `CatalogPort` 구현. 계산기와 같은 유스케이스(같은 공식, C7)를 그대로 쓴다 */
export function createCatalogPort(repository: CatalogRepository): CatalogPort {
  return {
    calculateRewardWithCurrentVersion: (input) => estimateReward(repository, input),
    calculateRewardWithVersion: (input, version) => estimateRewardWithVersion(repository, input, version),
  };
}
