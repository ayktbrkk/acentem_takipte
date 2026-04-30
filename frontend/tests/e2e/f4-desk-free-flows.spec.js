import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth";

async function clickFirstRow(page) {
  const rows = page.locator("tbody tr.at-table-row");
  // List pages load asynchronously; wait briefly so smoke doesn't skip on a race.
  await rows.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  let count = await rows.count().catch(() => 0);
  if (!count) {
    // One retry helps with intermittent initial empty render/state hydration races.
    await page.reload().catch(() => {});
    await rows.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    count = await rows.count().catch(() => 0);
  }
  if (!count) return false;
  await rows.first().click().catch(() => false);
  return true;
}

async function clickIfVisible(locator) {
  const visible = await locator.first().isVisible().catch(() => false);
  if (!visible) return false;
  await locator.first().click();
  return true;
}

async function gotoFirstCustomerDetail(page) {
  await page.goto("/at/customers");
  await expect(page).toHaveURL(/\/at\/customers(?:\?|$)/);
  const opened = await clickFirstRow(page);
  test.skip(!opened, "No customer rows available for smoke flow.");
  await expect(page).toHaveURL(/\/at\/customers\/[^/?#]+/);
}

test.describe.serial("F4 desk-free core flows", () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test("Lead -> Offer flow", async ({ page }) => {
    await page.goto("/at/leads");
    await expect(page).toHaveURL(/\/at\/leads(?:\?|$)/);
    const rows = page.locator("tbody tr.at-table-row");
    await rows.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    const rowCount = await rows.count();
    test.skip(!rowCount, "No lead rows available.");

    const convertedOfferBtn = page.getByRole("button", {
      name: /Teklif Detayi|Teklifi Aç|Open Offer Detail|Open Offer/i,
    });
    const convertNowBtn = page.getByRole("button", { name: /Teklife Cevir|Convert to Offer/i });

    const maxRowsToTry = Math.min(rowCount, 8);
    for (let i = 0; i < maxRowsToTry; i += 1) {
      await rows.nth(i).click();
      await expect(page).toHaveURL(/\/at\/leads\/[^/?#]+/);

      if (await clickIfVisible(convertedOfferBtn)) {
        await expect(page).toHaveURL(/\/at\/offers\/[^/?#]+/);
        return;
      }

      if (await clickIfVisible(convertNowBtn)) {
        await expect(page).toHaveURL(/\/at\/offers\/[^/?#]+/);
        return;
      }

      if (i < maxRowsToTry - 1) {
        await page.goBack();
        await expect(page).toHaveURL(/\/at\/leads(?:\?|$)/);
        await rows.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
      }
    }

    test.skip(true, "No convertible lead found.");
  });

  test("Offer -> Policy flow", async ({ page }) => {
    await page.goto("/at/offers");
    await expect(page).toHaveURL(/\/at\/offers(?:\?|$)/);

    const openPolicyFromList = page.getByRole("button", { name: /Poliçe Detayıni Aç|Policy Detail/i });
    if (await clickIfVisible(openPolicyFromList)) {
      await expect(page).toHaveURL(/\/at\/policies\/[^/?#]+/);
      return;
    }

    const openPolicyFromDetail = page.getByRole("button", { name: /Poliçe Detayı|Open Policy/i });
    const convertBtn = page.getByRole("button", { name: /Poliçeye Cevir|Convert to Policy/i });

    const rows = page.locator("tbody tr.at-table-row");
    await rows.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    const rowCount = await rows.count();
    test.skip(!rowCount, "No offer rows available.");

    const maxRowsToTry = Math.min(rowCount, 8);
    for (let i = 0; i < maxRowsToTry; i += 1) {
      await rows.nth(i).click();
      await expect(page).toHaveURL(/\/at\/offers\/[^/?#]+/);

      if (await clickIfVisible(openPolicyFromDetail)) {
        await expect(page).toHaveURL(/\/at\/policies\/[^/?#]+/);
        return;
      }

      if (await clickIfVisible(convertBtn)) {
        await expect(page).toHaveURL(/\/at\/offers(?:\?|$)/);
        await expect(page.getByText(/Teklif -> Poliçe|Offer -> Policy/i).first()).toBeVisible();
        return;
      }

      if (i < maxRowsToTry - 1) {
        await page.goBack();
        await expect(page).toHaveURL(/\/at\/offers(?:\?|$)/);
        await rows.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
      }
    }

    test.skip(true, "No convertible offer found.");
  });

  test("Customer -> Offer quick create flow", async ({ page }) => {
    await gotoFirstCustomerDetail(page);

    const newOfferBtn = page.getByRole("button", { name: /Yeni Teklif|New Offer/i }).first();
    await expect(newOfferBtn).toBeVisible();
    await newOfferBtn.click();

    await expect(page).toHaveURL(/\/at\/offers/);
    await expect(page.getByText(/Hızlı Teklif|Quick Offer|Yeni Teklif/i).first()).toBeVisible();
  });

  test("Customer -> Communication flow", async ({ page }) => {
    await gotoFirstCustomerDetail(page);

    const communicationBtn = page.getByRole("button", { name: /İletişim|Communication/i }).first();
    await expect(communicationBtn).toBeVisible();
    await communicationBtn.click();

    await expect(page).toHaveURL(/\/at\/communication/);
    await expect(page.getByText(/İletişim Merkezi|Communication Center/i).first()).toBeVisible();
    await expect(page).toHaveURL(/customer=/);
  });

  test("Task / Draft / Outbox frontend detail routes open", async ({ page }) => {
    const targets = [
      { path: "/at/tasks", detail: /\/at\/tasks\/[^/?#]+/ },
      { path: "/at/notification-drafts", detail: /\/at\/notification-drafts\/[^/?#]+/ },
      { path: "/at/notification-outbox", detail: /\/at\/notification-outbox\/[^/?#]+/ },
    ];

    for (const target of targets) {
      await page.goto(target.path);
      await expect(page).toHaveURL(new RegExp(target.path.replace(/\//g, "\\/") + "(?:\\?|$)"));
      const opened = await clickFirstRow(page);
      test.skip(!opened, `No rows available on ${target.path}.`);
      await expect(page).toHaveURL(target.detail);
      await page.goBack();
    }
  });
});
