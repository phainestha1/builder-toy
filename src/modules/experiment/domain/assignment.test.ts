import { describe, expect, it } from "vitest";
import { decideAssignment, recordedVariant } from "./assignment";

describe("배정 (experiment 도메인)", () => {
  it.each(["A", "B"] as const)("E1: 처음 들어온 화면이 랜딩이면 선택한 변형 %s로 배정한다", (picked) => {
    expect(decideAssignment("Landing", () => picked)).toBe(picked);
  });

  it.each(["PlanComparison", "Calculator", "Application"] as const)(
    "E1: 처음 들어온 화면이 %s(랜딩 아님)면 제외이고 변형을 고르지 않는다",
    (screen) => {
      let picked = false;
      const variant = decideAssignment(screen, () => {
        picked = true;
        return "A";
      });

      expect(variant).toBe("Excluded");
      expect(picked).toBe(false);
    },
  );

  it("E1: 랜딩에서 변형 선택에 실패하면 제외다", () => {
    expect(
      decideAssignment("Landing", () => {
        throw new Error("선택 실패");
      }),
    ).toBe("Excluded");
  });

  it("E2: 배정 레코드가 없거나 제외면 기록에 제외 표시를 단다", () => {
    expect(recordedVariant(null)).toBe("Excluded");
    expect(recordedVariant({ visitorId: "v-1", variant: "Excluded", assignedAt: "2026-10-05T00:00:00.000Z" })).toBe("Excluded");
    expect(recordedVariant({ visitorId: "v-1", variant: "B", assignedAt: "2026-10-05T00:00:00.000Z" })).toBe("B");
  });
});
