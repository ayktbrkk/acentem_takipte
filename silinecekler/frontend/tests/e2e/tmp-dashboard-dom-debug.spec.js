import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("debug dashboard dom", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto("/at/");
  const html = await page.locator("body").innerHTML();
  console.log("HAS_TAB_CHIP", html.includes("at-tab-chip"));
  console.log("HTML_SNIPPET", html.slice(0, 4000));
});