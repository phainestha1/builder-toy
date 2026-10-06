import { describe, expect, it } from "vitest";
import { readNextAuthSecret } from "./auth-env";

describe("NEXTAUTH_SECRET 환경변수 검사", () => {
  it("값이 있으면 그대로 쓴다", () => {
    expect(readNextAuthSecret({ NEXTAUTH_SECRET: "x".repeat(32) })).toBe("x".repeat(32));
  });

  it("없거나 비면 넣어야 할 변수 이름을 알려 주며 멈춘다 (개발에서도 대신 쓰는 값이 없다)", () => {
    expect(() => readNextAuthSecret({})).toThrow(/NEXTAUTH_SECRET/);
    expect(() => readNextAuthSecret({ NEXTAUTH_SECRET: "  " })).toThrow(/NEXTAUTH_SECRET/);
  });

  it("32자보다 짧으면 멈춘다", () => {
    expect(() => readNextAuthSecret({ NEXTAUTH_SECRET: "short" })).toThrow(/NEXTAUTH_SECRET.*32/);
  });
});
