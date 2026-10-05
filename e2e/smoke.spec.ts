import { expect, test } from "@playwright/test";

test("랜딩(/)이 열리고 제목이 아정당 미니다", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("아정당 미니");
});
