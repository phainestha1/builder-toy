import { describe, expect, it } from "vitest";
import { createRateTable } from "../domain/rate-table";
import { InMemoryCatalogRepository } from "./in-memory-catalog-repository";

const table = (version: string) =>
  createRateTable({ version, baseRewards: {}, averageEarlyTerminationFee: 0, feeCoverageCap: 0 });

describe("메모리 카탈로그 저장소", () => {
  it("C7: 이미 있는 기준표 버전은 다시 넣어 덮어쓸 수 없다", () => {
    const repository = new InMemoryCatalogRepository({ plans: [], rateTables: [table("v1")], currentVersion: "v1" });
    expect(() => repository.addRateTable(table("v1"))).toThrow();
  });

  it("현재 버전은 있는 버전으로만 바꿀 수 있다", async () => {
    const repository = new InMemoryCatalogRepository({ plans: [], rateTables: [table("v1")], currentVersion: "v1" });
    expect(() => repository.setCurrentVersion("v2")).toThrow();
    repository.addRateTable(table("v2"));
    repository.setCurrentVersion("v2");
    expect((await repository.findCurrentRateTable()).version).toBe("v2");
  });
});
