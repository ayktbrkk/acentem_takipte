import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("dashboard tab timeline debug", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto('/at/');
  await page.waitForSelector('.at-tab-chip');
  await page.locator('.at-tab-chip').filter({ hasText: 'Satış' }).click();
  for (const delay of [0, 200, 500, 1000, 1500, 2500, 4000]) {
    await page.waitForTimeout(delay === 0 ? 0 : delay - (globalThis.__prev || 0));
    globalThis.__prev = delay;
    const state = await page.evaluate(() => ({
      url: location.href,
      active: document.querySelector('.at-tab-chip-active')?.textContent?.trim() || null,
    }));
    console.log('T', delay, JSON.stringify(state));
  }
});
