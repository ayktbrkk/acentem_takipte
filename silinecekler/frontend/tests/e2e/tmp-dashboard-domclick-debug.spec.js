import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("dashboard dom click debug", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto('/at/');
  await page.waitForSelector('.at-tab-chip');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.at-tab-chip'));
    const sales = buttons.find((button) => button.textContent?.trim() === 'Satış');
    sales?.click();
  });
  await page.waitForTimeout(1000);
  console.log('URL', page.url());
  console.log('ACTIVE', await page.locator('.at-tab-chip-active').allTextContents());
});
