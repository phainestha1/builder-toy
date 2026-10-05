import type { VisitorId } from "@/modules/shared/events";
import type {
  Assignment,
  Conversion,
  EstimateRecord,
  ExperimentRepository,
  Exposure,
} from "../domain";

/** 메모리 실험 저장소. SQLite 구현은 T-G3에서 만든다 */
export class MemoryExperimentRepository implements ExperimentRepository {
  private readonly assignments = new Map<VisitorId, Assignment>();
  private readonly exposures = new Map<VisitorId, Exposure>();
  private readonly estimates: EstimateRecord[] = [];
  private readonly conversions = new Map<VisitorId, Conversion>();

  async findAssignment(visitorId: VisitorId): Promise<Assignment | null> {
    return this.assignments.get(visitorId) ?? null;
  }

  async saveAssignment(assignment: Assignment): Promise<void> {
    this.assignments.set(assignment.visitorId, assignment);
  }

  async findExposure(visitorId: VisitorId): Promise<Exposure | null> {
    return this.exposures.get(visitorId) ?? null;
  }

  async saveExposure(exposure: Exposure): Promise<void> {
    this.exposures.set(exposure.visitorId, exposure);
  }

  async addEstimateRecord(record: EstimateRecord): Promise<void> {
    this.estimates.push(record);
  }

  async listEstimateRecords(visitorId: VisitorId): Promise<EstimateRecord[]> {
    return this.estimates.filter((record) => record.visitorId === visitorId);
  }

  async findConversion(visitorId: VisitorId): Promise<Conversion | null> {
    return this.conversions.get(visitorId) ?? null;
  }

  async saveConversion(conversion: Conversion): Promise<void> {
    this.conversions.set(conversion.visitorId, conversion);
  }
}
