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
  test("policy/customer/claim detail shells render", async ({ page }) => {
    await ensureAuthenticated(page);

    const configs = [
      {
        label: "policy",
        doctype: "AT Policy",
        routePrefix: "/at/policies",
        titlePattern: /Policy Details|policy_detail|Poliçe/i,
        requiredTexts: [/Listeye Dön|Back to List/i, /Yenile|Refresh/i, /Dosyalar|Documents/i],
      },
      {
        label: "customer",
        doctype: "AT Customer",
        routePrefix: "/at/customers",
        titlePattern: /.+/,
        requiredTexts: [/Listeye Dön|Back to List/i, /Yeni Teklif|New Offer/i, /Operasyonlar|Operations/i],
      },
      {
        label: "claim",
        doctype: "AT Claim",
        routePrefix: "/at/claims",
        titlePattern: /Claim Detail|Hasar Detayı/i,
        requiredTexts: [/Listeye Dön|Back to List/i, /Yenile|Refresh/i, /Dosyalar|Documents/i],
      },
    ];

    for (const config of configs) {
      const name = await getFirstRecordName(page, config.doctype);
      test.skip(!name, `${config.doctype} kaydi bulunamadi, detail smoke atlandi.`);

      await test.step(`${config.label} detail page shell`, async () => {
        await page.goto(`${config.routePrefix}/${encodeURIComponent(name)}`);
        await expect(page.locator(".page-shell").first()).toBeVisible();
        const detailTitle = page.locator(".detail-title").first();
        if ((await detailTitle.count()) > 0) {
          await expect(detailTitle).toBeVisible();
        } else {
          await expect(page.getByRole("heading", { name: config.titlePattern }).first()).toBeVisible();
        }
        for (const textPattern of config.requiredTexts) {
          await expect(page.getByText(textPattern).first()).toBeVisible();
        }
      });
    }
  });
});
