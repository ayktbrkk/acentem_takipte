import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

async function getFirstRecordName(page, doctype) {
  const response = await page.request.post("/api/method/frappe.client.get_list", {
    form: {
      doctype,
      fields: JSON.stringify(["name"]),
      order_by: "modified desc",
      limit_page_length: 1,
    },
  });

  if (!response.ok()) {
    return null;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const rows = Array.isArray(payload?.message) ? payload.message : [];
  return rows[0]?.name || null;
}

test.describe("Acentem Takipte detail pages smoke", () => {
  test("policy/offer/lead detail shells render", async ({ page }) => {
    await ensureAuthenticated(page);

    const configs = [
      { label: "policy", doctype: "AT Policy", routePrefix: "/at/policies" },
      { label: "offer", doctype: "AT Offer", routePrefix: "/at/offers" },
      { label: "lead", doctype: "AT Lead", routePrefix: "/at/leads" },
    ];

    for (const config of configs) {
      const name = await getFirstRecordName(page, config.doctype);
      test.skip(!name, `${config.doctype} kaydi bulunamadi, detail smoke atlandi.`);

      await test.step(`${config.label} detail page shell`, async () => {
        await page.goto(`${config.routePrefix}/${encodeURIComponent(name)}`);
        await expect(page.locator(".page-shell").first()).toBeVisible();
        await expect(page.locator(".detail-title").first()).toBeVisible();
        await expect(page.locator(".nav-tabs-bar").first()).toBeVisible();
      });
    }
  });
});
