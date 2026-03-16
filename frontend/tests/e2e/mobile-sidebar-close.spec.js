import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth";

function routePattern(path) {
  return new RegExp(path.replace(/\//g, "\\/") + "(?:\\?|$)");
}

test.describe.serial("Mobile sidebar close behavior", () => {
  test("closes drawer after sidebar navigation", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/at/leads");
    await expect(page).toHaveURL(routePattern("/at/leads"));

    const menuButton = page.getByRole("button", { name: /^menu$/i }).first();
    await menuButton.waitFor({ state: "visible", timeout: 10000 });
    await menuButton.click();

    const tasksLink = page.locator('aside nav a[href="/at/tasks"]').first();
    await tasksLink.waitFor({ state: "visible", timeout: 10000 });
    await tasksLink.click();

    await expect(page).toHaveURL(routePattern("/at/tasks"));
    await expect(page.locator("button.fixed.inset-0.z-30")).toHaveCount(0);
    await expect(page.locator("aside")).toHaveClass(/-translate-x-full/);
    await expect(menuButton).toBeVisible();
  });
});
