import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

const hasExplicitCredentials = Boolean(
  process.env.E2E_BASE_URL && process.env.E2E_USER && process.env.E2E_PASSWORD,
);

function safePath(value) {
  const pathname = String(value || "").split(/[?#]/, 1)[0];
  return pathname.startsWith("/at") ? "/at" : pathname.startsWith("/login") ? "/login" : "/redacted";
}

function isKnownNoise(value) {
  return /favicon|google-analytics|googletagmanager|analytics\./i.test(String(value || ""));
}

function diagnostics(page, testInfo) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const onConsole = (message) => {
    if (message.type() === "error" && !isKnownNoise(message.text())) consoleErrors.push("console-error");
  };
  const onPageError = () => pageErrors.push("page-error");
  const onRequestFailed = (request) => {
    const failure = request.failure()?.errorText || "request-failed";
    if (failure === "net::ERR_ABORTED" || isKnownNoise(request.url())) return;
    failedRequests.push({ resourceType: request.resourceType(), pathname: safePath(request.url()), failure });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);

  return async () => {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    if (testInfo.status === testInfo.expectedStatus) {
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
      expect(failedRequests).toEqual([]);
      return;
    }

    const report = {
      viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })).catch(() => null),
      route: safePath(page.url()),
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      failedRequests,
    };
    const reportPath = testInfo.outputPath("shell-utility-diagnostics.json");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    await testInfo.attach("shell-utility-diagnostics", { path: reportPath, contentType: "application/json" });
    await page.screenshot({ path: testInfo.outputPath("shell-utility-failure.png"), fullPage: false });
  };
}

async function openAt(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto("/at/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("aside")).toBeVisible();
}

async function assertNoHorizontalOverflow(page, width) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

async function assertLanguageMenu(page, triggerTestId, menuTestId) {
  const trigger = page.getByTestId(triggerTestId);
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.getByTestId(menuTestId);
  const items = menu.getByRole("menuitemradio");
  await expect(menu).toBeVisible();
  await expect(items).toHaveCount(2);
  expect(await items.evaluateAll((elements) => elements.every((element) => element.textContent.trim()))).toBe(true);
  await expect(items.filter({ has: page.locator("[aria-checked='true']") })).toHaveCount(1);

  await expect(items.first()).toBeFocused();
  await page.keyboard.press("End");
  await expect(items.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.last()).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
}

async function assertBranchListbox(page) {
  const trigger = page.getByTestId("branch-scope-trigger");
  await expect(trigger).toBeVisible();
  if (await trigger.isDisabled()) {
    await expect(page.getByTestId("branch-scope-lock-status")).toBeVisible();
    return;
  }

  await trigger.click();
  const listbox = page.getByRole("listbox");
  const options = listbox.getByRole("option");
  await expect(listbox).toBeVisible();
  await expect(page.getByTestId("branch-search-input")).toBeVisible();
  await expect(options).not.toHaveCount(0);
  await expect(listbox.locator("[aria-selected='true']")).toHaveCount(1);
  await page.keyboard.press("End");
  await expect(options.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(options.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(options.first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(listbox).toBeHidden();
  await expect(trigger).toBeFocused();
}

test.describe("shell utility redesign audit", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    test.skip(!hasExplicitCredentials, "Set E2E_BASE_URL, E2E_USER, and E2E_PASSWORD for authenticated shell audit.");
    await ensureAuthenticated(page);
  });

  test.afterEach(async ({ page }) => {
    // Diagnostics are emitted only for failures and contain no rendered text or user data.
    const cleanup = page.__shellDiagnosticsCleanup;
    if (cleanup) await cleanup();
  });

  test("desktop rail and independent utility controls", async ({ page }) => {
    page.__shellDiagnosticsCleanup = diagnostics(page, test.info());
    await openAt(page, 1440, 900);

    const aside = page.locator("aside");
    const toggle = page.getByTestId("sidebar-desktop-collapse-toggle");
    await expect(toggle).toHaveCount(1);
    await expect(toggle).toBeVisible();
    await expect(aside).toHaveClass(/lg:w-\[240px\]/);
    await toggle.click();
    await expect(aside).toHaveClass(/lg:w-\[76px\]/);
    await expect(aside.getByTestId("sidebar-brand-monogram")).toHaveText("AT");
    await toggle.click();
    await expect(aside).toHaveClass(/lg:w-\[240px\]/);

    const profileTrigger = page.getByTestId("sidebar-profile-trigger");
    await profileTrigger.focus();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).not.toHaveAttribute("data-testid", "sidebar-profile-trigger");
    await profileTrigger.click();
    const profileMenu = page.getByTestId("sidebar-profile-menu");
    await expect(profileMenu).toBeVisible();
    await expect(profileMenu).toHaveCSS("position", "fixed");
    await expect(profileMenu.locator("xpath=ancestor::aside")).toHaveCount(0);
    await expect(profileMenu.getByTestId("profile-summary-user")).toHaveText(/\S/);
    await expect(profileMenu.getByTestId("profile-summary-role")).toHaveText(/\S/);
    const menuItems = profileMenu.getByRole("menuitem");
    await expect(menuItems.first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(menuItems.last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(menuItems.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menuItems.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(menuItems.first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(profileMenu).toBeHidden();
    await expect(profileTrigger).toBeFocused();
    await profileTrigger.click();
    await page.locator("main").click({ position: { x: 8, y: 8 } });
    await expect(profileMenu).toBeHidden();

    await assertLanguageMenu(page, "topbar-language-trigger", "topbar-language-menu");
    await assertBranchListbox(page);
    await expect(page.getByTestId("mobile-language-trigger")).toBeHidden();
  });

  test("tablet shell utilities stay within the viewport", async ({ page }) => {
    page.__shellDiagnosticsCleanup = diagnostics(page, test.info());
    await openAt(page, 768, 1024);
    await assertNoHorizontalOverflow(page, 768);
    await expect(page.getByTestId("mobile-sidebar-trigger")).toBeVisible();
    await expect(page.getByTestId("topbar-language-trigger")).toBeHidden();
    await assertLanguageMenu(page, "mobile-language-trigger", "mobile-language-menu");
    await assertBranchListbox(page);
    await assertNoHorizontalOverflow(page, 768);
  });

  test("mobile drawer, footer profile, language, and branch controls", async ({ page }) => {
    page.__shellDiagnosticsCleanup = diagnostics(page, test.info());
    await openAt(page, 390, 844);
    const aside = page.locator("aside");
    await expect(aside).toHaveClass(/-translate-x-full/);
    await page.getByTestId("mobile-sidebar-trigger").click();
    await expect(aside).toHaveClass(/translate-x-0/);
    await assertNoHorizontalOverflow(page, 390);

    await aside.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const profileTrigger = page.getByTestId("sidebar-profile-trigger");
    await profileTrigger.scrollIntoViewIfNeeded();
    await profileTrigger.click();
    const profileMenu = page.getByTestId("sidebar-profile-menu");
    await expect(profileMenu).toBeVisible();
    await expect(profileMenu).toHaveCSS("position", "fixed");
    await expect(profileMenu.locator("xpath=ancestor::aside")).toHaveCount(0);
    await expect(profileMenu.getByTestId("profile-mobile-language")).toHaveCount(0);
    await expect(profileMenu.getByTestId("profile-summary-active-branch")).toHaveText(/\S/);
    await page.keyboard.press("Escape");
    await expect(profileMenu).toBeHidden();
    await assertLanguageMenu(page, "mobile-language-trigger", "mobile-language-menu");
    await assertBranchListbox(page);

    const closeButton = aside.locator('button[title="Kapat"], button[title="Close"]');
    await expect(closeButton).toHaveCount(1);
    await closeButton.click();
    await expect(aside).toHaveClass(/-translate-x-full/);
    await assertNoHorizontalOverflow(page, 390);
  });
});
