import type { RateTableVersion } from "@/modules/shared/events";
import type { CatalogRepository } from "../application/catalog-repository";
import type { Plan, RewardRateTable } from "../domain/rate-table";

export interface CatalogSeed {
  plans: readonly Plan[];
  rateTables: readonly RewardRateTable[];
  currentVersion: RateTableVersion;
}

/** 메모리 카탈로그 저장소. 기준표 버전은 추가만 할 수 있다 (C7) */
export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly plans: readonly Plan[];
  private readonly rateTables = new Map<RateTableVersion, RewardRateTable>();
  private currentVersion: RateTableVersion;

  constructor(seed: CatalogSeed) {
    this.plans = [...seed.plans];
    for (const table of seed.rateTables) this.addRateTable(table);
    this.currentVersion = seed.currentVersion;
    this.setCurrentVersion(seed.currentVersion);
  }

  addRateTable(table: RewardRateTable): void {
    if (this.rateTables.has(table.version)) {
      throw new Error(`기준표 버전 ${table.version}은 이미 있어 고칠 수 없습니다`);
    }
    this.rateTables.set(table.version, table);
  }

  setCurrentVersion(version: RateTableVersion): void {
    if (!this.rateTables.has(version)) throw new Error(`기준표 버전 ${version}이 없습니다`);
    this.currentVersion = version;
  }

  async listPlans(): Promise<readonly Plan[]> {
    return this.plans;
  }

  async findCurrentRateTable(): Promise<RewardRateTable> {
    return this.rateTables.get(this.currentVersion)!;
  }

  async findRateTable(version: RateTableVersion): Promise<RewardRateTable | null> {
    return this.rateTables.get(version) ?? null;
  }
}
