import { expect, test } from "@playwright/test";
import { ensureAuthenticated, pageRequest } from "./helpers/auth.js";

async function getFirstRecordName(page, doctype) {
  const response = await pageRequest(page, "POST", "/api/method/frappe.client.get_list", {
    form: {
      doctype,
      fields: JSON.stringify(["name"]),
      order_by: "modified desc",
      limit_page_length: 1,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = response.json;
  const rows = Array.isArray(payload?.message) ? payload.message : [];
  return rows[0]?.name || null;
}

test.describe("customer detail network", () => {
  test("customer detail should not emit 417 responses", async ({ page }) => {
    await ensureAuthenticated(page);

    const customerName = process.env.E2E_CUSTOMER_NAME || (await getFirstRecordName(page, "AT Customer"));
    test.skip(!customerName, "AT Customer kaydi bulunamadi.");

    const failed417 = [];
    const consoleErrors = [];
    const ignorableConsolePatterns = [
      /^Error connecting to socket\.io: Invalid namespace$/,
      /^Failed to load resource: the server responded with a status of 400 \(Bad Request\)$/,
    ];
    const onResponse = async (response) => {
      if (response.status() !== 417) return;
      failed417.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      });
    };
    const onConsole = (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (ignorableConsolePatterns.some((pattern) => pattern.test(text))) {
        return;
      }
      consoleErrors.push(text);
    };

    page.on("response", onResponse);
    page.on("console", onConsole);
    try {
      await page.goto(`/at/customers/${encodeURIComponent(customerName)}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await expect(page.locator(".page-shell").first()).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.waitForTimeout(2000);
    } finally {
      page.off("response", onResponse);
      page.off("console", onConsole);
    }

    expect(consoleErrors).toEqual([]);
    expect(failed417).toEqual([]);
  });
});