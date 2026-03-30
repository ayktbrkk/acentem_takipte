import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("debug dashboard app root", async ({ page }) => {
  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR', err.message));
  await ensureAuthenticated(page);
  await page.goto("/at/");
  await page.waitForTimeout(5000);
  const info = await page.evaluate(() => {
    const root = document.querySelector('#app');
    return {
      bodyText: document.body.innerText.slice(0, 2000),
      bodyHTML: document.body.innerHTML.slice(0, 2000),
      hasAppRoot: !!root,
      appRootHTML: root ? root.innerHTML.slice(0, 2000) : null,
      scripts: Array.from(document.scripts).map(s => s.src).filter(Boolean).slice(0, 20),
    };
  });
  console.log(JSON.stringify(info, null, 2));
});
