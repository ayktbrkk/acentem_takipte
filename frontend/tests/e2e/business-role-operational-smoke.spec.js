import { expect, test } from "@playwright/test";
import { ensureAuthenticated, pageRequest } from "./helpers/auth.js";

async function callMethod(page, method, params = {}, httpMethod = "GET") {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    query.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return pageRequest(page, httpMethod, `/api/method/${method}${suffix}`);
}

async function getFirstRecordName(page, doctype) {
  const response = await pageRequest(page, "POST", "/api/method/frappe.client.get_list", {
    form: {
      doctype,
      fields: JSON.stringify(["name"]),
      order_by: "modified desc",
      limit_page_length: 1,
    },
  });

  expect(response.ok, `${doctype} list request should be readable for the business role`).toBeTruthy();
  const rows = Array.isArray(response.json?.message) ? response.json.message : [];
  return rows[0]?.name || "";
}

async function expectOperationalPage(page, path, headingPattern) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));
  await expect(page.locator("#app, .page-shell, .at-shell-main").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: headingPattern }).first()).toBeVisible();
}

test.describe("business role operational /at smoke", () => {
  test("AT Agent can open operational pages, details, reports, and safe export", async ({ page }) => {
    test.setTimeout(180000);
    await ensureAuthenticated(page, {
      userEnvKey: "E2E_BUSINESS_USER",
      passwordEnvKey: "E2E_BUSINESS_PASSWORD",
    });

    const sessionResponse = await callMethod(
      page,
      "acentem_takipte.acentem_takipte.api.session.get_session_context"
    );
    expect(sessionResponse.ok).toBeTruthy();
    const roles = sessionResponse.json?.message?.roles || [];
    expect(roles).toContain("AT Agent");
    expect(roles).not.toContain("System Manager");
    expect(roles).not.toContain("Administrator");

    await expectOperationalPage(page, "/at/payments", /Ödemeler|Payments/i);
    await expectOperationalPage(page, "/at/tasks", /Görevler|Tasks/i);
    await expectOperationalPage(page, "/at/at-documents", /Doküman|Document/i);
    await expectOperationalPage(page, "/at/reports", /Raporlar|Reports/i);

    const policyName = await getFirstRecordName(page, "AT Policy");
    expect(policyName, "AT Agent should have at least one readable policy for detail smoke").toBeTruthy();
    await page.goto(`/at/policies/${encodeURIComponent(policyName)}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".page-shell").first()).toBeVisible();
    await expect(page.getByText(/Listeye Dön|Back to List/i).first()).toBeVisible();
    await expect(page.getByText(/Dosyalar|Dokümanlar|Documents/i).first()).toBeVisible();

    const customerName = await getFirstRecordName(page, "AT Customer");
    expect(customerName, "AT Agent should have at least one readable customer for detail smoke").toBeTruthy();
    await page.goto(`/at/customers/${encodeURIComponent(customerName)}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".page-shell").first()).toBeVisible();
    await expect(page.getByText(/Listeye Dön|Back to List/i).first()).toBeVisible();
    await expect(page.getByText(/Yeni Teklif|New Offer/i).first()).toBeVisible();

    const reportResponse = await callMethod(
      page,
      "acentem_takipte.acentem_takipte.api.reports.get_policy_list_report",
      { filters: {}, limit: 5 }
    );
    expect(reportResponse.ok).toBeTruthy();
    expect(reportResponse.json?.message?.report_key).toBe("policy_list");

    const exportResponse = await callMethod(
      page,
      "acentem_takipte.acentem_takipte.api.reports.export_policy_list_report",
      { filters: {}, export_format: "xlsx", limit: 5 }
    );
    expect(exportResponse.ok).toBeTruthy();
    const exportPayload = exportResponse.json?.message || exportResponse.json || {};
    const filename = exportPayload.filename || "";
    if (filename) {
      expect(filename).toMatch(/policy_list.*\.xlsx$/);
    }
    expect(exportResponse.text || exportPayload.content || filename).toBeTruthy();
  });
});
