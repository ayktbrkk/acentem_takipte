import { test, expect } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth";

test("dashboard keeps selected tab after delayed rerender", async ({ page }) => {
  await ensureAuthenticated(page);

  await page.locator(".at-tab-chip").nth(1).click();
  await page.waitForTimeout(1200);

  await expect(page).toHaveURL(/\/at\/\?tab=sales$/);
  await expect(page.locator(".at-tab-chip-active").first()).toHaveText("Satış");
});
