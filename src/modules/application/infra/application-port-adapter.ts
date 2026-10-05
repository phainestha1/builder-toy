import type { ApplicationPort } from "@/modules/application/ports/application-port";
import type { ApplicationRepository } from "../application/application-repository";
import { findEstimateSnapshot } from "../application/application-use-cases";

/** `ApplicationPort` 구현 (`reward`의 지원금 산정 근거 조회) */
export function createApplicationPort(repository: ApplicationRepository): ApplicationPort {
  return {
    findEstimateSnapshot: (applicationId) => findEstimateSnapshot(repository, applicationId),
  };
}
