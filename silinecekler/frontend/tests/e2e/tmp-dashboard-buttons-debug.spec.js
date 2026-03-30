import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("debug dashboard buttons and headings", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto("/at/");
  const buttons = await page.locator('button').allTextContents();
  const headings = await page.locator('h1,h2,h3,h4').allTextContents();
  console.log('BUTTONS', JSON.stringify(buttons.slice(0, 40)));
  console.log('HEADINGS', JSON.stringify(headings.slice(0, 40)));
  console.log('URL', page.url());
});
