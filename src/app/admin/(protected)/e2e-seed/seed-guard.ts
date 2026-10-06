// 테스트 전용 시드 라우트는 production이 아니고, E2E_SEED_ENABLED=1이고, 로그인한 상담원일 때만 동작한다.
export function isE2eSeedAllowed(ctx: { env: Record<string, string | undefined>; loggedIn: boolean }): boolean {
  return ctx.env.NODE_ENV !== "production" && ctx.env.E2E_SEED_ENABLED === "1" && ctx.loggedIn;
}
