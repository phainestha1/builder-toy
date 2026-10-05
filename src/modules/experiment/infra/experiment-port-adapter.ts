// `ExperimentPort` 구현. 조회만 하고 배정 레코드를 만들지 않는다 (만드는 일은 배정 확인 유스케이스, E1).
import type { ExperimentPort } from "@/modules/experiment/ports/experiment-port";
import type { ExperimentRepository } from "../domain";

export function createExperimentPort(experiments: ExperimentRepository): ExperimentPort {
  return {
    async findAssignment(visitorId) {
      const assignment = await experiments.findAssignment(visitorId);
      return assignment ? { visitorId: assignment.visitorId, variant: assignment.variant } : null;
    },
  };
}
