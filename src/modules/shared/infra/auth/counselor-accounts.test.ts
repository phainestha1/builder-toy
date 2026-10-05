import { describe, expect, it } from "vitest";
import { verifyCounselorCredentials } from "./counselor-accounts";

describe("상담원 로그인 확인", () => {
  it("맞는 아이디와 비밀번호면 상담원 정보를 돌려준다", async () => {
    expect(await verifyCounselorCredentials("counselor1", "counselor1-pass")).toEqual({
      counselorId: "counselor-1",
      name: "김상담",
    });
  });

  it("비밀번호가 틀리면 null이다", async () => {
    expect(await verifyCounselorCredentials("counselor1", "wrong-pass")).toBeNull();
  });

  it("없는 아이디면 null이다", async () => {
    expect(await verifyCounselorCredentials("nobody", "counselor1-pass")).toBeNull();
  });

  it("아이디나 비밀번호가 비면 null이다", async () => {
    expect(await verifyCounselorCredentials("", "counselor1-pass")).toBeNull();
    expect(await verifyCounselorCredentials("counselor1", "")).toBeNull();
  });
});
