// 어드민 인증이 쓰는 환경변수 검사. 값은 .env.local(커밋 안 함)에 둔다. 준비 방법은 README "로컬 환경변수".

const MIN_SECRET_LENGTH = 32;

/** next-auth 서명용 시크릿. 없으면 개발에서도 대신 쓰는 값 없이 멈춘다 */
export function readNextAuthSecret(env: Record<string, string | undefined>): string {
  const secret = env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET 환경변수가 필요합니다. .env.local에 NEXTAUTH_SECRET=<32자 이상 임의 문자열>을 넣어 주세요 (예: openssl rand -base64 32).",
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`NEXTAUTH_SECRET은 ${MIN_SECRET_LENGTH}자 이상이어야 합니다.`);
  }
  return secret;
}
