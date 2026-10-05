import type { ApplicationId } from "@/modules/shared/events";
import type { ApplicationRepository, PhoneNumberReveal } from "../application/application-repository";
import type { Application } from "../domain/application";
import type { PhoneNumber } from "../domain/phone-number";

/** 메모리 접수 저장소. 저장·조회 때 복사해서 밖의 변경이 저장소 값에 닿지 않게 한다 */
export class InMemoryApplicationRepository implements ApplicationRepository {
  private readonly applications = new Map<ApplicationId, Application>();
  private readonly reveals: PhoneNumberReveal[] = [];

  async save(application: Application): Promise<void> {
    this.applications.set(application.id, structuredClone(application));
  }

  async findById(id: ApplicationId): Promise<Application | null> {
    const found = this.applications.get(id);
    return found ? structuredClone(found) : null;
  }

  async findLatestByPhoneNumber(phoneNumber: PhoneNumber): Promise<Application | null> {
    let latest: Application | null = null;
    for (const application of this.applications.values()) {
      if (application.phoneNumber !== phoneNumber) continue;
      if (latest === null || application.submittedAt >= latest.submittedAt) latest = application;
    }
    return latest ? structuredClone(latest) : null;
  }

  async list(): Promise<Application[]> {
    return [...this.applications.values()].map((application) => structuredClone(application));
  }

  async saveReveal(reveal: PhoneNumberReveal): Promise<void> {
    this.reveals.push({ ...reveal });
  }

  async listReveals(applicationId: ApplicationId): Promise<PhoneNumberReveal[]> {
    return this.reveals.filter((reveal) => reveal.applicationId === applicationId).map((reveal) => ({ ...reveal }));
  }
}
