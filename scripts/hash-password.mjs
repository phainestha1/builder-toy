// 상담원 비밀번호를 COUNSELOR_ACCOUNTS의 passwordHash(`salt:hash`)로 바꾼다.
// src/modules/shared/infra/auth/counselor-accounts.ts의 hashPassword와 같은 형식(scrypt, salt 16바이트, 키 32바이트)이다.
// 사용: npm run hash-password -- '<비밀번호>'   (인자가 없으면 표준 입력에서 한 줄 읽는다)
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";

async function readPassword() {
  const fromArg = process.argv[2];
  if (fromArg) return fromArg;
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const line = await rl.question("비밀번호: ");
  rl.close();
  return line;
}

const password = (await readPassword()).trim();
if (!password) {
  console.error("비밀번호가 비어 있습니다.");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
console.log(`${salt}:${scryptSync(password, salt, 32).toString("hex")}`);
