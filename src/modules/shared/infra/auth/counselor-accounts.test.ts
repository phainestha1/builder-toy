import { describe, expect, it } from "vitest";
import { hashPassword, parseCounselorAccounts, verifyCounselorCredentials } from "./counselor-accounts";

// 테스트 전용 값. 실제 계정은 환경변수 COUNSELOR_ACCOUNTS에만 있다.
const FIXTURE_PASSWORD = "fixture-only-password";

async function fixtureAccounts() {
  return parseCounselorAccounts(
    JSON.stringify([
      { username: "tester", counselorId: "counselor-t", name: "테스트상담", passwordHash: await hashPassword(FIXTURE_PASSWORD) },
    ]),
  );
}

describe("상담원 로그인 확인", () => {
  it("맞는 아이디와 비밀번호면 상담원 정보를 돌려준다", async () => {
    expect(await verifyCounselorCredentials(await fixtureAccounts(), "tester", FIXTURE_PASSWORD)).toEqual({
      counselorId: "counselor-t",
      name: "테스트상담",
    });
  });

  it("비밀번호가 틀리면 null이다", async () => {
    expect(await verifyCounselorCredentials(await fixtureAccounts(), "tester", "wrong")).toBeNull();
  });

  it("없는 아이디면 null이다", async () => {
    expect(await verifyCounselorCredentials(await fixtureAccounts(), "nobody", FIXTURE_PASSWORD)).toBeNull();
  });

  it("아이디나 비밀번호가 비면 null이다", async () => {
    const accounts = await fixtureAccounts();
    expect(await verifyCounselorCredentials(accounts, "", FIXTURE_PASSWORD)).toBeNull();
    expect(await verifyCounselorCredentials(accounts, "tester", "")).toBeNull();
  });

  it("해시는 salt:hash 형식이고 같은 비밀번호도 매번 다른 salt를 쓴다", async () => {
    const first = await hashPassword(FIXTURE_PASSWORD);
    expect(first).toMatch(/^[0-9a-f]{32}:[0-9a-f]{64}$/);
    expect(await hashPassword(FIXTURE_PASSWORD)).not.toBe(first);
  });
});

describe("COUNSELOR_ACCOUNTS 환경변수 검사", () => {
  it("비어 있으면 넣어야 할 변수 이름을 알려 주며 멈춘다", () => {
    expect(() => parseCounselorAccounts(undefined)).toThrow(/COUNSELOR_ACCOUNTS/);
    expect(() => parseCounselorAccounts("")).toThrow(/COUNSELOR_ACCOUNTS/);
  });

  it("JSON이 아니면 멈춘다", () => {
    expect(() => parseCounselorAccounts("counselor1:abc")).toThrow(/COUNSELOR_ACCOUNTS.*JSON/);
  });

  it("빈 배열이면 멈춘다", () => {
    expect(() => parseCounselorAccounts("[]")).toThrow(/COUNSELOR_ACCOUNTS/);
  });

  it("필드가 빠지거나 해시 형식이 틀리면 멈춘다", () => {
    const missing = JSON.stringify([{ username: "a", counselorId: "c", name: "n" }]);
    const badHash = JSON.stringify([{ username: "a", counselorId: "c", name: "n", passwordHash: "plain-password" }]);
    expect(() => parseCounselorAccounts(missing)).toThrow(/passwordHash/);
    expect(() => parseCounselorAccounts(badHash)).toThrow(/passwordHash/);
  });

  it("아이디가 겹치면 멈춘다", () => {
    const hash = `${"a".repeat(32)}:${"b".repeat(64)}`;
    const duplicated = JSON.stringify([
      { username: "a", counselorId: "c1", name: "n", passwordHash: hash },
      { username: "a", counselorId: "c2", name: "n", passwordHash: hash },
    ]);
    expect(() => parseCounselorAccounts(duplicated)).toThrow(/username/);
  });
});
