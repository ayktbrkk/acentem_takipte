import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("debug vue component props", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto('/at/');
  await page.waitForSelector('.at-tab-chip');
  const before = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('.at-tab-chip')).find((el) => el.textContent?.trim() === 'Satış');
    const cmp = button && (button).__vueParentComponent;
    return {
      buttonText: button?.textContent?.trim() || null,
      hasComponent: Boolean(cmp),
      props: cmp ? { ...cmp.props } : null,
      setup: cmp ? Object.keys(cmp.setupState || {}) : null,
    };
  });
  console.log('BEFORE', JSON.stringify(before, null, 2));
  await page.locator('.at-tab-chip').filter({ hasText: 'Satış' }).click();
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => {
    const active = document.querySelector('.at-tab-chip-active');
    const button = Array.from(document.querySelectorAll('.at-tab-chip')).find((el) => el.textContent?.trim() === 'Satış');
    const cmp = button && (button).__vueParentComponent;
    return {
      location: location.href,
      activeText: active?.textContent?.trim() || null,
      props: cmp ? { ...cmp.props } : null,
      setup: cmp ? Object.keys(cmp.setupState || {}) : null,
      setupValues: cmp ? {
        activeDashboardTab: cmp.setupState?.activeDashboardTab?.value,
        dashboardTabKey: cmp.setupState?.dashboardTabKey?.value,
      } : null,
    };
  });
  console.log('AFTER', JSON.stringify(after, null, 2));
});
