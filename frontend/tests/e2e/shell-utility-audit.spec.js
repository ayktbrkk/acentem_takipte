import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { ensureAuthenticated, pageRequest } from "./helpers/auth.js";

test.use({ trace: "off" });

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
    const url = request.url();
    let parsedUrl = null;
    try {
      parsedUrl = new URL(url);
    } catch {
      parsedUrl = null;
    }
    // Navigation/document aborts are browser cancellations during real route changes.
    if (failure === "net::ERR_ABORTED" && (request.resourceType() === "document" || request.isNavigationRequest())) return;
    // Socket.IO/WebSocket connection noise is benign only for websocket URLs and connection errors.
    if (
      request.resourceType() === "websocket"
      && parsedUrl
      && /\/socket\.io(?:\/|$)/i.test(parsedUrl.pathname)
      && /^(localhost|127\.0\.0\.1|::1)$/i.test(parsedUrl.hostname)
      && /ERR_CONNECTION|ECONNREFUSED|ERR_FAILED/i.test(failure)
    ) return;
    // Telemetry is non-application traffic only on the documented analytics hosts/paths.
    if (
      ["script", "xhr", "fetch", "beacon"].includes(request.resourceType())
      && parsedUrl
      && /(?:^|\.)google-analytics\.com$|(?:^|\.)googletagmanager\.com$/i.test(parsedUrl.hostname)
      && /\/collect(?:$|\/)|\/gtag\/js(?:$|\/)/i.test(parsedUrl.pathname)
    ) return;
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

    try {
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
    } catch {
      console.log("shell-utility-diagnostics-attachment-failed");
    }
    try {
      await captureRedactedShell(page, testInfo.outputPath("shell-utility-failure.png"));
    } catch {
      console.log("shell-utility-redacted-screenshot-failed");
    }
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

async function readShellLocaleState(page, includeProfile = false) {
  const header = page.locator("header.at-shell-topbar");
  const state = {
    section: (await header.locator("p").nth(0).innerText()).trim(),
    pageTitle: (await header.locator("p").nth(1).innerText()).trim(),
    sidebar: (await page.locator("aside nav").innerText()).trim(),
    profileRole: null,
  };
  if (includeProfile) {
    const profileTrigger = page.getByTestId("sidebar-profile-trigger");
    await profileTrigger.click();
    const profileMenu = page.getByTestId("sidebar-profile-menu");
    await expect(profileMenu).toBeVisible();
    state.profileRole = (await profileMenu.getByTestId("profile-summary-role").innerText()).trim();
    await page.keyboard.press("Escape");
  }
  return state;
}

async function readObservedLocale(page) {
  return page.evaluate(() => {
    const pinia = document.querySelector("#app")?.__vue_app__?.config?.globalProperties?.$pinia;
    const auth = pinia?._s?.get("auth");
    return String(auth?.locale?.value || auth?.locale || "").toLowerCase();
  });
}

async function assertLocaleResponse(response, expectedLocale) {
  expect(response).not.toBeNull();
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  const persistedLocale = payload?.message?.locale || payload?.locale || payload?.message;
  expect(String(persistedLocale).toLowerCase()).toBe(expectedLocale);
}

async function setSessionLocale(page, locale) {
  const result = await pageRequest(
    page,
    "GET",
    `/api/method/acentem_takipte.acentem_takipte.platform.api.session.set_session_locale?locale=${encodeURIComponent(locale)}`,
  );
  expect(result.ok).toBe(true);
  const persistedLocale = result.json?.message?.locale || result.json?.locale || result.json?.message;
  expect(String(persistedLocale).toLowerCase()).toBe(locale);
  return result;
}

async function readBranchStoreState(page) {
  return page.evaluate(() => {
    const pinia = document.querySelector("#app")?.__vue_app__?.config?.globalProperties?.$pinia;
    const branch = pinia?._s?.get("branch");
    return {
      present: Boolean(branch),
      selected: branch?.selected ?? null,
      requestBranch: branch?.requestBranch ?? null,
    };
  });
}

async function readBranchRoute(page) {
  return page.evaluate(() => new URL(window.location.href).searchParams.get("office_branch"));
}

async function waitForRestoredBranchState(page, expectedState, expectedRoute) {
  await expect(page.locator("header.at-shell-topbar"), "Expected the shell to be ready before reading restored branch state.").toBeVisible();
  await expect.poll(
    () => page.evaluate(({ expectedSelected, expectedRequestBranch, expectedRouteValue }) => {
      const pinia = document.querySelector("#app")?.__vue_app__?.config?.globalProperties?.$pinia;
      const branch = pinia?._s?.get("branch");
      return {
        present: Boolean(branch),
        selected: branch?.selected ?? null,
        requestBranch: branch?.requestBranch ?? null,
        route: new URL(window.location.href).searchParams.get("office_branch"),
        consistent: Boolean(branch)
          && branch.selected === expectedSelected
          && branch.requestBranch === expectedRequestBranch
          && new URL(window.location.href).searchParams.get("office_branch") === expectedRouteValue,
      };
    }, {
      expectedSelected: expectedState.selected,
      expectedRequestBranch: expectedState.requestBranch,
      expectedRouteValue: expectedRoute,
    }),
    {
      timeout: 10_000,
      intervals: [100, 250, 500],
      message: "Timed out waiting for the hydrated branch store and route query to match the initial state.",
    },
  ).toEqual({
    present: true,
    selected: expectedState.selected,
    requestBranch: expectedState.requestBranch,
    route: expectedRoute,
    consistent: true,
  });
}

async function assertLanguageMenu(page, triggerTestId, menuTestId, initialState = null, testInfo) {
  const trigger = page.getByTestId(triggerTestId);
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.getByTestId(menuTestId);
  const items = menu.getByRole("menuitemradio");
  await expect(menu).toBeVisible();
  await expect(items).toHaveCount(2);
  expect(await items.evaluateAll((elements) => elements.every((element) => element.textContent.trim()))).toBe(true);
  const selectedItems = menu.locator("[role='menuitemradio'][aria-checked='true']");
  await expect(selectedItems).toHaveCount(1);

  await expect(items.first()).toBeFocused();
  await page.keyboard.press("End");
  await expect(items.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.last()).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(items.first()).toBeFocused();
  const externalTarget = page.locator("main button, main a[href], main input, main textarea, main select").first();
  await expect(externalTarget).toBeVisible();
  await externalTarget.evaluate((element) => element.setAttribute("data-testid", "shell-audit-tab-target"));
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("shell-audit-tab-target")).toBeFocused();
  await expect(menu.locator(":focus")).toHaveCount(0);
  await externalTarget.evaluate((element) => element.removeAttribute("data-testid"));
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(menu).toBeVisible();
  const initialLocaleLabel = (await menu.locator("[role='menuitemradio'][aria-checked='true']").innerText()).replace("✓", "").trim();
  const alternateItem = menu.locator("[role='menuitemradio'][aria-checked='false']").first();
  const alternateLocaleLabel = (await alternateItem.innerText()).trim();
  const initialLocale = await readObservedLocale(page);
  expect(initialLocale).toMatch(/^(tr|en)$/);
  const alternateLocale = initialLocale === "tr" ? "en" : "tr";
  expect(alternateLocale).not.toBe(initialLocale);
  let primaryError = null;
  try {
    const localeRequestPromise = page.waitForRequest((request) => request.url().includes("set_session_locale"));
    await alternateItem.click();
    const localeRequest = await localeRequestPromise;
    const localeResponse = await localeRequest.response();
    await assertLocaleResponse(localeResponse, alternateLocale);
    await expect(menu).toBeHidden();
    await expect(trigger).toContainText(alternateLocaleLabel);
    await expect(page.locator("header.at-shell-topbar")).toContainText(alternateLocaleLabel);
    expect(await readObservedLocale(page)).toBe(alternateLocale);
    if (initialState) {
      const alternateState = await readShellLocaleState(page, Boolean(initialState.profileRole));
      expect(alternateState.section).not.toBe(initialState.section);
      expect(alternateState.pageTitle).not.toBe(initialState.pageTitle);
      expect(alternateState.sidebar).not.toBe(initialState.sidebar);
      expect(alternateState.profileRole).not.toBe(initialState.profileRole);
    }
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    const drawer = page.locator("aside");
    const drawerWasOpen = triggerTestId === "mobile-language-trigger"
      ? await drawer.evaluate((element) => element.classList.contains("translate-x-0")).catch(() => false)
      : false;
    let restorationError = null;
    let restorationAttempts = 0;
    let observedAfterRestoration = null;
    let restored = false;
    for (let attempt = 1; attempt <= 2 && !restored; attempt += 1) {
      restorationAttempts = attempt;
      try {
        if (attempt > 1) {
          await page.reload({ waitUntil: "domcontentloaded" });
          if (drawerWasOpen) await page.getByTestId("mobile-sidebar-trigger").click();
        }
        await setSessionLocale(page, initialLocale);
        await page.reload({ waitUntil: "domcontentloaded" });
        if (drawerWasOpen) await page.getByTestId("mobile-sidebar-trigger").click();
        await expect(page.getByTestId(triggerTestId)).toContainText(initialLocaleLabel);
        observedAfterRestoration = await readObservedLocale(page);
        expect(observedAfterRestoration).toBe(initialLocale);
        if (initialState) {
          const restoredState = await readShellLocaleState(page, Boolean(initialState.profileRole));
          expect(restoredState).toEqual(initialState);
        }
        restored = true;
      } catch (error) {
        restorationError = error;
      }
    }
    const stateMarker = {
      expectedLocale: initialLocale,
      observedLocale: observedAfterRestoration,
      restored,
      restorationAttempts,
      primaryAssertionFailed: Boolean(primaryError),
      restorationFailed: Boolean(restorationError),
    };
    try {
      await testInfo?.attach("shell-utility-locale-restoration", {
        body: JSON.stringify(stateMarker),
        contentType: "application/json",
      });
    } catch {
      console.log("shell-utility-locale-state-attachment-failed");
    }
    if (!restored) {
      const dedicatedError = new Error("Locale restoration failed after two attempts.");
      dedicatedError.cause = primaryError
        ? new AggregateError([primaryError, restorationError], "Primary assertion and locale restoration both failed.")
        : restorationError;
      throw dedicatedError;
    }
  }
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
  const initialBranchState = await readBranchStoreState(page);
  const initialSelectedOption = listbox.locator("[role='option'][aria-selected='true']");
  await expect(initialSelectedOption).toHaveCount(1);
  const initialOptionTestId = await initialSelectedOption.getAttribute("data-testid");
  expect(initialOptionTestId, "Expected the initial branch selection to expose a stable option test id.").toBeTruthy();
  const initialBranchRoute = await readBranchRoute(page);
  const initialBranchUrl = await page.evaluate(() => {
    const url = new URL(window.location.href);
    return url.pathname + url.search + url.hash;
  });
  const listboxBox = await listbox.boundingBox();
  expect(listboxBox).not.toBeNull();
  if (!listboxBox) throw new Error("Branch listbox has no rendered bounding box.");
  expect(listboxBox.x).toBeGreaterThanOrEqual(0);
  expect(listboxBox.y).toBeGreaterThanOrEqual(0);
  expect(listboxBox.x + listboxBox.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  expect(listboxBox.y + listboxBox.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
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

  const alternative = await options.evaluateAll((elements) => elements.find((element) => element.getAttribute("aria-selected") === "false" && element.getAttribute("data-testid") !== "branch-option-all")?.textContent?.trim() || "");
  expect(alternative, "Expected at least one non-All-Branches option in the branch listbox.").toBeTruthy();
  const searchTerm = alternative.split(/\s+/).find((part) => part.length > 1) || alternative;
  const searchInput = page.getByTestId("branch-search-input");
  await searchInput.fill(searchTerm);
  await expect(options).not.toHaveCount(0);
  expect((await options.first().innerText()).toLocaleLowerCase()).toContain(searchTerm.toLocaleLowerCase());
  const selectedOption = options.first();
  const selectedOptionName = (await selectedOption.getAttribute("aria-label")) || (await selectedOption.locator(".branch-option-label").innerText()).trim();
  const selectedOptionValue = await selectedOption.getAttribute("data-testid");
  expect(selectedOptionName).toBeTruthy();
  expect(selectedOptionValue).toBeTruthy();
  const selectedBranchValue = selectedOptionValue.replace(/^branch-option-/, "");
  expect(selectedBranchValue).not.toBe("all");
  await selectedOption.click();
  await expect(listbox).toBeHidden();
  const updatedValue = await value.getAttribute("title");
  const updatedName = await trigger.getAttribute("aria-label");
  const updatedText = await trigger.innerText();
  expect(`${updatedValue} ${updatedName} ${updatedText}`).toContain(selectedOptionName);
  expect(updatedValue !== initialValue || updatedName !== initialValue).toBe(true);
  await trigger.click();
  await expect(listbox).toBeVisible();
  const selectedOptionState = listbox.getByTestId(selectedOptionValue);
  await expect(selectedOptionState).toHaveAttribute("aria-selected", "true");
  const selectedBranchState = await readBranchStoreState(page);
  expect(selectedBranchState.present, "Expected the rendered branch store to be available after branch selection.").toBe(true);
  expect(String(selectedBranchState.selected)).toBe(selectedBranchValue);
  expect(String(selectedBranchState.requestBranch)).toBe(selectedBranchValue);
  const allOption = listbox.getByTestId("branch-option-all");
  await expect(allOption, "Expected an explicit All Branches option for the branch state audit.").toHaveCount(1);
  await allOption.click();
  await expect(listbox).toBeHidden();
  const allBranchState = await readBranchStoreState(page);
  expect(allBranchState.present).toBe(true);
  expect(allBranchState.selected).toBeNull();
  expect(allBranchState.requestBranch).toBeNull();
  await trigger.click();
  await expect(listbox).toBeVisible();
  await expect(listbox.getByTestId("branch-option-all")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(listbox).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(listbox).toBeVisible();
  const initialOption = listbox.getByTestId(initialOptionTestId);
  await expect(initialOption, "Expected the initial branch option to remain available for restoration.").toHaveCount(1);
  await initialOption.click();
  await expect(listbox).toBeHidden();
  const restoredBranchUrl = await page.evaluate(() => {
    const url = new URL(window.location.href);
    return url.pathname + url.search + url.hash;
  });
  if (restoredBranchUrl !== initialBranchUrl) {
    await page.goto(initialBranchUrl, { waitUntil: "domcontentloaded" });
  }
  await waitForRestoredBranchState(page, initialBranchState, initialBranchRoute);
  const restoredUrl = await page.evaluate(() => {
    const url = new URL(window.location.href);
    return { pathname: url.pathname, search: url.search, hash: url.hash };
  });
  const initialUrlParts = new URL(`http://origin.invalid${initialBranchUrl}`);
  expect(restoredUrl.pathname).toBe(initialUrlParts.pathname);
  expect(restoredUrl.search).toBe(initialUrlParts.search);
  expect(restoredUrl.hash).toBe(initialUrlParts.hash);
  const restoredBranchState = await readBranchStoreState(page);
  expect(restoredBranchState.present).toBe(initialBranchState.present);
  expect(restoredBranchState.selected).toBe(initialBranchState.selected);
  expect(restoredBranchState.requestBranch).toBe(initialBranchState.requestBranch);
  expect(await readBranchRoute(page)).toBe(initialBranchRoute);
}

async function assertIndependentTabletUtilities(page, testInfo) {
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
  await assertLanguageMenu(page, "mobile-language-trigger", "mobile-language-menu", null, testInfo);
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
  for (const box of boxes) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    expect(box.y + box.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
  }
  expect(
    branchBox.x + branchBox.width <= languageBox.x
      || languageBox.x + languageBox.width <= branchBox.x
      || branchBox.y + branchBox.height <= languageBox.y
      || languageBox.y + languageBox.height <= branchBox.y,
  ).toBe(true);
}

async function assertTabletTopbarRowContract(page) {
  const layout = await page.evaluate(() => {
    const topbar = document.querySelector("header.at-shell-topbar");
    const branch = document.querySelector('[data-testid="branch-scope-trigger"]');
    const language = document.querySelector('[data-testid="mobile-language-trigger"]');
    if (!topbar || !branch || !language) return null;
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return { topbar: box(topbar), branch: box(branch), language: box(language) };
  });
  expect(layout, "Expected the tablet topbar and both utility controls to render.").not.toBeNull();
  if (!layout) throw new Error("Tablet topbar utility layout is unavailable.");
  expect(layout.topbar.height).toBeGreaterThanOrEqual(Math.max(layout.branch.height, layout.language.height) + 20);
  expect(Math.abs(layout.branch.y - layout.language.y)).toBeLessThanOrEqual(4);
  expect(layout.branch.y).toBeGreaterThanOrEqual(layout.topbar.y);
  expect(layout.language.y + layout.language.height).toBeLessThanOrEqual(layout.topbar.y + layout.topbar.height);
}

async function assertProfileMenuInViewport(page) {
  const menu = page.getByTestId("sidebar-profile-menu");
  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  expect(box.y + box.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
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
    const expandedWidth = (await aside.boundingBox()).width;
    expect(expandedWidth).toBeGreaterThan(200);
    await toggle.click();
    const collapsedWidth = (await aside.boundingBox()).width;
    expect(collapsedWidth).toBeLessThan(expandedWidth);
    await expect(aside.getByTestId("sidebar-brand-monogram")).toHaveText("AT");
    await toggle.click();
    expect((await aside.boundingBox()).width).toBeGreaterThan(collapsedWidth);

    const profileTrigger = page.getByTestId("sidebar-profile-trigger");
    await profileTrigger.focus();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).not.toHaveAttribute("data-testid", "sidebar-profile-trigger");
    await profileTrigger.click();
    const profileMenu = page.getByTestId("sidebar-profile-menu");
    await expect(profileMenu).toBeVisible();
    await expect(profileMenu).toHaveCSS("position", "fixed");
    await assertProfileMenuInViewport(page);
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
    await expect(profileTrigger).toBeFocused();
    await profileTrigger.click();
    const desktopLanguageTrigger = page.getByTestId("topbar-language-trigger");
    await desktopLanguageTrigger.click();
    await expect(profileMenu).toBeHidden();
    await expect(desktopLanguageTrigger).toBeFocused();
    await page.keyboard.press("Escape");

    const initialLocaleState = await readShellLocaleState(page, true);
    await assertLanguageMenu(page, "topbar-language-trigger", "topbar-language-menu", initialLocaleState, test.info());
    await assertBranchListbox(page);
    await expect(page.getByTestId("mobile-language-trigger")).toBeHidden();
  });

  test("tablet shell utilities stay within the viewport", async ({ page }) => {
    page.__shellDiagnosticsCleanup = diagnostics(page, test.info());
    await openAt(page, 768, 1024);
    await assertNoHorizontalOverflow(page, 768);
    await expect(page.getByTestId("mobile-sidebar-trigger")).toBeVisible();
    await expect(page.getByTestId("topbar-language-trigger")).toBeHidden();
    await assertIndependentTabletUtilities(page, test.info());
    await assertTabletUtilityGeometry(page);
    await assertTabletTopbarRowContract(page);
    await page.getByTestId("mobile-sidebar-trigger").click();
    const tabletProfileTrigger = page.getByTestId("sidebar-profile-trigger");
    await tabletProfileTrigger.click();
    await expect(page.getByTestId("sidebar-profile-menu")).toBeVisible();
    await assertProfileMenuInViewport(page);
    await page.keyboard.press("Escape");
    await page.getByTestId("mobile-sidebar-trigger").click();
    await assertNoHorizontalOverflow(page, 768);
  });

  test("mobile drawer, footer profile, language, and branch controls", async ({ page }) => {
    page.__shellDiagnosticsCleanup = diagnostics(page, test.info());
    await openAt(page, 390, 844);
    const aside = page.locator("aside");
    await expect(aside).toHaveClass(/-translate-x-full/);
    await page.getByTestId("mobile-sidebar-trigger").click();
    await expect(aside).toHaveClass(/translate-x-0/);
    await expect(page.getByTestId("mobile-sidebar-close")).toBeFocused();
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
        return box.top >= 0
          && box.left >= 0
          && box.y + box.height <= innerHeight
          && box.x + box.width <= innerWidth;
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
    await assertProfileMenuInViewport(page);
    await expect(profileMenu.locator("xpath=ancestor::aside")).toHaveCount(0);
    await expect(profileMenu.getByTestId("profile-mobile-language")).toHaveCount(0);
    await expect(profileMenu.getByTestId("branch-scope-trigger")).toHaveCount(0);
    await expect(profileMenu.getByRole("listbox")).toHaveCount(0);
    await expect(profileMenu.getByTestId("profile-summary-active-branch")).toHaveText(/\S/);
    expect(await profileMenu.getByTestId("profile-summary-active-branch").evaluate((element) => !element.closest("button,a,[role]"))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(profileMenu).toBeHidden();
    await assertLanguageMenu(page, "mobile-language-trigger", "mobile-language-menu", null, test.info());
    await assertBranchListbox(page);

    const closeButton = aside.getByTestId("mobile-sidebar-close");
    await expect(closeButton).toHaveCount(1);
    await closeButton.click();
    await expect(aside).toHaveClass(/-translate-x-full/);
    await expect(page.getByTestId("mobile-sidebar-trigger")).toBeFocused();
    await assertNoHorizontalOverflow(page, 390);
  });
});
