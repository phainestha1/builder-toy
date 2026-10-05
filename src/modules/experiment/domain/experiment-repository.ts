import type { VisitorId } from "@/modules/shared/events";
import type { Assignment } from "./assignment";
import type { Conversion, EstimateRecord, Exposure } from "./records";

/** 배정과 기록 저장소. 구현은 `infra`에 둔다 */
export interface ExperimentRepository {
  findAssignment(visitorId: VisitorId): Promise<Assignment | null>;
  saveAssignment(assignment: Assignment): Promise<void>;
  findExposure(visitorId: VisitorId): Promise<Exposure | null>;
  saveExposure(exposure: Exposure): Promise<void>;
  addEstimateRecord(record: EstimateRecord): Promise<void>;
  listEstimateRecords(visitorId: VisitorId): Promise<EstimateRecord[]>;
  findConversion(visitorId: VisitorId): Promise<Conversion | null>;
  saveConversion(conversion: Conversion): Promise<void>;
}
