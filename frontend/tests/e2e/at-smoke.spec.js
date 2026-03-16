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
    await expect(page.getByText(/Dashboard|Pano|Operasyon Panosu/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Offers|Teklif/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Policies|Poliçe/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /Offers|Teklif/i }).first().click();
    await expect(page).toHaveURL(/\/at\/offers/);
    await expect(page.getByRole("heading", { name: /Offer Board|Teklif/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /Policies|Poliçe/i }).first().click();
    await expect(page).toHaveURL(/\/at\/policies/);
    await expect(page.getByRole("heading", { name: /Policy Workbench|Poliçe/i }).first()).toBeVisible();
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
    expect(Array.isArray(policyPayload?.message?.columns)).toBeTruthy();
    expect(Array.isArray(policyPayload?.message?.rows)).toBeTruthy();

    await page.goto("/at/reports");
    await expect(page.getByRole("button", { name: /refresh|Yenile/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /export|dışa|disa|xlsx|pdf/i }).first()).toBeVisible();

    const userRoles = (Array.isArray(sessionPayload?.message?.roles) ? sessionPayload.message.roles : []).map(
      (role) => String(role || "").toLowerCase()
    );
    const isSystemManager = userRoles.includes("system manager") || userRoles.includes("administrator");
    const scheduledTitle = page.getByText(/Scheduled Reports|Zamanlanmis Raporlar/);

    if (isSystemManager) {
      expect(scheduledResponse.ok()).toBeTruthy();
      expect(typeof scheduledPayload?.message?.total).toBe("number");
      expect(Array.isArray(scheduledPayload?.message?.items)).toBeTruthy();
      await expect(scheduledTitle).toBeVisible();
    } else {
      expect(scheduledResponse.ok()).toBeFalsy();
      expect(scheduledPayload?.message || scheduledPayload?.exc || "").toBeTruthy();
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
      expect(snapshotResponse.payload?.message?.queued).toBeTruthy();
      expect(snapshotResponse.payload?.message?.queue).toBe("long");
      expect(snapshotResponse.payload?.message?.method).toBe(
        "acentem_takipte.acentem_takipte.tasks._run_customer_segment_snapshot_logic"
      );
    } else {
      expect(snapshotResponse.ok).toBeFalsy();
      const message = String(
        snapshotResponse.payload?.message ||
          snapshotResponse.payload?.exc ||
          snapshotResponse.payload?.exc_type ||
          ""
      ).toLowerCase();
      expect(message.includes("permission") || message.includes("authentication")).toBeTruthy();
    }
  });

  test("customer segment snapshot admin job rejects GET requests", async ({ page }) => {
    await ensureAuthenticated(page);

    const response = await page.request.get(
      "/api/method/acentem_takipte.acentem_takipte.api.admin_jobs.run_customer_segment_snapshot_job"
    );
    const text = await response.text().catch(() => "");
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    expect(response.ok()).toBeFalsy();
    const message = String(
      payload?.message || payload?.exc || payload?.exc_type || payload?.exception || payload?._server_messages || ""
    ).toLowerCase();
    expect(message.includes("post") || message.includes("permission") || message.includes("not allowed")).toBeTruthy();
  });
});
