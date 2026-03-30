import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("renewals and reports data smoke", async ({ page }) => {
  await ensureAuthenticated(page);

  const renewalsApi = await page.request.post("/api/method/frappe.client.get_list", {
    form: {
      doctype: "AT Renewal Task",
      fields: JSON.stringify(["name", "policy", "customer", "status"]),
      order_by: "modified desc",
      limit_page_length: 20,
    },
  });
  const renewalsPayload = await renewalsApi.json().catch(() => null);
  const renewalsRows = Array.isArray(renewalsPayload?.message) ? renewalsPayload.message : [];
  console.log("RENEWALS_API_ROWS", renewalsRows.length);

  await page.goto("/at/renewals");
  await expect(page.getByRole("heading", { name: /Yenilemeler|Renewals/i }).first()).toBeVisible();
  const renewalCards = await page.locator(".kanban-card").count();
  console.log("RENEWALS_PAGE_CARDS", renewalCards);
  console.log("RENEWALS_PAGE_TEXT", (await page.locator("body").innerText()).slice(0, 1000));

  const reportsApi = await page.request.get("/api/method/acentem_takipte.acentem_takipte.api.reports.get_policy_list_report");
  const reportsPayload = await reportsApi.json().catch(() => null);
  const reportsRows = Array.isArray(reportsPayload?.message?.rows) ? reportsPayload.message.rows : [];
  console.log("REPORTS_API_ROWS", reportsRows.length);

  await page.goto("/at/reports?report_key=policy_list");
  await expect(page.getByRole("heading", { name: /Raporlar|Reports/i }).first()).toBeVisible();
  const reportRows = await page.locator("table tbody tr").count();
  console.log("REPORTS_PAGE_ROWS", reportRows);
  console.log("REPORTS_PAGE_TEXT", (await page.locator("body").innerText()).slice(0, 1200));
});
