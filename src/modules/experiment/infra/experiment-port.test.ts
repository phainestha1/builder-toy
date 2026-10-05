import { describe, expect, it } from "vitest";
import { createExperimentPort } from "./experiment-port-adapter";
import { MemoryExperimentRepository } from "./memory-experiment-repository";

describe("ExperimentPort 구현", () => {
  it("E1: 배정 레코드가 있으면 visitorId와 변형을, 없으면 null을 돌려주고 레코드를 만들지 않는다", async () => {
    const repo = new MemoryExperimentRepository();
    await repo.saveAssignment({ visitorId: "v-1", variant: "A", assignedAt: "2026-10-05T03:00:00.000Z" });
    const port = createExperimentPort(repo);

    expect(await port.findAssignment("v-1")).toEqual({ visitorId: "v-1", variant: "A" });
    expect(await port.findAssignment("v-2")).toBeNull();
    expect(await repo.findAssignment("v-2")).toBeNull();
  });
});

describe("메모리 실험 저장소", () => {
  it("E4: 계산 기록은 방문자별로 쌓이고, 노출·전환은 방문자당 하나다", async () => {
    const repo = new MemoryExperimentRepository();
    const recordedAt = "2026-10-05T03:00:00.000Z";
    await repo.addEstimateRecord({ visitorId: "v-1", variant: "A", rateTableVersion: "v1", recordedAt });
    await repo.addEstimateRecord({ visitorId: "v-1", variant: "A", rateTableVersion: "v1", recordedAt });
    await repo.addEstimateRecord({ visitorId: "v-2", variant: "B", rateTableVersion: "v1", recordedAt });
    await repo.saveExposure({ visitorId: "v-1", variant: "A", recordedAt });
    await repo.saveConversion({ visitorId: "v-1", applicationId: "app-1", variant: "A", recordedAt });

    expect(await repo.listEstimateRecords("v-1")).toHaveLength(2);
    expect(await repo.findExposure("v-1")).toEqual({ visitorId: "v-1", variant: "A", recordedAt });
    expect(await repo.findConversion("v-1")).toMatchObject({ applicationId: "app-1" });
    expect(await repo.findConversion("v-2")).toBeNull();
  });
});
