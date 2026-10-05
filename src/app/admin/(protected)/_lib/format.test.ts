import { describe, expect, it } from "vitest";
import { formatMonthDay, formatWon } from "./view-model";

describe("어드민 표시 형식 (Figma 05)", () => {
  it("만 원 단위로 떨어지는 금액은 'N만 원'으로 쓴다", () => {
    expect(formatWon(580000)).toBe("58만 원");
  });

  it("만 원 아래 자리가 있으면 함께 쓴다", () => {
    expect(formatWon(583500)).toBe("58만 3,500원");
    expect(formatWon(3500)).toBe("3,500원");
    expect(formatWon(0)).toBe("0원");
  });

  it("금액이 없으면 '-'로 쓴다", () => {
    expect(formatWon(null)).toBe("-");
  });

  it("접수일은 한국 시간 기준 MM/DD로 쓴다", () => {
    expect(formatMonthDay("2026-10-04T15:30:00.000Z")).toBe("10/05");
    expect(formatMonthDay("2026-10-05T03:00:00.000Z")).toBe("10/05");
  });
});
