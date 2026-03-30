import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("debug dashboard sales chip", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto("/at/");
  const chips = page.locator(".at-tab-chip");
  console.log("CHIPS", await chips.allTextContents());
  await chips.filter({ hasText: "Satış" }).click();
  await page.waitForTimeout(2500);
  console.log("URL", page.url());
  console.log("ACTIVE", await page.locator(".at-tab-chip-active").allTextContents());
  console.log("HEADINGS", await page.locator("h1,h2,h3,h4").allTextContents());
});