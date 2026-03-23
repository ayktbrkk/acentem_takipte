import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

async function expectCoreLayout(page) {
  await expect(page.locator(".mini-metric").first()).toBeVisible();
  await expect(page.getByText(/Filtreler|Filters/i).first()).toBeVisible();
  await expect(page.locator("table").first()).toBeVisible();
}

test.describe("Reports + Policies visual smoke", () => {
  test("authenticated visual check for policies and reports pages", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.goto("/at/policies");
    await expect(page).toHaveURL(/\/at\/policies/);
    await expect(page.getByRole("heading", { name: /Policy Workbench|Poliçe/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Yenile|Refresh/i }).first()).toBeVisible();
    await expectCoreLayout(page);
    await expect(page).toHaveScreenshot("policies-page.png", {
      animations: "disabled",
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
    await page.screenshot({ path: "test-results/policies-visual-check.png", fullPage: true });

    await page.goto("/at/reports");
    await expect(page).toHaveURL(/\/at\/reports/);
    await expect(page.getByRole("button", { name: /Yenile|Refresh/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /XLSX|PDF|Export|Dışa Aktar/i }).first()).toBeVisible();
    await expectCoreLayout(page);

    const filtersSection = page.getByText(/Filtreler|Filters/i).first();
    const tableSection = page.locator("table").first();
    const filtersBox = await filtersSection.boundingBox();
    const tableBox = await tableSection.boundingBox();

    expect(filtersBox).toBeTruthy();
    expect(tableBox).toBeTruthy();
    if (filtersBox && tableBox) {
      expect(filtersBox.y).toBeLessThan(tableBox.y);
    }

    await expect(page).toHaveScreenshot("reports-page.png", {
      animations: "disabled",
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
    await page.screenshot({ path: "test-results/reports-visual-check.png", fullPage: true });
  });
});
