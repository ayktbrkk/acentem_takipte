import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { ensureAuthenticated, pageRequest } from "./helpers/auth.js";

async function readMethodPayload(response) {
  return response?.json ?? null;
}

async function callPostMethod(page, method, params = {}) {
  const response = await pageRequest(page, "POST", `/api/method/${method}`, {
    form: params,
  });
  return { ok: response.ok, status: response.status, payload: response.json };
}

async function callGetMethod(page, method) {
  return pageRequest(page, "GET", `/api/method/${method}`);
}

// ---------------------------------------------------------------------------
// Sidebar collapse/expand failure diagnostics.
//
// The collapse/expand transition is intermittent in production: the collapse
// class applies to the aside, but the "Menüyü genişlet" button never appears
// in the DOM. These helpers capture the DOM + store state around the click and,
// ONLY on assertion failure, a settling timeline plus a screenshot. Captures
// are single-shot reads (no polling loop) so they cannot perturb the timing
// the smoke is measuring. They never weaken the assertions and never capture
// passwords, cookies, tokens or PII.
// ---------------------------------------------------------------------------

function readSidebarSnapshot(page) {
  return page.evaluate(() => {
    function sanitizeDiagnosticRoute(pathname) {
      const safeRouteCategories = new Set(["at", "desk", "login"]);
      const category = String(pathname || "")
        .replace(/^\/+/, "")
        .split(/[/?#]/, 1)[0]
        .toLowerCase();
      if (safeRouteCategories.has(category)) return `/${category}`;
      return "/at";
    }

    const labelPattern = /Menüyü daralt|Menüyü genişlet|Collapse menu|Expand menu/;
    const aside = document.querySelector("aside");
    const asideRect = aside ? aside.getBoundingClientRect() : null;
    const asideCenterY = asideRect ? asideRect.y + asideRect.height / 2 : 0;
    const buttons = [];
    for (const button of document.querySelectorAll("aside button[aria-label], aside button[title]")) {
      const ariaLabel = button.getAttribute("aria-label") || "";
      const title = button.getAttribute("title") || "";
      if (!labelPattern.test(ariaLabel) && !labelPattern.test(title)) continue;
      const rect = button.getBoundingClientRect();
      const style = window.getComputedStyle(button);
      buttons.push({
        index: buttons.length,
        ariaLabel,
        title,
        visible:
          !!(button.offsetWidth || button.offsetHeight || button.getClientRects().length) &&
          style.display !== "none" &&
          style.visibility !== "hidden",
        enabled: !button.disabled,
        boundingBox: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        region: rect.y < asideCenterY ? "header" : "footer",
      });
    }
    let localStorageCollapsed = null;
    try {
      const raw = window.localStorage.getItem("at_sidebar_collapsed");
      localStorageCollapsed = raw === null ? null : raw === "1";
    } catch {
      localStorageCollapsed = null;
    }
    let storeCollapsed = null;
    try {
      const appEl = document.querySelector("#app");
      const vueApp = appEl && appEl.__vue_app__;
      const pinia =
        vueApp && vueApp.config && vueApp.config.globalProperties && vueApp.config.globalProperties.$pinia;
      const ui = pinia && pinia._s && pinia._s.get("ui");
      if (ui) {
        const value = ui.sidebarCollapsed;
        storeCollapsed =
          typeof value === "boolean"
            ? value
            : value && typeof value === "object" && "value" in value
              ? value.value
              : null;
      }
    } catch {
      storeCollapsed = null;
    }
    return {
      route: sanitizeDiagnosticRoute(window.location.pathname),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      sidebarClass: aside ? aside.className : null,
      collapsed: aside ? /lg:w-24/.test(aside.className) : null,
      localStorageCollapsed,
      storeCollapsed,
      buttons,
    };
  });
}

async function captureSidebarLabel(page, label) {
  const snapshot = await readSidebarSnapshot(page);
  return { label, ...snapshot };
}

async function captureSidebarFailureTimeline(page) {
  const timeline = [];
  const push = async (nextLabel) => {
    timeline.push(await captureSidebarLabel(page, nextLabel));
  };
  await push("failure-immediate");
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await push("failure-after-raf");
  await page.waitForTimeout(10);
  await push("failure-after-10ms");
  await page.waitForTimeout(100);
  await push("failure-after-100ms");
  await page.waitForTimeout(300);
  await push("failure-after-300ms");
  await page.waitForTimeout(1000);
  await push("failure-after-1000ms");
  return timeline;
}

function classifyDiagnosticMessage(message) {
  const value = String(message || "").toLowerCase();
  if (/err_connection|err_name_not_resolved|err_ssl|err_internet_disconnected/.test(value)) {
    return "network-connectivity";
  }
  if (/timeout|timed out/.test(value)) return "timeout";
  if (/failed to fetch|networkerror|network error/.test(value)) return "network-fetch";
  if (/typeerror/.test(value)) return "type-error";
  if (/syntaxerror/.test(value)) return "syntax-error";
  if (/referenceerror/.test(value)) return "reference-error";
  return "runtime-error";
}

function sanitizeDiagnosticPath(value) {
  const match = String(value || "").match(/\/(?:api|at|assets|files|favicon\.ico)(?:\/[^\s?#()]*)?/i);
  if (!match) return null;

  const safeSegments = new Set(["api", "at", "assets", "files", "favicon.ico"]);
  return match[0]
    .split(/[?#]/, 1)[0]
    .split("/")
    .map((segment) => (safeSegments.has(segment.toLowerCase()) ? segment : segment ? "[redacted]" : ""))
    .join("/");
}

function sanitizeConsoleErrors(errors) {
  return errors.map((message) => ({ category: "console-error", messageClass: classifyDiagnosticMessage(message) }));
}

function sanitizePageErrors(errors) {
  return errors.map((message) => ({ category: "page-error", messageClass: classifyDiagnosticMessage(message) }));
}

function sanitizeFailedRequests(requests) {
  return requests.map((request) => {
    const value = String(request || "");
    const resourceType = value.split(/\s+/, 1)[0] || "unknown";
    const status = /\b(?:401|403|404|429|5\d\d)\b/.test(value) ? "http-error" : "network-error";
    return {
      category: "request-failure",
      resourceType,
      status,
      networkError: classifyDiagnosticMessage(value),
      pathname: sanitizeDiagnosticPath(value),
    };
  });
}

async function attachSidebarFailureDiagnostics(page, testInfo, options) {
  const {
    beforeClick,
    immediateAfterClick,
    baseline,
    consoleErrors,
    pageErrors,
    failedRequests,
    assertionError,
  } = options;
  const timeline = await captureSidebarFailureTimeline(page);
  const newConsoleErrors = consoleErrors.slice(baseline.consoleErrorCount);
  const newPageErrors = pageErrors.slice(baseline.pageErrorCount);
  const newFailedRequests = failedRequests.slice(baseline.requestFailureCount);
  const assertionType = /toHaveClass/.test(String(assertionError || ""))
    ? "aside-class"
    : "expand-button-visibility";
  const observedState = {
    collapsed: Boolean(immediateAfterClick.collapsed),
    expandButtonVisible: immediateAfterClick.buttons.some(
      (button) => button.visible && /Menüyü genişlet|Expand menu/.test(`${button.ariaLabel} ${button.title}`),
    ),
  };
  const expected = assertionType === "aside-class"
    ? { sidebarClass: "lg:w-24" }
    : { expandButtonVisible: true };
  const expectedLabel = assertionType === "aside-class" ? "lg:w-24" : "Menüyü genişlet";
  const found = assertionType === "aside-class" ? observedState.collapsed : observedState.expandButtonVisible;
  const diagnostics = {
    test: "sidebar-collapse-expand",
    route: beforeClick.route,
    viewport: beforeClick.viewport,
    beforeClick,
    immediateAfterClick,
    timeline,
    failure: {
      assertion: assertionType,
      assertionEvidence: {
        type: assertionType,
        locator: "aside and localized desktop expand button",
        expected,
        observed: observedState,
        errorCategory: classifyDiagnosticMessage(assertionError),
      },
      expectedLabel,
      found,
      assertionClass: classifyDiagnosticMessage(assertionError),
      consoleErrorCount: newConsoleErrors.length,
      consoleErrors: sanitizeConsoleErrors(newConsoleErrors),
      pageErrorCount: newPageErrors.length,
      pageErrors: sanitizePageErrors(newPageErrors),
      requestFailureCount: newFailedRequests.length,
      failedRequests: sanitizeFailedRequests(newFailedRequests),
    },
  };
  const json = JSON.stringify(diagnostics, null, 2);
  const outPath = testInfo.outputPath("sidebar-collapse-diagnostics.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, json, "utf8");
  await testInfo.attach("sidebar-collapse-diagnostics", {
    body: json,
    contentType: "application/json",
  });

  // Keep the layout evidence while removing authenticated user, branch, and
  // business text before the image is written to the test artifact.
  const redactedSidebar = await page.evaluate(() => {
    const sidebar = document.querySelector("aside");
    if (!sidebar) return null;

    const clone = sidebar.cloneNode(true);
    clone.id = "sidebar-collapse-diagnostics-redacted";
    const safeGeometryAttributes = new Set([
      "class",
      "d",
      "viewBox",
      "width",
      "height",
      "fill",
      "fill-rule",
      "stroke",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-width",
      "points",
      "cx",
      "cy",
      "r",
      "x",
      "x1",
      "x2",
      "y",
      "y1",
      "y2",
    ]);
    const scrubAttributes = (element) => {
      for (const attribute of element.getAttributeNames()) {
        if (!safeGeometryAttributes.has(attribute)) element.removeAttribute(attribute);
      }
    };
    scrubAttributes(clone);
    for (const element of clone.querySelectorAll("*")) scrubAttributes(element);
    clone.id = "sidebar-collapse-diagnostics-redacted";
    clone.style.position = "fixed";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.zIndex = "2147483647";
    clone.style.height = `${Math.min(window.innerHeight, sidebar.getBoundingClientRect().height)}px`;
    clone.style.maxHeight = `${window.innerHeight}px`;
    clone.style.pointerEvents = "none";

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      if (node.textContent?.trim()) node.textContent = "REDACTED";
    }
    const redactionStyle = document.createElement("style");
    redactionStyle.textContent =
      "*, *::before, *::after { background-image: none !important; content: none !important; }";
    clone.prepend(redactionStyle);

    document.body.appendChild(clone);
    return clone.id;
  });
  if (redactedSidebar) {
    try {
      await page.locator(`#${redactedSidebar}`).screenshot({
        path: testInfo.outputPath("sidebar-collapse-failure.png"),
      });
    } finally {
      await page.evaluate((id) => document.getElementById(id)?.remove(), redactedSidebar);
    }
  }
}

test.describe("Acentem Takipte smoke", () => {
  test("dashboard -> offers -> policies navigation", async ({ page }) => {
    test.setTimeout(90000);
    await ensureAuthenticated(page);

    const sessionResponse = await callGetMethod(page, "frappe.auth.get_logged_user");
    const sessionPayload = await readMethodPayload(sessionResponse);

    expect(sessionResponse.ok).toBeTruthy();
    expect(sessionPayload?.message).not.toBe("Guest");

    await page.goto("/at/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: /Offers|Teklif/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Policies|Poliçe/i }).first()).toBeVisible();
    await page.waitForTimeout(1000);

    await page.getByRole("link", { name: /Offers|Teklif/i }).first().click();
    await expect(page).toHaveURL(/\/at\/offers/);
    await expect(page.getByRole("heading", { name: /Offer|Teklif/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /Policies|Poliçe/i }).first().click();
    await expect(page).toHaveURL(/\/at\/policies/);
    await expect(page.getByRole("heading", { name: /Policy Workbench|Poliçe/i }).first()).toBeVisible();
  });

  test("authenticated smoke: comprehensive sidebar navigation", async ({ page }, testInfo) => {
    // Each route performs one real full SPA boot (the shared /at/ reload between
    // links was removed as redundant). Headless Chromium plus the single-threaded
    // dev server still make each boot ~7-10s on this machine, so the budget is
    // set to the real boot cost. No skips, retries, or error suppression.
    test.setTimeout(420000); // 7 minutes
    await ensureAuthenticated(page);

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    const onConsole = (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
    };
    const onPageError = (err) => pageErrors.push(String(err).slice(0, 300));
    const onFailed = (req) => {
      if (!["xhr", "fetch"].includes(req.resourceType())) return;
      const failure = req.failure?.() || null;
      const errorText = failure?.errorText || "";
      // Navigating away from a route cancels in-flight SPA fetches (dashboard
      // widgets etc.). Those are browser-cancelled requests, not server
      // failures, and must not fail the smoke. Real network errors
      // (ERR_CONNECTION_*, ERR_NAME_NOT_RESOLVED, ERR_SSL_*, ...) still fail.
      if (errorText === "net::ERR_ABORTED") return;
      failedRequests.push(`${req.resourceType()} ${req.url().slice(-80)} (${errorText})`);
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("requestfailed", onFailed);

    const links = [
      { label: "dashboard", href: "/at/", url: /\/at\/$/ },
      { label: "leads", href: "/at/leads", url: /\/at\/leads/ },
      { label: "offers", href: "/at/offers", url: /\/at\/offers/ },
      { label: "policies", href: "/at/policies", url: /\/at\/policies/ },
      { label: "customers", href: "/at/customers", url: /\/at\/customers/ },
      { label: "customer-search", href: "/at/customer-search", url: /\/at\/customer-search/ },
      { label: "claims", href: "/at/claims", url: /\/at\/claims/ },
      { label: "payments", href: "/at/payments", url: /\/at\/payments/ },
      { label: "renewals", href: "/at/renewals", url: /\/at\/renewals/ },
      { label: "reconciliation", href: "/at/reconciliation", url: /\/at\/reconciliation/ },
      { label: "documents", href: "/at/documents", url: /\/at\/documents/ },
      { label: "reports", href: "/at/reports", url: /\/at\/reports/ },
      { label: "data-import", href: "/at/data-import", url: /\/at\/data-import/ },
      { label: "data-export", href: "/at/data-export", url: /\/at\/data-export/ },
      { label: "communication", href: "/at/communication", url: /\/at\/communication/ },
      { label: "tasks", href: "/at/tasks", url: /\/at\/tasks/ },
      { label: "notification-drafts", href: "/at/notification-drafts", url: /\/at\/notification-drafts/ },
      { label: "notification-outbox", href: "/at/notification-outbox", url: /\/at\/notification-outbox/ },
      { label: "insurance-companies", href: "/at/insurance-companies", url: /\/at\/insurance-companies/ },
      { label: "branches", href: "/at/branches", url: /\/at\/branches/ },
      { label: "office-branches", href: "/at/office-branches", url: /\/at\/office-branches/ },
      { label: "sales-entities", href: "/at/sales-entities", url: /\/at\/sales-entities/ },
      { label: "notification-templates", href: "/at/notification-templates", url: /\/at\/notification-templates/ },
      { label: "accounting-entries", href: "/at/accounting-entries", url: /\/at\/accounting-entries/ },
      { label: "reconciliation-items", href: "/at/reconciliation-items", url: /\/at\/reconciliation-items/ },
    ];

    for (const link of links) {
      console.log(`Checking link: ${link.label}`);
      await page.goto(link.href, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(link.url, { timeout: 20000 });
      await expect(page.locator("#app, .page-shell, .at-shell-main").first()).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(200);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    const criticalFailures = failedRequests.filter(
      (f) => !/favicon|\.png|\.svg|\.woff2?/.test(f)
    );
    expect(criticalFailures).toEqual([]);

    // Sidebar collapse/expand + reload persistence (desktop)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/at/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('button[aria-label="Menüyü daralt"]').first()).toBeVisible();
    const beforeClick = await captureSidebarLabel(page, "before-click");
    const diagnosticsBaseline = {
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      requestFailureCount: failedRequests.length,
    };
    await page.locator('button[aria-label="Menüyü daralt"]').first().click();
    const immediateAfterClick = await captureSidebarLabel(page, "immediate-after-click");
    try {
      await expect(page.locator("aside").first()).toHaveClass(/lg:w-24/);
      await expect(page.locator('button[aria-label="Menüyü genişlet"]').first()).toBeVisible();
    } catch (error) {
      await attachSidebarFailureDiagnostics(page, testInfo, {
        beforeClick,
        immediateAfterClick,
        baseline: diagnosticsBaseline,
        consoleErrors,
        pageErrors,
        failedRequests,
        assertionError: error?.message || String(error),
      });
      throw error;
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("aside").first()).toHaveClass(/lg:w-24/);
    await expect(page.locator('button[aria-label="Menüyü genişlet"]').first()).toBeVisible();
    await page.locator('button[aria-label="Menüyü genişlet"]').first().click();
    await expect(page.locator("aside").first()).toHaveClass(/lg:w-\[220px\]/);

    // Mobile drawer behavior: off-canvas by default, opens via menu button,
    // closes on navigation.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const aside = page.locator("aside").first();
    await expect(aside).toHaveClass(/-translate-x-full/);
    await page.getByRole("button", { name: /Menü|Menu/i }).first().click();
    await expect(aside).toHaveClass(/translate-x-0/);
    await page.goto("/at/payments", { waitUntil: "domcontentloaded" });
    await expect(aside).toHaveClass(/-translate-x-full/);
  });

  test("authenticated shell controls: profile, scope, locale, and responsive drawer", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/at/", { waitUntil: "domcontentloaded" });

    const aside = page.locator("aside").first();
    await expect(aside.getByText("Acentem Takipte", { exact: true })).toBeVisible();

    const collapseToggle = aside.locator(
      'button[aria-label="Menüyü daralt"], button[aria-label="Collapse menu"]',
    );
    await expect(collapseToggle).toHaveCount(1);
    await expect(aside.locator("footer button[aria-label*='Menü'], footer button[aria-label*='menu']")).toHaveCount(0);

    await collapseToggle.click();
    await expect(aside).toHaveClass(/lg:w-24/);
    await expect(aside.locator('[data-testid="sidebar-brand-monogram"]')).toHaveText("AT");
    const iconLinks = aside.locator("nav a");
    await expect(iconLinks).not.toHaveCount(0);
    expect(await iconLinks.evaluateAll((links) => links.every((link) => Boolean(link.getAttribute("title"))))).toBe(true);

    const profileTrigger = page.getByTestId("sidebar-profile-trigger");
    await expect(profileTrigger).toHaveAttribute("aria-haspopup", "menu");
    await expect(profileTrigger).toHaveAttribute("aria-expanded", "false");
    await profileTrigger.click();
    const profileMenu = page.getByRole("menu");
    await expect(profileMenu).toBeVisible();
    await expect(profileTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('[role="menuitem"]').first()).toBeFocused();
    const profileSummary = profileMenu.locator("p");
    await expect(profileSummary).toHaveCount(3);
    expect((await profileSummary.allTextContents()).every((text) => text.trim().length > 0)).toBe(true);
    await expect(profileMenu.getByTestId("profile-mobile-language")).toHaveCount(0);
    await expect(profileMenu.getByRole("menuitem", { name: /Hesabım|My Account/ })).toBeVisible();
    await expect(profileMenu.getByRole("menuitem", { name: /Desk'i Aç|Open Desk/ })).toBeVisible();
    await expect(profileMenu.getByRole("menuitem", { name: /Çıkış Yap|Logout/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(profileMenu).toBeHidden();
    await expect(profileTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(profileTrigger).toBeFocused();
    await profileTrigger.click();
    await expect(profileMenu).toBeVisible();
    await page.locator("main").click({ position: { x: 12, y: 12 } });
    await expect(profileMenu).toBeHidden();
    await expect(profileTrigger).toHaveAttribute("aria-expanded", "false");

    const profileDestinations = [
      { path: "/me", label: /Hesabım|My Account/ },
      { path: "/desk", label: /Desk'i Aç|Open Desk/ },
    ];
    // These are shell-action checks only: the destinations are intercepted so
    // this smoke does not claim to validate the separate /me or /desk pages.
    for (const destination of profileDestinations) {
      await profileTrigger.click();
      await expect(profileMenu).toBeVisible();
      await page.route(`**${destination.path}`, (route) =>
        route.fulfill({ status: 200, contentType: "text/html", body: "shell destination" }),
      );
      await profileMenu.getByRole("menuitem", { name: destination.label }).click();
      await expect(page).toHaveURL(new RegExp(`${destination.path.replace("/", "\\/")}$`));
      await page.goto("/at/", { waitUntil: "domcontentloaded" });
      await page.unroute(`**${destination.path}`);
      await expect(aside).toBeVisible();
    }

    const routeBeforeLocaleChange = page.url();
    await profileTrigger.click();
    const desktopLanguageTrigger = page.getByTestId("topbar-language-trigger");
    await expect(desktopLanguageTrigger).toBeVisible();
    await desktopLanguageTrigger.click();
    await page.getByTestId("topbar-language-menu").getByRole("menuitem", { name: "English", exact: true }).click();
    await expect(page).toHaveURL(routeBeforeLocaleChange);
    await profileTrigger.click();
    await expect(page.getByRole("menu")).toBeVisible();

    const scopeTrigger = page.getByTestId("branch-scope-trigger");
    await expect(scopeTrigger).toBeVisible();
    if (await scopeTrigger.isDisabled()) {
      await expect(scopeTrigger).not.toHaveAttribute("aria-haspopup");
      await expect(scopeTrigger).toHaveAttribute("aria-expanded", "false");
      await expect(scopeTrigger).toBeDisabled();
      await expect(page.getByTestId("branch-scope-lock-status")).toBeVisible();
    } else {
      await expect(scopeTrigger).toHaveAttribute("aria-haspopup", "listbox");
      await expect(scopeTrigger).toHaveAttribute("aria-expanded", "false");
      await expect(scopeTrigger).not.toHaveAttribute("aria-controls");
      await scopeTrigger.click();
      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();
      await expect(scopeTrigger).toHaveAttribute("aria-expanded", "true");
      const listboxId = await listbox.getAttribute("id");
      expect(listboxId).toBeTruthy();
      await expect(scopeTrigger).toHaveAttribute("aria-controls", listboxId);
      await expect(listbox).toHaveAttribute("aria-label", /Scope|Kapsam/);
      await expect(page.getByTestId("branch-search-input")).toBeVisible();
      const branchOptions = page.locator('[role="option"]');
      const branchOptionCount = await branchOptions.count();
      if (branchOptionCount > 0) {
        const selectedBefore = page.locator('[role="option"][aria-selected="true"]');
        await expect(selectedBefore).toHaveCount(1);
        const selectedValueBefore = await selectedBefore.getAttribute("data-testid");
        const selectedLabelBefore = await scopeTrigger.locator("span[title]").last().getAttribute("title");
        const alternatives = page.locator('[role="option"][aria-selected="false"]');
        const alternativeCount = await alternatives.count();
        const allBranchesOption = page.getByTestId("branch-option-all");
        if (await allBranchesOption.count()) {
          await expect(allBranchesOption).toContainText(/Tüm Şubeler|All Branches/);
        }
        if (alternativeCount > 0) {
          await alternatives.first().click();
          await expect(listbox).toBeHidden();
          await expect(scopeTrigger).toHaveAttribute("aria-expanded", "false");
          await scopeTrigger.click();
          await expect(listbox).toBeVisible();
          const selectedAfter = page.locator('[role="option"][aria-selected="true"]');
          await expect(selectedAfter).toHaveCount(1);
          expect(await selectedAfter.getAttribute("data-testid")).not.toBe(selectedValueBefore);
          expect(await scopeTrigger.locator("span[title]").last().getAttribute("title")).not.toBe(selectedLabelBefore);
        } else {
          expect(alternativeCount).toBe(0);
        }
        const activeDescendant = await scopeTrigger.getAttribute("aria-activedescendant");
        if (await branchOptions.count()) {
          expect(activeDescendant).toBeTruthy();
          await expect(page.locator(`#${activeDescendant}`)).toHaveAttribute("role", "option");
        } else {
          expect(activeDescendant).toBeNull();
        }
        await page.keyboard.press("Escape");
        await expect(listbox).toBeHidden();
        await expect(scopeTrigger).toHaveAttribute("aria-expanded", "false");
        await expect(scopeTrigger).toBeFocused();
      } else {
        expect(await scopeTrigger.getAttribute("aria-activedescendant")).toBeNull();
        await page.keyboard.press("Escape");
        await expect(listbox).toBeHidden();
        await expect(scopeTrigger).toHaveAttribute("aria-expanded", "false");
        await expect(scopeTrigger).toBeFocused();
      }
    }

    await page.setViewportSize({ width: 768, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(aside).toHaveClass(/-translate-x-full/);
    await expect(page.getByRole("button", { name: /Menu|Menü/i }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
    await page.getByRole("button", { name: /Menu|Menü/i }).first().click();
    await expect(aside).toHaveClass(/translate-x-0/);
    await expect(aside.getByText("Acentem Takipte", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(aside).toHaveClass(/-translate-x-full/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    const menuButton = page.getByRole("button", { name: /Menu|Menü/i }).first();
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(aside).toHaveClass(/translate-x-0/);
    const desktopSidebarToggle = aside.locator(
      'button[aria-label="Menüyü daralt"], button[aria-label="Collapse menu"], button[aria-label="Menüyü genişlet"], button[aria-label="Expand menu"]',
    );
    await expect(desktopSidebarToggle).toHaveCount(1);
    await expect(desktopSidebarToggle).toBeHidden();
    await expect(aside.getByText("Acentem Takipte", { exact: true })).toBeVisible();
    await expect(aside.locator('[data-testid="sidebar-brand-monogram"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const closeDrawerButton = aside.locator('button[title="Kapat"], button[title="Close"]');
    await expect(closeDrawerButton).toHaveCount(1);
    await expect(closeDrawerButton).toHaveAttribute("title", /Kapat|Close/);
    await expect(closeDrawerButton).toHaveAccessibleName("X");
    await closeDrawerButton.focus();
    await expect(closeDrawerButton).toBeFocused();

    await profileTrigger.click();
    await expect(profileMenu).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.keyboard.press("Escape");
    await expect(profileMenu).toBeHidden();
    await expect(profileTrigger).toBeFocused();

    if (!await scopeTrigger.isDisabled()) {
      await expect(scopeTrigger).toHaveAttribute("aria-haspopup", "listbox");
      await expect(scopeTrigger).toHaveAttribute("aria-expanded", "false");
      await expect(scopeTrigger).not.toHaveAttribute("aria-controls");
      await scopeTrigger.click();
      const mobileListbox = page.getByRole("listbox");
      await expect(mobileListbox).toBeVisible();
      await expect(scopeTrigger).toHaveAttribute("aria-expanded", "true");
      const mobileListboxId = await mobileListbox.getAttribute("id");
      expect(mobileListboxId).toBeTruthy();
      await expect(scopeTrigger).toHaveAttribute("aria-controls", mobileListboxId);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await page.keyboard.press("Escape");
      await expect(mobileListbox).toBeHidden();
      await expect(scopeTrigger).toHaveAttribute("aria-expanded", "false");
      await expect(scopeTrigger).toBeFocused();
    }

    await closeDrawerButton.click();
    await expect(aside).toHaveClass(/-translate-x-full/);

    // The existing platform smoke performs the real logout POST and anonymous
    // auth-boundary check. Mock this UI request here to verify the menu action
    // and redirect without invalidating the authenticated fixture for later tests.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await profileTrigger.click();
    let logoutRequest = null;
    await page.route("**/api/method/logout", async (route) => {
      logoutRequest = route.request();
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"message":"ok"}' });
    });
    await profileMenu.getByRole("menuitem", { name: /Logout|Çıkış Yap/ }).click();
    await expect(page).toHaveURL(/\/login\?redirect-to=\/at$/);
    expect(logoutRequest?.method()).toBe("POST");
  });

  test("mobile profile menu exposes the segmented language control", async ({ page }) => {
    await ensureAuthenticated(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/at/", { waitUntil: "domcontentloaded" });

    const aside = page.locator("aside").first();
    await page.getByRole("button", { name: /Menü|Menu/i }).first().click();
    await expect(aside).toHaveClass(/translate-x-0/);

    const profileTrigger = page.getByTestId("sidebar-profile-trigger");
    await profileTrigger.click();
    const profileMenu = page.getByRole("menu");
    const mobileLanguage = page.getByTestId("profile-mobile-language");

    await expect(profileMenu).toBeVisible();
    await expect(mobileLanguage).toBeVisible();
    await expect(mobileLanguage.getByRole("menuitem", { name: "Türkçe", exact: true })).toBeVisible();
    await expect(mobileLanguage.getByRole("menuitem", { name: "English", exact: true })).toBeVisible();
  });

  test("anonim smoke: /at route ve session endpoint auth duvari", async ({ page, context }) => {
    await context.clearCookies();

    await page.goto("/at/");
    const isLoginHeadingVisible = await page
      .getByRole("heading", { name: /Login to Frappe/i })
      .isVisible()
      .catch(() => false);
    const atRouteRedirectedToLogin = page.url().includes("/login");
    expect(isLoginHeadingVisible || atRouteRedirectedToLogin).toBeTruthy();

    const sessionContextResponse = await callGetMethod(
      page,
      "acentem_takipte.acentem_takipte.platform.api.session.get_session_context"
    );
    const sessionContextPayload = await readMethodPayload(sessionContextResponse);

    const sessionMessage = String(
      sessionContextPayload?.message || sessionContextPayload?.exc || sessionContextPayload?.exc_type || ""
    ).toLowerCase();
    if (sessionContextResponse.ok) {
      expect(sessionMessage).toContain("authentication");
    } else {
      expect(sessionContextResponse.status).toBeGreaterThanOrEqual(400);
      expect(Boolean(sessionMessage)).toBeTruthy();
    }

    const sessionUserResponse = await callGetMethod(page, "frappe.auth.get_logged_user");
    const sessionUserPayload = await readMethodPayload(sessionUserResponse);
    const sessionUserMessage = String(
      sessionUserPayload?.message || sessionUserPayload?.exc || sessionUserPayload?.exc_type || ""
    ).toLowerCase();

    if (sessionUserResponse.ok) {
      expect(sessionUserPayload?.message).toBe("Guest");
    } else {
      expect(sessionUserResponse.status).toBeGreaterThanOrEqual(400);
      expect(Boolean(sessionUserMessage)).toBeTruthy();
    }
  });

  test("authenticated smoke: reports page + session context + scheduled report access policy", async ({ page }) => {
    await ensureAuthenticated(page);

    const sessionContextResponse = await callGetMethod(
      page,
      "acentem_takipte.acentem_takipte.platform.api.session.get_session_context"
    );
    const policyResponse = await callGetMethod(
      page,
      "acentem_takipte.acentem_takipte.domains.reports.api.endpoints.get_policy_list_report"
    );
    const scheduledResponse = await callGetMethod(
      page,
      "acentem_takipte.acentem_takipte.domains.reports.api.endpoints.get_scheduled_report_configs"
    );

    const sessionPayload = await readMethodPayload(sessionContextResponse);
    const policyPayload = await readMethodPayload(policyResponse);
    expect(sessionContextResponse.ok).toBeTruthy();
    expect(sessionPayload?.message?.user).toBeTruthy();

    expect(policyResponse.ok).toBeTruthy();
    expect(policyPayload?.message?.report_key).toBe("policy_list");

    await page.goto("/at/reports", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Raporlar|Reports/i }).first()).toBeVisible({ timeout: 30000 });

    const userRoles = (Array.isArray(sessionPayload?.message?.roles) ? sessionPayload.message.roles : []).map(
      (role) => String(role || "").toLowerCase()
    );
    const isSystemManager = userRoles.includes("system manager") || userRoles.includes("administrator");
    
    const scheduledTitle = page.getByText(/Scheduled Reports|Zamanlanm/i);

    if (isSystemManager) {
      expect(scheduledResponse.ok).toBeTruthy();
      await expect(scheduledTitle.first()).toBeVisible({ timeout: 15000 });
    } else {
      expect(scheduledResponse.ok).toBeFalsy();
      await expect(scheduledTitle).toHaveCount(0);
    }
  });

  test("authenticated smoke: customer segment snapshot job endpoint is gated by admin job permissions", async ({ page }) => {
    await ensureAuthenticated(page);

    const sessionContextResponse = await callGetMethod(
      page,
      "acentem_takipte.acentem_takipte.platform.api.session.get_session_context"
    );
    const sessionPayload = await readMethodPayload(sessionContextResponse);
    const userRoles = (Array.isArray(sessionPayload?.message?.roles) ? sessionPayload.message.roles : []).map(
      (role) => String(role || "").toLowerCase()
    );
    const hasAdminJobRole = ["system manager", "manager", "accountant"].some((roleName) =>
      userRoles.includes(roleName)
    );

    const snapshotResponse = await callPostMethod(
      page,
      "acentem_takipte.acentem_takipte.domains.admin.api.jobs.run_customer_segment_snapshot_job",
      { limit: 250 }
    );

    if (hasAdminJobRole) {
      expect(snapshotResponse.ok).toBeTruthy();
    } else {
      expect(snapshotResponse.ok).toBeFalsy();
    }
  });

  test("customer segment snapshot admin job rejects GET requests", async ({ page }) => {
    await ensureAuthenticated(page);

    const response = await callGetMethod(
      page,
      "acentem_takipte.acentem_takipte.domains.admin.api.jobs.run_customer_segment_snapshot_job"
    );
    expect(response.ok).toBeFalsy();
  });

  test("platform smoke: security headers are present", async ({ page, request }) => {
    await ensureAuthenticated(page);

    const response = await request.get("/at/");
    expect(response.status()).toBeLessThan(500);
    const headers = response.headers();
    expect(headers["strict-transport-security"]).toBeTruthy();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["content-security-policy"]).toBeTruthy();
  });

  test("platform smoke: logout endpoint and anonymous session boundary", async ({ page, browser }) => {
    await ensureAuthenticated(page);

    const before = await callGetMethod(page, "frappe.auth.get_logged_user");
    expect(before.status).toBe(200);
    expect(before.json?.message).not.toBe("Guest");

    const logout = await callPostMethod(page, "logout");
    expect(logout.status).toBeGreaterThanOrEqual(200);
    expect(logout.status).toBeLessThan(300);

    const anonContext = await browser.newContext();
    const anonResp = await anonContext.request.get("/api/method/frappe.auth.get_logged_user");
    // `get_logged_user` is an authenticated endpoint: an anonymous context must
    // be rejected (401/403), proving the fresh context has no session. The SPA
    // must also land on the auth wall (login redirect) for anonymous visitors.
    expect(anonResp.status()).toBeGreaterThanOrEqual(401);
    const anonPage = await anonContext.newPage();
    await anonPage.goto("/at/");
    const loginWallVisible = await anonPage
      .getByRole("heading", { name: /Login to Frappe/i })
      .isVisible()
      .catch(() => false);
    const redirectedToLogin = anonPage.url().includes("/login");
    expect(loginWallVisible || redirectedToLogin).toBeTruthy();
    await anonContext.close();

    await ensureAuthenticated(page);
    const afterLogin = await callGetMethod(page, "frappe.auth.get_logged_user");
    expect(afterLogin.status).toBe(200);
    expect(afterLogin.json?.message).not.toBe("Guest");
  });
});
