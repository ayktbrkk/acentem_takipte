import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

async function gotoWithFallback(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 }).catch(() =>
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 }),
  );
}

test.describe("Locale smoke", () => {
  test("switches Türkçe/English in the desktop chip and quick-create labels", async ({ page }) => {
    const authenticated = await ensureAuthenticated(page);
    expect(authenticated).toBe(true);

    await gotoWithFallback(page, "/at/customers");

    const localeButton = page.getByTestId("topbar-language-trigger");
    await expect(localeButton).toBeVisible();

    // Default flow is Türkçe on this environment; verify Türkçe labels first.
    if (!(await localeButton.textContent())?.includes("Türkçe")) {
      await localeButton.click();
      await page.getByTestId("topbar-language-menu").getByRole("menuitem", { name: "Türkçe", exact: true }).click();
      await expect(localeButton).toContainText("Türkçe");
    }

    const newButton = page
      .locator('button:has-text("Yeni"), button:has-text("New"), button[aria-label*="Yeni"], button[aria-label*="New"]')
      .first();
    const quickCreateTitle = page.getByText(/Hızlı Müşteri Kaydı|Quick Customer Registration/i).first();

    await expect(newButton).toBeVisible();
    await newButton.click();
    await expect(quickCreateTitle).toBeVisible();
    const trCancelButton = page.locator('button:has-text("İptal")').first();
    await expect(trCancelButton).toBeVisible();
    await trCancelButton.click();
    await expect(quickCreateTitle).toBeHidden();

    await localeButton.click();
    await page.getByTestId("topbar-language-menu").getByRole("menuitem", { name: "English", exact: true }).click();
    await expect(localeButton).toContainText("English");

    await newButton.click();
    await expect(quickCreateTitle).toBeVisible();
    const enCancelButton = page.locator('button:has-text("Cancel")').first();
    await expect(enCancelButton).toBeVisible();
    await enCancelButton.click();
    await expect(quickCreateTitle).toBeHidden();

    const accountMenuButton = page.getByTestId("sidebar-profile-trigger");
    await accountMenuButton.click();
    await expect(page.locator('button[role="menuitem"]:has-text("Logout")')).toBeVisible();
    await page.keyboard.press("Escape");

    // Return to TR for deterministic next runs.
    await localeButton.click();
    await page.getByTestId("topbar-language-menu").getByRole("menuitem", { name: "Türkçe", exact: true }).click();
    await expect(localeButton).toContainText("Türkçe");
  });
});
