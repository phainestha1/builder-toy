// 어드민 인증: 상담원 계정과 `counselorId`의 주인 (ADR 0001).
// v1은 시드 계정을 코드에 둔다 [가정]. 비밀번호는 scrypt 해시(`salt:hash`)로만 둔다.
import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export interface Counselor {
  counselorId: string;
  name: string;
}

interface CounselorAccount extends Counselor {
  username: string;
  passwordHash: string;
}

// 시드 계정 [가정]: counselor1 / counselor1-pass, counselor2 / counselor2-pass
const SEED_ACCOUNTS: readonly CounselorAccount[] = [
  {
    username: "counselor1",
    counselorId: "counselor-1",
    name: "김상담",
    passwordHash:
      "b0374e1b1b99ed42ec50c1b120db9ae3:fc891ed79c353d8f284b3c13ee466a2aacb22e9c6d5a9a42de1e966e29af0c9a",
  },
  {
    username: "counselor2",
    counselorId: "counselor-2",
    name: "이상담",
    passwordHash:
      "778a5293445361f99264822119dd9351:67ecc6d5e3743b4b30524febcd574f42c13cd549d42d86c73bb5701d847a7791",
  },
];

async function matchesHash(password: string, passwordHash: string): Promise<boolean> {
  const [salt, hashHex] = passwordHash.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

/** 아이디와 비밀번호가 맞으면 상담원을, 아니면 `null`을 돌려준다 */
export async function verifyCounselorCredentials(username: string, password: string): Promise<Counselor | null> {
  if (!username || !password) return null;
  const account = SEED_ACCOUNTS.find((a) => a.username === username);
  if (!account) return null;
  if (!(await matchesHash(password, account.passwordHash))) return null;
  return { counselorId: account.counselorId, name: account.name };
}
