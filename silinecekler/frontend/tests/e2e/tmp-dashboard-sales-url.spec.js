import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("debug dashboard sales url", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto("/at/");
  console.log("URL1", page.url());
  await page.getByRole("button", { name: /^Satış$|^Sales$/i }).click();
  await page.waitForTimeout(2500);
  console.log("URL2", page.url());
  console.log("ACTIVE", await page.locator(".at-tab-chip-active").allTextContents());
});