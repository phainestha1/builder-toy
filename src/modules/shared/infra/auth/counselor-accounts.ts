// 어드민 인증: 상담원 계정과 `counselorId`의 주인 (ADR 0001).
// 계정은 환경변수 COUNSELOR_ACCOUNTS(JSON 배열)에서 읽는다. 비밀번호는 scrypt 해시(`salt:hash`)로만 둔다.
// 해시는 `npm run hash-password -- <비밀번호>`로 만든다.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

const SALT_BYTES = 16;
const KEY_LENGTH = 32;
const HASH_PATTERN = /^[0-9a-f]{32}:[0-9a-f]{64}$/;

export interface Counselor {
  counselorId: string;
  name: string;
}

export interface CounselorAccount extends Counselor {
  username: string;
  passwordHash: string;
}

/** 비밀번호를 `salt:hash`(hex)로 만든다. scripts/hash-password.mjs와 같은 형식이다 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${hash.toString("hex")}`;
}

const FORMAT_HINT =
  'COUNSELOR_ACCOUNTS=[{"username":"...","counselorId":"...","name":"...","passwordHash":"<npm run hash-password 결과>"}]';

function invalid(reason: string): Error {
  return new Error(`COUNSELOR_ACCOUNTS 환경변수가 올바르지 않습니다: ${reason}. .env.local에 ${FORMAT_HINT} 형식으로 넣어 주세요.`);
}

/** COUNSELOR_ACCOUNTS 값을 검사해 계정 목록으로 바꾼다. 틀리면 무엇을 고칠지 알려 주며 멈춘다 */
export function parseCounselorAccounts(raw: string | undefined): CounselorAccount[] {
  if (!raw?.trim()) throw invalid("값이 없습니다");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw invalid("JSON 배열이 아닙니다");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw invalid("계정이 1개 이상인 JSON 배열이어야 합니다");

  const accounts = parsed.map((item, index) => {
    const entry = (item ?? {}) as Record<string, unknown>;
    for (const field of ["username", "counselorId", "name", "passwordHash"] as const) {
      if (typeof entry[field] !== "string" || entry[field] === "") {
        throw invalid(`${index}번째 계정에 ${field}가 없습니다`);
      }
    }
    if (!HASH_PATTERN.test(entry.passwordHash as string)) {
      throw invalid(`${index}번째 계정의 passwordHash가 salt:hash 형식이 아닙니다`);
    }
    return {
      username: entry.username as string,
      counselorId: entry.counselorId as string,
      name: entry.name as string,
      passwordHash: entry.passwordHash as string,
    };
  });

  const usernames = new Set(accounts.map((a) => a.username));
  if (usernames.size !== accounts.length) throw invalid("username이 겹칩니다");
  return accounts;
}

async function matchesHash(password: string, passwordHash: string): Promise<boolean> {
  const [salt, hashHex] = passwordHash.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

/** 아이디와 비밀번호가 맞으면 상담원을, 아니면 `null`을 돌려준다 */
export async function verifyCounselorCredentials(
  accounts: readonly CounselorAccount[],
  username: string,
  password: string,
): Promise<Counselor | null> {
  if (!username || !password) return null;
  const account = accounts.find((a) => a.username === username);
  if (!account) return null;
  if (!(await matchesHash(password, account.passwordHash))) return null;
  return { counselorId: account.counselorId, name: account.name };
}
