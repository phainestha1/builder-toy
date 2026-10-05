import { describe, expect, it } from "vitest";
import { isE2eSeedAllowed } from "./seed-guard";

describe("테스트 전용 시드 라우트 허용 판단", () => {
  it("production에서는 로그인했어도 막는다", () => {
    expect(isE2eSeedAllowed({ nodeEnv: "production", loggedIn: true })).toBe(false);
  });

  it("개발에서도 로그인하지 않았으면 막는다", () => {
    expect(isE2eSeedAllowed({ nodeEnv: "development", loggedIn: false })).toBe(false);
  });

  it("개발에서 로그인했으면 허용한다", () => {
    expect(isE2eSeedAllowed({ nodeEnv: "development", loggedIn: true })).toBe(true);
  });

  it("test 환경에서 로그인했으면 허용한다", () => {
    expect(isE2eSeedAllowed({ nodeEnv: "test", loggedIn: true })).toBe(true);
  });
});
