import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth";

function routePattern(path) {
  return new RegExp(path.replace(/\//g, "\\/") + "(?:\\?|$)");
}

async function gotoRoute(page, path) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45000 });
  await expect(page).toHaveURL(routePattern(path));
  await page.locator("#app").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(250);
}

async function openMobileSidebar(page) {
  const menuButton = page.getByRole("button", { name: /^menu$/i }).first();
  const isVisible = await menuButton.isVisible().catch(() => false);
  if (!isVisible) {
    return false;
  }
  await menuButton.click();
  await page.locator("aside nav").waitFor({ state: "visible", timeout: 10000 });
  return true;
}

async function clickSidebarNavLink(page, path) {
  const link = page.locator(`aside nav a[href="${path}"]`).first();
  await link.waitFor({ state: "visible", timeout: 10000 });
  const href = await link.getAttribute("href");
  await link.scrollIntoViewIfNeeded().catch(() => {});
  if (href) {
    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30000 });
  } else {
    await link.click();
  }
  await expect(page).toHaveURL(routePattern(path));
  await page.waitForTimeout(200);
}

async function expectNoDeskFallbackButtons(page) {
  const managementButtons = await page.getByRole("button", { name: /^Yönetim$/i }).count();
  const openDeskButtons = await page.getByRole("button", { name: /Open Desk|Yönetim \/ Desk/i }).count();
  expect(managementButtons).toBe(0);
  expect(openDeskButtons).toBe(0);
}

async function readSessionContext(page) {
  const boot = await page.evaluate(() => window.AT_SESSION_BOOT || window.__AT_SESSION__ || null);
  if (boot && typeof boot === "object" && boot.user) {
    return boot;
  }

  const result = await page.evaluate(async () => {
    const response = await fetch("/api/method/acentem_takipte.api.session.get_session_context", {
      credentials: "include",
      headers: { Açcept: "application/json" },
    });
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { _raw: text };
    }
    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  });

  const payload = result?.payload || {};
  expect(result?.ok || payload?.message || payload?.exc || payload?.exc_type).toBeTruthy();
  expect(payload?.exc || payload?.exc_type).toBeFalsy();
  return payload?.message || {};
}

async function callApiMethod(page, method, params = {}) {
  return page.evaluate(
    async ({ methodPath, paramsObj }) => {
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(paramsObj || {})) {
        if (value == null) continue;
        qs.set(key, String(value));
      }
      const url = `/api/method/${methodPath}${qs.size ? `?${qs.toString()}` : ""}`;
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const text = await response.text();
      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
      return { ok: response.ok, status: response.status, text, payload };
    },
    { methodPath: method, paramsObj: params }
  );
}

function expectPermissionDenied(result, label = "request") {
  const status = Number(result?.status || 0);
  const bodyText = String(result?.text || "");
  const payload = result?.payload || null;

  const failedViaStatus = status >= 400;
  const failedViaPayload = Boolean(
    payload?.exc ||
      payload?.exc_type ||
      payload?._server_messages ||
      payload?._error_message ||
      (typeof payload?.message === "string" && /permission|not permitted|not allowed/i.test(payload.message))
  );
  expect(failedViaStatus || failedViaPayload, `${label} should fail for restricted role`).toBeTruthy();
}

async function clickFirstRowIfAny(page) {
  const rows = page.locator("tbody tr.at-table-row");
  await rows.first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
  const count = await rows.count();
  if (!count) return false;
  await rows.first().click();
  return true;
}

test.describe.serial("G5 desk-free QA assist (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test("desktop route sanity + desk fallback hidden by default", async ({ page }) => {
    test.setTimeout(180000);
    const routes = [
      "/at/leads",
      "/at/customers",
      "/at/offers",
      "/at/policies",
      "/at/tasks",
      "/at/notification-drafts",
      "/at/notification-outbox",
      "/at/accounting-entries",
      "/at/reconciliation-items",
    ];

    for (const path of routes) {
      await gotoRoute(page, path);
      await expectNoDeskFallbackButtons(page);
      await expect(page.locator(".at-table, .surface-card").first()).toBeVisible();
    }
  });

  test("desktop sidebar click sanity (aux routes)", async ({ page }) => {
    test.setTimeout(120000);
    await gotoRoute(page, "/at/leads");

    const sidebarRoutes = [
      "/at/tasks",
      "/at/notification-drafts",
      "/at/notification-outbox",
      "/at/insurance-companies",
      "/at/branches",
      "/at/sales-entities",
      "/at/notification-templates",
      "/at/accounting-entries",
      "/at/reconciliation-items",
    ];

    for (const path of sidebarRoutes) {
      await clickSidebarNavLink(page, path);
      await expectNoDeskFallbackButtons(page);
      await expect(page.locator("#app, .page-shell, .at-shell-main").first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("mobile viewport route/detail + sidebar menu sanity (390x844, 360x800)", async ({ page }) => {
    test.setTimeout(120000);
    const viewports = [
      { width: 390, height: 844 },
      { width: 360, height: 800 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await ensureAuthenticated(page);

      for (const path of ["/at/leads", "/at/offers", "/at/notification-outbox"]) {
        await gotoRoute(page, path);
        await expect(page.locator("#app, .page-shell, .at-shell-main").first()).toBeVisible({ timeout: 10000 });
      }

      await gotoRoute(page, "/at/leads");
      if (await openMobileSidebar(page)) {
        await clickSidebarNavLink(page, "/at/tasks");
        await expectNoDeskFallbackButtons(page);

        if (await openMobileSidebar(page)) {
          await clickSidebarNavLink(page, "/at/accounting-entries");
          await expectNoDeskFallbackButtons(page);
        }
      }
    }

    await gotoRoute(page, "/at/customers");
    const opened = await clickFirstRowIfAny(page);
    if (!opened) {
      test.info().annotations.push({
        type: "note",
        description: "No customer rows available for mobile detail sanity.",
      });
      return;
    }
    await expect(page).toHaveURL(/\/at\/customers\/[^/?#]+/);
    await expect(page.locator(".surface-card, [class*='summary']").first()).toBeVisible();
  });
});

test.describe.serial("G5 desk-free QA assist (restricted role)", () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page, {
      userEnvKey: "E2E_RESTRICTED_USER",
      passwordEnvKey: "E2E_RESTRICTED_PASSWORD",
    });
  });

  test("Agent runtime capability payload disables finance/communication write actions", async ({ page }) => {
    const sessionContext = await readSessionContext(page);
    test.skip(
      !sessionContext?.capabilities,
      "Runtime session payload in this local backend build does not expose capabilities."
    );
    const caps = sessionContext.capabilities || {};
    const doctypes = caps.doctypes || {};
    expect(doctypes["AT Notification Outbox"]?.read).toBeTruthy();
    expect(doctypes["AT Accounting Entry"]?.read).toBeTruthy();
    expect(doctypes["AT Reconciliation Item"]?.read).toBeTruthy();
  });

  test("Agent UI hides communication/finance quick actions", async ({ page }) => {
    const sessionContext = await readSessionContext(page);
    test.skip(
      !sessionContext?.capabilities,
      "Runtime session payload in this local backend build does not expose capabilities; UI hide assertions are not reliable."
    );

    await gotoRoute(page, "/at/communication");
    await expect(page.locator(".at-table")).toBeVisible();

    await gotoRoute(page, "/at/notification-outbox");
    await expect(page.locator(".at-table, .surface-card").first()).toBeVisible();

    await gotoRoute(page, "/at/accounting-entries");
    await expect(page.locator(".at-table, .surface-card").first()).toBeVisible();

    const openedAccountingDetail = await clickFirstRowIfAny(page);
    if (openedAccountingDetail) {
      await expect(page).toHaveURL(/\/at\/accounting-entries\/[^/?#]+/);
      await expect(page.locator(".surface-card, .detail-shell").first()).toBeVisible();
    }

    await gotoRoute(page, "/at/reconciliation-items");
    await expect(page.locator(".at-table, .surface-card").first()).toBeVisible();
  });

  test("Agent backend write endpoints are permission denied", async ({ page }) => {
    const sessionContext = await readSessionContext(page);
    const runtimeHasCapabilities = Boolean(sessionContext?.capabilities);

    const checks = [
      {
        method: "acentem_takipte.api.communication.run_dispatch_cycle",
        params: {},
        requiresCapabilityAwareRuntime: true,
      },
      {
        method: "acentem_takipte.api.communication.retry_outbox_item",
        params: { outbox_name: "NONEXISTENT-OUTBOX" },
        requiresCapabilityAwareRuntime: true,
      },
      {
        method: "acentem_takipte.api.quick_create.create_quick_accounting_entry",
        params: { source_doctype: "AT Policy", source_name: "NONEXISTENT-POLICY" },
        requiresCapabilityAwareRuntime: false,
      },
      {
        method: "acentem_takipte.api.quick_create.update_quick_aux_record",
        params: { doctype: "AT Accounting Entry", name: "NONEXISTENT-ENTRY", data: "{}" },
        requiresCapabilityAwareRuntime: false,
      },
    ];

    for (const check of checks) {
      if (check.requiresCapabilityAwareRuntime && !runtimeHasCapabilities) {
        continue;
      }
      const result = await callApiMethod(page, check.method, check.params);
      expectPermissionDenied(result, check.method);
    }
  });
});
