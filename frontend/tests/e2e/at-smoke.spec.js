import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

async function readMethodPayload(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function callPostMethod(page, method, params = {}) {
  const response = await page.request.post(`/api/method/${method}`, {
    form: params,
  });
  const text = await response.text().catch(() => "");
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  return { ok: response.ok(), status: response.status(), payload };
}

test.describe("Acentem Takipte smoke", () => {
  test("dashboard -> offers -> policies navigation", async ({ page }) => {
    await ensureAuthenticated(page);

    const sessionResponse = await page.request.get("/api/method/frappe.auth.get_logged_user");
    const sessionPayload = await readMethodPayload(sessionResponse);

    expect(sessionResponse.ok()).toBeTruthy();
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
    await page.goto("/at/");
    await page.waitForTimeout(2000);

    const links = [
      { name: /Pano|Dashboard/i, url: /\/at\/$/ },
      { name: /Fırsatlar|Leads/i, url: /\/at\/leads/ },
      { name: /Teklifler|Offers/i, url: /\/at\/offers/ },
      { name: /Poliçeler|Policies/i, url: /\/at\/policies/ },
      { name: /Müşteriler|Customers/i, url: /\/at\/customers/ },
      { name: /Müşteri Ara|Customer Search/i, url: /\/at\/customer-search/ },
      { name: /Hasarlar|Claims/i, url: /\/at\/claims/ },
      { name: /Ödemeler|Payments/i, url: /\/at\/payments/ },
      { name: /Yenilemeler|Renewals/i, url: /\/at\/renewals/ },
      { name: /Mutabakat|Reconciliation/i, url: /\/at\/reconciliation/ },
      { name: /Doküman Merkezi|Documents/i, url: /\/at\/at-documents/ },
      { name: /Raporlar|Reports/i, url: /\/at\/reports/ },
      { name: /Veri İçe Aktarma|Data Import/i, url: /\/at\/data-import/ },
      { name: /Veri Dışa Aktarma|Data Export/i, url: /\/at\/data-export/ },
      { name: /İletişim Merkezi|Communication/i, url: /\/at\/communication/ },
      { name: /Görevler|Tasks/i, url: /\/at\/tasks/ },
      { name: /Bildirim Taslakları|Notification Drafts/i, url: /\/at\/notification-drafts/ },
      { name: /Gönderilen Bildirimler|Notification Outbox/i, url: /\/at\/notification-outbox/ },
      { name: /Sigorta Şirketleri|Insurance Companies/i, url: /\/at\/insurance-companies/ },
      { name: /Şubeler|Branches/i, url: /\/at\/branches/ },
      { name: /Satış Birimleri|Sales Entities/i, url: /\/at\/sales-entities/ },
      { name: /Bildirim Şablonları|Notification Templates/i, url: /\/at\/notification-templates/ },
      { name: /Acil Erişim Talebi|Break-Glass Request/i, url: /\/at\/break-glass/ },
      { name: /Acil Erişim Onayları|Break-Glass Approvals/i, url: /\/at\/break-glass\/approvals/ },
      { name: /Muhasebe Kayıtları|Accounting Entries/i, url: /\/at\/accounting-entries/ },
      { name: /Mutabakat Kalemleri|Reconciliation Items/i, url: /\/at\/reconciliation-items/ },
    ];

    for (const link of links) {
      console.log(`Checking link: ${link.name}`);
      const locator = page.getByRole("link", { name: link.name }).first();
      
      // Ensure sidebar is visible or wait for it
      await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
      
      if (await locator.isVisible()) {
        await locator.click();
        await expect(page).toHaveURL(link.url, { timeout: 15000 });
        // Small pause to let page load
        await page.waitForTimeout(300);
      } else {
        console.warn(`Link not visible: ${link.name}`);
      }
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

    const sessionContextResponse = await page.request.get(
      "/api/method/acentem_takipte.acentem_takipte.api.session.get_session_context"
    );
    const sessionContextText = await sessionContextResponse.text().catch(() => "");
    let sessionContextPayload = null;
    try {
      sessionContextPayload = sessionContextText ? JSON.parse(sessionContextText) : null;
    } catch {
      sessionContextPayload = null;
    }

    const sessionMessage = String(
      sessionContextPayload?.message || sessionContextPayload?.exc || sessionContextPayload?.exc_type || ""
    ).toLowerCase();
    if (sessionContextResponse.ok()) {
      expect(sessionMessage).toContain("authentication");
    } else {
      expect(sessionContextResponse.status()).toBeGreaterThanOrEqual(400);
      expect(Boolean(sessionMessage)).toBeTruthy();
    }

    const sessionUserResponse = await page.request.get("/api/method/frappe.auth.get_logged_user");
    const sessionUserPayload = await readMethodPayload(sessionUserResponse);
    const sessionUserMessage = String(
      sessionUserPayload?.message || sessionUserPayload?.exc || sessionUserPayload?.exc_type || ""
    ).toLowerCase();

    if (sessionUserResponse.ok()) {
      expect(sessionUserPayload?.message).toBe("Guest");
    } else {
      expect(sessionUserResponse.status()).toBeGreaterThanOrEqual(400);
      expect(Boolean(sessionUserMessage)).toBeTruthy();
    }
  });

  test("authenticated smoke: reports page + session context + scheduled report access policy", async ({ page }) => {
    await ensureAuthenticated(page);

    const sessionContextResponse = await page.request.get(
      "/api/method/acentem_takipte.acentem_takipte.api.session.get_session_context"
    );
    const policyResponse = await page.request.get(
      "/api/method/acentem_takipte.acentem_takipte.api.reports.get_policy_list_report"
    );
    const scheduledResponse = await page.request.get(
      "/api/method/acentem_takipte.acentem_takipte.api.reports.get_scheduled_report_configs"
    );

    const sessionPayload = await readMethodPayload(sessionContextResponse);
    const policyPayload = await readMethodPayload(policyResponse);
    const scheduledPayload = await readMethodPayload(scheduledResponse);

    expect(sessionContextResponse.ok()).toBeTruthy();
    expect(sessionPayload?.message?.user).toBeTruthy();

    expect(policyResponse.ok()).toBeTruthy();
    expect(policyPayload?.message?.report_key).toBe("policy_list");

    await page.goto("/at/reports", { waitUntil: 'domcontentloaded' });
    
    const refreshBtn = page.getByRole("button", { name: /refresh|Yenile/i }).first();
    await refreshBtn.waitFor({ state: 'visible', timeout: 30000 });
    await expect(refreshBtn).toBeVisible();

    const userRoles = (Array.isArray(sessionPayload?.message?.roles) ? sessionPayload.message.roles : []).map(
      (role) => String(role || "").toLowerCase()
    );
    const isSystemManager = userRoles.includes("system manager") || userRoles.includes("administrator");
    
    const scheduledTitle = page.getByText(/Scheduled Reports|Zamanlanm/i);

    if (isSystemManager) {
      expect(scheduledResponse.ok()).toBeTruthy();
      await expect(scheduledTitle.first()).toBeVisible({ timeout: 15000 });
    } else {
      expect(scheduledResponse.ok()).toBeFalsy();
      await expect(scheduledTitle).toHaveCount(0);
    }
  });

  test("authenticated smoke: customer segment snapshot job endpoint is gated by admin job permissions", async ({ page }) => {
    await ensureAuthenticated(page);

    const sessionContextResponse = await page.request.get(
      "/api/method/acentem_takipte.acentem_takipte.api.session.get_session_context"
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

    const response = await page.request.get(
      "/api/method/acentem_takipte.acentem_takipte.api.admin_jobs.run_customer_segment_snapshot_job"
    );
    expect(response.ok()).toBeFalsy();
  });
});
