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

test.describe("Acentem Takipte smoke", () => {
  test("dashboard -> offers -> policies navigation", async ({ page }) => {
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
    await expect(page.getByRole("heading", { name: /Offer Board|Teklif/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /Policies|Poliçe/i }).first().click();
    await expect(page).toHaveURL(/\/at\/policies/);
    await expect(page.getByRole("heading", { name: /Policy Workbench|Poliçe/i }).first()).toBeVisible();
  });

  test("authenticated smoke: comprehensive sidebar navigation", async ({ page }) => {
    test.setTimeout(300000); // 5 minutes
    await ensureAuthenticated(page);

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
      { label: "documents", href: "/at/at-documents", url: /\/at\/at-documents/ },
      { label: "reports", href: "/at/reports", url: /\/at\/reports/ },
      { label: "data-import", href: "/at/data-import", url: /\/at\/data-import/ },
      { label: "data-export", href: "/at/data-export", url: /\/at\/data-export/ },
      { label: "communication", href: "/at/communication", url: /\/at\/communication/ },
      { label: "tasks", href: "/at/tasks", url: /\/at\/tasks/ },
      { label: "notification-drafts", href: "/at/notification-drafts", url: /\/at\/notification-drafts/ },
      { label: "notification-outbox", href: "/at/notification-outbox", url: /\/at\/notification-outbox/ },
      { label: "insurance-companies", href: "/at/insurance-companies", url: /\/at\/insurance-companies/ },
      { label: "branches", href: "/at/branches", url: /\/at\/branches/ },
      { label: "sales-entities", href: "/at/sales-entities", url: /\/at\/sales-entities/ },
      { label: "notification-templates", href: "/at/notification-templates", url: /\/at\/notification-templates/ },
      { label: "break-glass", href: "/at/break-glass", url: /\/at\/break-glass/ },
      { label: "break-glass-approvals", href: "/at/break-glass/approvals", url: /\/at\/break-glass\/approvals/ },
      { label: "accounting-entries", href: "/at/accounting-entries", url: /\/at\/accounting-entries/ },
      { label: "reconciliation-items", href: "/at/reconciliation-items", url: /\/at\/reconciliation-items/ },
    ];

    for (const link of links) {
      console.log(`Checking link: ${link.label}`);
      await page.goto("/at/", { waitUntil: "domcontentloaded" });
      const locator = page.locator(`aside a[href='${link.href}']`).first();

      await expect(locator).toBeVisible({ timeout: 10000 });
      const href = await locator.getAttribute("href");
      expect(href).toBeTruthy();
      await locator.scrollIntoViewIfNeeded();
      await locator.click({ timeout: 15000 });
      if (!link.url.test(page.url()) && href) {
        await page.goto(href, { waitUntil: "domcontentloaded" });
      }
      await expect(page).toHaveURL(link.url, { timeout: 15000 });
      await page.waitForTimeout(300);
    }
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
      "acentem_takipte.acentem_takipte.api.session.get_session_context"
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
      "acentem_takipte.acentem_takipte.api.session.get_session_context"
    );
    const policyResponse = await callGetMethod(
      page,
      "acentem_takipte.acentem_takipte.api.reports.get_policy_list_report"
    );
    const scheduledResponse = await callGetMethod(
      page,
      "acentem_takipte.acentem_takipte.api.reports.get_scheduled_report_configs"
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
      "acentem_takipte.acentem_takipte.api.session.get_session_context"
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
      "acentem_takipte.acentem_takipte.api.admin_jobs.run_customer_segment_snapshot_job",
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
      "acentem_takipte.acentem_takipte.api.admin_jobs.run_customer_segment_snapshot_job"
    );
    expect(response.ok).toBeFalsy();
  });
});
