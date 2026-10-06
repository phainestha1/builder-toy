import { defineConfig, devices } from "@playwright/test";

// .env.local의 E2E 변수(E2E_PORT, E2E 계정)를 테스트 프로세스에서도 읽는다. 이미 있는 값은 덮지 않는다
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없으면 셸 환경변수만 쓴다
}

// Builder A·B가 동시에 돌릴 때는 E2E_PORT를 서로 다르게 준다
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // 테스트 전용 시드 라우트(/admin/e2e-seed)는 E2E가 띄운 서버에서만 연다
    env: { E2E_SEED_ENABLED: "1" },
  },
});
