/** 정규화한 전화번호. 숫자만, 01로 시작하는 10~11자리 (A1) [가정] */
export type PhoneNumber = string;

const NORMALIZED = /^01\d{8,9}$/;

/** 하이픈과 공백을 빼고 숫자만 남긴다. 형식이 틀리면 `null` (A1) */
export function normalizePhoneNumber(raw: string): PhoneNumber | null {
  if (!/^[\d\s-]*$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  return NORMALIZED.test(digits) ? digits : null;
}

/** 전화번호 가림. 가운데 자리를 가린다 (A8). 예: 010-****-5678 */
export function maskPhoneNumber(phoneNumber: PhoneNumber): string {
  const head = phoneNumber.slice(0, 3);
  const middle = phoneNumber.slice(3, -4);
  return `${head}-${"*".repeat(middle.length)}-${lastFourOf(phoneNumber)}`;
}

/** 검색용 뒷자리 4자리 (A8) [가정] */
export function lastFourOf(phoneNumber: PhoneNumber): string {
  return phoneNumber.slice(-4);
}
