import { describe, expect, it } from "vitest";
import { createApplication, validateContactInfo } from "../domain/application";
import { createApplicationPort } from "./application-port-adapter";
import { InMemoryApplicationRepository } from "./in-memory-application-repository";

describe("ApplicationPort 구현", () => {
  it("R3 근거: 스냅샷이 없는 접수는 NoSnapshot, 없는 접수는 ApplicationNotFound", async () => {
    const repository = new InMemoryApplicationRepository();
    const contact = validateContactInfo({
      name: "홍길동",
      phoneNumber: "01011112222",
      privacyConsent: true,
      installationRegion: null,
      preferredContactTime: null,
    });
    if (!contact.ok) throw new Error(contact.reason);
    await repository.save(
      createApplication({
        id: "app-1",
        visitorId: "v-1",
        assignedVariant: "A",
        contact: contact.contact,
        estimateSnapshot: null,
        now: new Date("2026-10-05T00:00:00.000Z"),
      }),
    );
    const port = createApplicationPort(repository);
    expect(await port.findEstimateSnapshot("app-1")).toEqual({ kind: "NoSnapshot", applicationId: "app-1" });
    expect(await port.findEstimateSnapshot("app-9")).toEqual({ kind: "ApplicationNotFound", applicationId: "app-9" });
  });
});
