import { describe, expect, it } from "vitest";
import { createApplication, validateContactInfo } from "../domain/application";
import { InMemoryApplicationRepository } from "./in-memory-application-repository";

function app(id: string, phoneNumber: string, at: string) {
  const contact = validateContactInfo({
    name: "홍길동",
    phoneNumber,
    privacyConsent: true,
    installationRegion: null,
    preferredContactTime: null,
  });
  if (!contact.ok) throw new Error(contact.reason);
  return createApplication({
    id,
    visitorId: "v-1",
    assignedVariant: "A",
    contact: contact.contact,
    estimateSnapshot: null,
    now: new Date(at),
  });
}

describe("메모리 접수 저장소", () => {
  it("같은 번호의 가장 최근 접수를 찾는다", async () => {
    const repository = new InMemoryApplicationRepository();
    await repository.save(app("app-1", "01011112222", "2026-10-01T00:00:00.000Z"));
    await repository.save(app("app-2", "01011112222", "2026-10-09T00:00:00.000Z"));
    await repository.save(app("app-3", "01033334444", "2026-10-10T00:00:00.000Z"));
    expect((await repository.findLatestByPhoneNumber("01011112222"))?.id).toBe("app-2");
    expect(await repository.findLatestByPhoneNumber("01099999999")).toBeNull();
  });

  it("저장한 접수를 밖에서 바꿔도 저장소 값은 바뀌지 않는다", async () => {
    const repository = new InMemoryApplicationRepository();
    const original = app("app-1", "01011112222", "2026-10-01T00:00:00.000Z");
    await repository.save(original);
    original.customerName = "바뀜";
    const found = await repository.findById("app-1");
    expect(found?.customerName).toBe("홍길동");
    found!.statusHistory.push({ from: "Submitted", to: "Cancelled", counselorId: "c", changedAt: "x" });
    expect((await repository.findById("app-1"))?.statusHistory).toEqual([]);
  });

  it("A8: 열람 기록을 접수별로 남긴다", async () => {
    const repository = new InMemoryApplicationRepository();
    await repository.saveReveal({ applicationId: "app-1", counselorId: "c-1", revealedAt: "2026-10-05T00:00:00.000Z" });
    await repository.saveReveal({ applicationId: "app-2", counselorId: "c-1", revealedAt: "2026-10-05T00:00:00.000Z" });
    expect(await repository.listReveals("app-1")).toHaveLength(1);
  });
});
