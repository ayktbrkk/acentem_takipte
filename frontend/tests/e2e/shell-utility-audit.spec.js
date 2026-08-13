import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

function safePath(value) {
  const pathname = String(value || "").split(/[?#]/, 1)[0];
  return pathname.startsWith("/at") ? "/at" : pathname.startsWith("/login") ? "/login" : "/redacted";
}

function diagnostics(page, testInfo) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push("console-error");
  };
  const onPageError = () => pageErrors.push("page-error");
  const onRequestFailed = (request) => {
    const failure = request.failure()?.errorText || "request-failed";
    if (failure === "net::ERR_ABORTED" && (request.resourceType() === "document" || request.isNavigationRequest())) return;
    failedRequests.push({ resourceType: request.resourceType(), pathname: safePath(request.url()), failure });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);

  async function captureRedactedShell(page, outputPath) {
    await page.evaluate(() => {
      const sourceNodes = [
        document.querySelector("header.at-shell-topbar"),
        document.querySelector("aside"),
        document.querySelector("main"),
      ].filter(Boolean);
      const sandbox = document.createElement("div");
      sandbox.setAttribute("data-shell-redacted-capture", "true");
      sandbox.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#fff;overflow:hidden";

      for (const source of sourceNodes) {
        const sourceRect = source.getBoundingClientRect();
        const clone = source.cloneNode(true);
        clone.style.cssText = `position:fixed;left:${sourceRect.left}px;top:${sourceRect.top}px;width:${sourceRect.width}px;height:${sourceRect.height}px;overflow:hidden;background:#fff;color:#111;box-sizing:border-box`;
        const sourceElements = [source, ...source.querySelectorAll("*")];
        const cloneElements = [clone, ...clone.querySelectorAll("*")];
        for (let index = 0; index < cloneElements.length; index += 1) {
          const original = sourceElements[index];
          const current = cloneElements[index];
          if (!original || !current) continue;
          if (current instanceof HTMLInputElement || current instanceof HTMLTextAreaElement) current.value = "";
          if (current instanceof HTMLSelectElement) {
            current.selectedIndex = -1;
            current.value = "";
          }
          for (const attribute of [...current.attributes]) current.removeAttribute(attribute.name);
          const rect = original.getBoundingClientRect();
          current.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;overflow:hidden;background:#fff;background-image:none;color:#111;box-sizing:border-box;border:1px solid #e5e7eb`;
          if (current.tagName === "IMG" || current.tagName === "SVG" || current.tagName === "PICTURE") current.remove();
        }
        const textWalker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
        for (const textNode of textNodes) textNode.nodeValue = "REDACTED";
        for (const element of clone.querySelectorAll("script,style,link,img,svg,picture")) element.remove();
        sandbox.appendChild(clone);
      }
      document.body.appendChild(sandbox);
    });
    try {
      await page.locator('[data-shell-redacted-capture="true"]').screenshot({ path: outputPath, animations: "disabled" });
    } finally {
      await page.locator('[data-shell-redacted-capture="true"]').evaluate((element) => element.remove()).catch(() => {});
    }
  }

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
    await captureRedactedShell(page, testInfo.outputPath("shell-utility-failure.png"));
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
  const focusOrder = await page.evaluate(() => {
    const tabbable = (element) => {
      const style = getComputedStyle(element);
      let ancestor = element.parentElement;
      while (ancestor) {
        if (ancestor.matches("[inert]") || ancestor.matches("fieldset[disabled]")) return false;
        ancestor = ancestor.parentElement;
      }
      return !element.matches("[disabled],[aria-disabled='true']")
        && element.tabIndex >= 0
        && style.display !== "none"
        && style.visibility !== "hidden"
        && element.getClientRects().length > 0;
    };
    const focusables = [...document.querySelectorAll("button,a[href],input,textarea,select,[tabindex]")]
      .filter(tabbable)
      .sort((left, right) => (left.tabIndex || 0) - (right.tabIndex || 0));
    const currentIndex = focusables.indexOf(document.activeElement);
    return { currentIndex, nextIndex: currentIndex + 1 };
  });
  await page.keyboard.press("Tab");
  const activeAfterTab = await page.evaluate(({ currentIndex, nextIndex }) => {
    const tabbable = (element) => {
      let ancestor = element.parentElement;
      while (ancestor) {
        if (ancestor.matches("[inert]") || ancestor.matches("fieldset[disabled]")) return false;
        ancestor = ancestor.parentElement;
      }
      return !element.matches("[disabled],[aria-disabled='true']")
        && element.tabIndex >= 0
        && getComputedStyle(element).display !== "none"
        && getComputedStyle(element).visibility !== "hidden"
        && element.getClientRects().length > 0;
    };
    const focusables = [...document.querySelectorAll("button,a[href],input,textarea,select,[tabindex]")]
      .filter(tabbable)
      .sort((left, right) => (left.tabIndex || 0) - (right.tabIndex || 0));
    return {
      exactNextElement: focusables[nextIndex] === document.activeElement,
      currentIndex,
      activeIndex: focusables.indexOf(document.activeElement),
    };
  }, focusOrder);
  expect(activeAfterTab.exactNextElement).toBe(true);
  expect(activeAfterTab.activeIndex).not.toBe(focusOrder.currentIndex);
  await expect(menu.locator(":focus")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(menu).toBeVisible();
  const initialLocaleLabel = (await menu.locator("[role='menuitemradio'][aria-checked='true']").innerText()).trim();
  const alternateItem = menu.locator("[role='menuitemradio'][aria-checked='false']").first();
  const alternateLocaleLabel = (await alternateItem.innerText()).trim();
  await alternateItem.click();
  await expect(menu).toBeHidden();
  await expect(trigger).toContainText(alternateLocaleLabel);
  await expect(page.locator("header.at-shell-topbar")).toContainText(alternateLocaleLabel);

  await trigger.click();
  await expect(menu).toBeVisible();
  await menu.locator("[role='menuitemradio']", { hasText: initialLocaleLabel }).click();
  await expect(menu).toBeHidden();
  await expect(trigger).toContainText(initialLocaleLabel);
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
  const value = trigger.locator("span[title]").last();
  await expect(value).toHaveClass(/truncate/);
  const initialValue = await value.getAttribute("title");
  expect(initialValue).toBeTruthy();
  await expect(trigger).toHaveAttribute("aria-label", new RegExp(initialValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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

  const alternative = await options.evaluateAll((elements) => elements.find((element) => element.getAttribute("aria-selected") === "false")?.textContent?.trim() || "");
  expect(alternative).toBeTruthy();
  const searchTerm = alternative.split(/\s+/).find((part) => part.length > 1) || alternative;
  const searchInput = page.getByTestId("branch-search-input");
  await searchInput.fill(searchTerm);
  await expect(options).not.toHaveCount(0);
  expect((await options.first().innerText()).toLocaleLowerCase()).toContain(searchTerm.toLocaleLowerCase());
  await options.first().click();
  await expect(listbox).toBeHidden();
  const updatedValue = await value.getAttribute("title");
  const updatedName = await trigger.getAttribute("aria-label");
  expect(updatedValue || updatedName).toBeTruthy();
  expect(updatedValue !== initialValue || updatedName !== initialValue).toBe(true);
  await trigger.click();
  await expect(listbox).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(listbox).toBeHidden();
  await expect(trigger).toBeFocused();
}

async function assertIndependentTabletUtilities(page) {
  const languageTrigger = page.getByTestId("mobile-language-trigger");
  const languageMenu = page.getByTestId("mobile-language-menu");
  const branchTrigger = page.getByTestId("branch-scope-trigger");
  await languageTrigger.click();
  await expect(languageMenu).toBeVisible();
  await expect(branchTrigger).toBeVisible();
  if (await branchTrigger.isDisabled()) {
    await expect(page.getByTestId("branch-scope-lock-status")).toBeVisible();
  } else {
    await branchTrigger.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(languageTrigger).toBeVisible();
    await expect(languageMenu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(languageMenu).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(languageMenu).toBeHidden();
  await assertLanguageMenu(page, "mobile-language-trigger", "mobile-language-menu");
  await assertBranchListbox(page);
}

async function assertTabletUtilityGeometry(page) {
  const branchTrigger = page.getByTestId("branch-scope-trigger");
  const languageTrigger = page.getByTestId("mobile-language-trigger");
  await expect(branchTrigger).toBeVisible();
  await expect(languageTrigger).toBeVisible();
  const boxes = await Promise.all([branchTrigger.boundingBox(), languageTrigger.boundingBox()]);
  expect(boxes[0]?.width).toBeGreaterThan(0);
  expect(boxes[1]?.width).toBeGreaterThan(0);
  expect(boxes[0]?.height).toBeGreaterThan(0);
  expect(boxes[1]?.height).toBeGreaterThan(0);
  const [branchBox, languageBox] = boxes;
  expect(branchBox.right <= languageBox.x || languageBox.right <= branchBox.x || branchBox.bottom <= languageBox.y || languageBox.bottom <= branchBox.y).toBe(true);
}

test.describe("shell utility redesign audit", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    try {
      await ensureAuthenticated(page);
    } catch (error) {
      if (!process.env.E2E_USER && /ERR_CONNECTION|ECONNREFUSED|ERR_FAILED|net::/.test(String(error))) {
        test.skip(true, "No local E2E server is available for the helper's localhost fallback.");
      }
      throw error;
    }
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
    for (let index = 0; index <= await menuItems.count(); index += 1) await page.keyboard.press("Tab");
    await expect(profileMenu.locator(":focus")).toHaveCount(0);
    await expect(profileTrigger).not.toBeFocused();
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
    await assertIndependentTabletUtilities(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertTabletUtilityGeometry(page);
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

    const nav = aside.locator("nav");
    const footer = aside.locator("footer");
    const profileTrigger = page.getByTestId("sidebar-profile-trigger");
    const initialReachability = await footer.evaluate((element) => {
      const profile = element.querySelector('[data-testid="sidebar-profile-trigger"]');
      const rect = (node) => {
        const box = node.getBoundingClientRect();
        return {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          visible: Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length),
        };
      };
      return { footer: rect(element), profile: rect(profile) };
    });
    expect(initialReachability.footer.visible).toBe(true);
    expect(initialReachability.profile.visible).toBe(true);

    const beforeScroll = await nav.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollTop: element.scrollTop,
    }));
    if (beforeScroll.scrollHeight > beforeScroll.clientHeight) {
      await nav.evaluate((element) => {
        element.scrollTop = element.scrollHeight - element.clientHeight;
      });
      const afterScroll = await nav.evaluate((element) => ({
        scrollTop: element.scrollTop,
        maxScrollTop: element.scrollHeight - element.clientHeight,
      }));
      expect(afterScroll.maxScrollTop).toBeGreaterThan(0);
      expect(afterScroll.scrollTop).toBeGreaterThanOrEqual(afterScroll.maxScrollTop - 1);
    } else {
      expect(beforeScroll.scrollHeight).toBe(beforeScroll.clientHeight);
      expect(initialReachability.profile.visible).toBe(true);
    }
    const finalReachability = await footer.evaluate((element) => {
      const profile = element.querySelector('[data-testid="sidebar-profile-trigger"]');
      const inViewport = (node) => {
        const box = node.getBoundingClientRect();
        return box.top >= 0 && box.left >= 0 && box.bottom <= innerHeight && box.right <= innerWidth;
      };
      return { footerInViewport: inViewport(element), profileInViewport: inViewport(profile) };
    });
    expect(finalReachability.footerInViewport).toBe(true);
    expect(finalReachability.profileInViewport).toBe(true);
    await expect(profileTrigger).toBeVisible();
    await profileTrigger.click();
    const profileMenu = page.getByTestId("sidebar-profile-menu");
    await expect(profileMenu).toBeVisible();
    await expect(profileMenu).toHaveCSS("position", "fixed");
    await expect(profileMenu.locator("xpath=ancestor::aside")).toHaveCount(0);
    await expect(profileMenu.getByTestId("profile-mobile-language")).toHaveCount(0);
    await expect(profileMenu.getByTestId("branch-scope-trigger")).toHaveCount(0);
    await expect(profileMenu.getByRole("listbox")).toHaveCount(0);
    await expect(profileMenu.getByTestId("profile-summary-active-branch")).toHaveText(/\S/);
    expect(await profileMenu.getByTestId("profile-summary-active-branch").evaluate((element) => !element.closest("button,a,[role]"))).toBe(true);
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
