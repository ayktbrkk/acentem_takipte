import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("search dashboard dom markers", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto("/at/");
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const html = document.body.innerHTML;
    const root = document.querySelector('#app');
    const rootHtml = root ? root.innerHTML : '';
    return {
      bodyHasTabChip: html.includes('at-tab-chip'),
      rootHasTabChip: rootHtml.includes('at-tab-chip'),
      bodyHasDashboardHeader: html.includes('DashboardHeader'),
      rootHasDashboardHeader: rootHtml.includes('DashboardHeader'),
      bodyHasOperations: html.includes('Operasyon'),
      rootHasOperations: rootHtml.includes('Operasyon'),
      rootSnippet: rootHtml.slice(rootHtml.indexOf('Sigorta Kontrol Merkezi') - 500, rootHtml.indexOf('Sigorta Kontrol Merkezi') + 2000),
    };
  });
  console.log(JSON.stringify(info, null, 2));
});
