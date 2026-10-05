import { describe, expect, it } from "vitest";
import { lastFourOf, maskPhoneNumber, normalizePhoneNumber } from "./phone-number";

describe("A1 전화번호 정규화", () => {
  it("A1: 010-1234-5678과 01012345678은 같은 번호다", () => {
    expect(normalizePhoneNumber("010-1234-5678")).toBe("01012345678");
    expect(normalizePhoneNumber("01012345678")).toBe("01012345678");
    expect(normalizePhoneNumber(" 010 1234 5678 ")).toBe("01012345678");
  });

  it.each(["0111234567", "01012345678"])("A1: 01로 시작하는 10~11자리(%s)는 받는다", (raw) => {
    expect(normalizePhoneNumber(raw)).toBe(raw);
  });

  it.each(["011123456", "010123456789", "0212345678", "", "010-1234-567a"])(
    "A1: 9자리, 12자리, 01이 아닌 시작, 빈 값, 숫자·하이픈·공백 밖의 문자(%s)는 받지 않는다",
    (raw) => {
      expect(normalizePhoneNumber(raw)).toBeNull();
    },
  );
});

describe("A8 전화번호 가림", () => {
  it("A8: 가운데 자리를 가린다", () => {
    expect(maskPhoneNumber("01012345678")).toBe("010-****-5678");
    expect(maskPhoneNumber("0111234567")).toBe("011-***-4567");
  });

  it("A8: 검색용 뒷자리 4자리", () => {
    expect(lastFourOf("01012345678")).toBe("5678");
  });
});
