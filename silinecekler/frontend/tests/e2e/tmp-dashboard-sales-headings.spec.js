import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("debug dashboard sales headings", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto("/at/");
  await page.getByRole("button", { name: /^Satış$|^Sales$/i }).click();
  await page.waitForTimeout(1500);
  const headings = await page.locator("h1,h2,h3,h4").allTextContents();
  console.log("HEADINGS", JSON.stringify(headings));
  console.log("BODY", (await page.locator("body").innerText()).slice(0, 2000));
});