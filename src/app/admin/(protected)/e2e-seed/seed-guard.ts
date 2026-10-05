// 테스트 전용 시드 라우트는 production이 아니고, 로그인한 상담원일 때만 동작한다.
export function isE2eSeedAllowed(ctx: { nodeEnv: string | undefined; loggedIn: boolean }): boolean {
  return ctx.nodeEnv !== "production" && ctx.loggedIn;
}
