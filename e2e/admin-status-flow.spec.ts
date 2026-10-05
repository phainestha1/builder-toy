// 화면 05 상태 전이 E2E (T-G4).
// 접수 데이터는 고객 화면을 거치지 않고 테스트 전용 시드 라우트(/admin/e2e-seed)로 만든다.
import { expect, type Page, test } from "@playwright/test";

async function login(page: Page, username = "counselor1", password = "counselor1-pass") {
  await page.goto("/admin/login");
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
}

test("로그인하지 않으면 어드민에 들어갈 수 없고 로그인 화면으로 간다", async ({ page }) => {
  await page.goto("/admin/applications");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "상담원 로그인" })).toBeVisible();
});

test("로그인하지 않으면 테스트 전용 시드 라우트도 막힌다", async ({ request }) => {
  const response = await request.post("/admin/e2e-seed");
  expect(response.status()).toBe(404);
});

test("비밀번호가 틀리면 로그인되지 않는다", async ({ page }) => {
  await login(page, "counselor1", "wrong-pass");
  await expect(page.getByRole("alert").filter({ hasText: "아이디 또는 비밀번호가 맞지 않아요" })).toBeVisible();
  await page.goto("/admin/applications");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("상담원이 접수를 상담 시작 → 개통 완료 → 지급 완료까지 처리한다", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/admin\/applications/);

  const seeded = await page.request.post("/admin/e2e-seed");
  expect(seeded.ok()).toBeTruthy();
  const { applicationId, phoneLastFour } = (await seeded.json()) as { applicationId: string; phoneLastFour: string };

  await page.goto(`/admin/applications?id=${applicationId}`);
  const panel = page.getByRole("complementary", { name: "접수 상세" });

  // 번호는 가려서 보인다
  await expect(panel.getByTestId("phone-number")).toHaveText(`010-****-${phoneLastFour}`);
  // [보기]를 누르면 전체 번호가 보인다 (열람 기록은 서버가 남긴다)
  await panel.getByRole("button", { name: "보기" }).click();
  await expect(panel.getByTestId("phone-number")).toHaveText(new RegExp(`^010\\d{4}${phoneLastFour}$`));

  const status = panel.getByTestId("status-badge");
  const payoutStatus = panel.getByTestId("payout-status");
  const payButton = panel.getByRole("button", { name: "지급 완료 처리" });

  // 개통 전에는 지급 버튼이 비활성
  await expect(status).toHaveText("접수");
  await expect(payoutStatus).toHaveText("개통 전 · 산정 대기");
  await expect(payButton).toBeDisabled();

  // 접수 → 상담중
  await panel.getByRole("button", { name: "상담 시작" }).click();
  await expect(status).toHaveText("상담중");
  await expect(panel.getByRole("button", { name: "상담 시작" })).toBeDisabled();

  // 상담중 → 개통완료, 지원금 산정됨
  await panel.getByRole("button", { name: "개통 완료 처리" }).click();
  await expect(status).toHaveText("개통완료");
  await expect(payoutStatus).toHaveText("산정됨");

  // 지급 완료 처리 → 지급완료, 상태 버튼은 모두 비활성 (끝 상태)
  await payButton.click();
  await expect(payoutStatus).toHaveText("지급완료");
  await expect(payButton).toBeDisabled();
  for (const name of ["상담 시작", "개통 완료 처리", "취소"]) {
    await expect(panel.getByRole("button", { name, exact: true })).toBeDisabled();
  }
});
