import { describe, expect, it } from "vitest";
import { isE2eSeedAllowed } from "./seed-guard";

const open = { NODE_ENV: "development", E2E_SEED_ENABLED: "1" };

describe("테스트 전용 시드 라우트 허용 판단", () => {
  it("개발에서 E2E_SEED_ENABLED=1이고 로그인했으면 허용한다", () => {
    expect(isE2eSeedAllowed({ env: open, loggedIn: true })).toBe(true);
  });

  it("test 환경에서도 같은 조건이면 허용한다", () => {
    expect(isE2eSeedAllowed({ env: { ...open, NODE_ENV: "test" }, loggedIn: true })).toBe(true);
  });

  it("production에서는 로그인했고 E2E_SEED_ENABLED=1이어도 막는다", () => {
    expect(isE2eSeedAllowed({ env: { ...open, NODE_ENV: "production" }, loggedIn: true })).toBe(false);
  });

  it("로그인하지 않았으면 막는다", () => {
    expect(isE2eSeedAllowed({ env: open, loggedIn: false })).toBe(false);
  });

  it("E2E_SEED_ENABLED가 없거나 1이 아니면 막는다", () => {
    expect(isE2eSeedAllowed({ env: { NODE_ENV: "development" }, loggedIn: true })).toBe(false);
    expect(isE2eSeedAllowed({ env: { ...open, E2E_SEED_ENABLED: "true" }, loggedIn: true })).toBe(false);
    expect(isE2eSeedAllowed({ env: { ...open, E2E_SEED_ENABLED: "0" }, loggedIn: true })).toBe(false);
  });
});
