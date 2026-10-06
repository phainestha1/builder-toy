import { expect, test } from "@playwright/test";

const VARIANT_A = "최대 45만 원 받아요";
const VARIANT_B = "위약금까지 보전해 드려요";

/** 테스트마다 다른 번호. 같은 번호면 7일 안 재접수로 합쳐진다 (A3) */
function uniquePhoneNumber() {
  return `010${String(Date.now()).slice(-8)}`;
}

test("랜딩 → 계산기 → 접수까지 같은 예상 지원금으로 접수가 끝나고, 재방문해도 같은 변형이 보인다", async ({ page }) => {
  // 01 랜딩: 쿠키 없는 새 컨텍스트
  await page.goto("/");
  const headline = page.getByRole("heading", { level: 1 });
  await expect(headline).toHaveText(new RegExp(`${VARIANT_A}|${VARIANT_B}`));
  const firstVariant = await headline.textContent();

  // 03 지원금 계산기
  await page.getByRole("link", { name: "내 지원금 계산하기" }).click();
  await expect(page).toHaveURL(/\/calculator/);
  await page.getByLabel("요금제").selectOption({ label: "인터넷 500M" });
  await page.getByRole("radio", { name: "네" }).check();
  await page.getByLabel("남은 개월 수").fill("12");
  await page.getByRole("button", { name: "계산하기" }).click();
  await expect(page.getByTestId("estimate-result")).toHaveText(
    "기본 지원금 400,000원 + 위약금 보전액 200,000원 = 600,000원",
  );

  // 04 상담 접수: 요약 카드
  await page.getByRole("link", { name: "이 금액으로 상담 접수하기" }).click();
  await expect(page).toHaveURL(/\/apply\?/);
  await expect(page.getByTestId("estimate-summary")).toContainText("600,000원");

  await page.getByLabel("이름").fill("홍길동");
  await page.getByLabel("전화번호").fill(uniquePhoneNumber());
  await page.getByLabel("개인정보 수집·이용에 동의합니다 (필수)").check();
  await page.getByRole("button", { name: "접수하기" }).click();

  const done = page.getByTestId("application-done");
  await expect(done).toContainText("상담 접수가 끝났어요");
  await expect(done).toContainText("600,000원");

  // 재방문: 같은 변형 (screens.md 01)
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(firstVariant ?? "");
});
