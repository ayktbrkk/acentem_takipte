import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

function formatDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildFilters(days) {
  const to = new Date();
  const from = new Date(to);
  const compareTo = new Date(from);
  const compareFrom = new Date(compareTo);

  from.setDate(to.getDate() - days);
  compareTo.setDate(from.getDate() - 1);
  compareFrom.setDate(compareTo.getDate() - days);

  return {
    from_date: formatDate(from),
    to_date: formatDate(to),
    compare_from_date: formatDate(compareFrom),
    compare_to_date: formatDate(compareTo),
    months: 6,
  };
}

async function getDashboardTabPayload(page, tab, days = 7) {
  const response = await page.request.get(
    "/api/method/acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_tab_payload",
    {
      params: {
        tab,
        filters: JSON.stringify(buildFilters(days)),
      },
    }
  );

  const payload = await response.json();
  return { response, payload };
}

function getMessagePayload(payload) {
  return payload?.message || {};
}

test.describe("dashboard tab contract", () => {
  test("collections and renewals expose live backend contract and visible sections", async ({ page }) => {
    await ensureAuthenticated(page);

    const { response: collectionsResponse, payload: collectionsPayload } = await getDashboardTabPayload(page, "collections", 7);
    const collectionsMessage = getMessagePayload(collectionsPayload);
    expect(collectionsResponse.ok()).toBeTruthy();
    expect(collectionsMessage.tab).toBe("collections");
    expect(collectionsMessage.metrics).toMatchObject({
      due_today_collection_count: expect.any(Number),
      due_today_collection_amount_try: expect.any(Number),
      overdue_collection_count: expect.any(Number),
      overdue_collection_amount_try: expect.any(Number),
    });
    expect(Array.isArray(collectionsMessage.previews?.due_today_payments)).toBeTruthy();
    expect(Array.isArray(collectionsMessage.previews?.overdue_payments)).toBeTruthy();

    const { response: renewalsResponse, payload: renewalsPayload } = await getDashboardTabPayload(page, "renewals", 15);
    const renewalsMessage = getMessagePayload(renewalsPayload);
    expect(renewalsResponse.ok()).toBeTruthy();
    expect(renewalsMessage.tab).toBe("renewals");
    expect(renewalsMessage.metrics).toMatchObject({
      offer_waiting_count: expect.any(Number),
    });
    expect(Array.isArray(renewalsMessage.previews?.offer_waiting_renewals)).toBeTruthy();

    await page.goto("/at/");

    await page.getByRole("button", { name: /^Tahsilat$|^Collections$/i }).click();
    await expect(page.getByText(/Bugün Vadesi Gelen Tahsilatlar|Collections Due Today/i)).toBeVisible();
    await expect(page.getByText(/Gecikmiş Tahsilatlar|Overdue Collections/i)).toBeVisible();

    await page.getByRole("button", { name: /^Yenileme$|^Renewals$/i }).click();
    await expect(page.getByText(/Teklif Bekleyen Yenilemeler|Renewals Waiting For Offer/i)).toBeVisible();
    await expect(page.getByText(/Yenileme Takip Listesi|Renewal Follow-up List/i)).toBeVisible();
  });

  test("collections and offer-waiting cards drill into the correct workbenches", async ({ page }) => {
    await ensureAuthenticated(page);

    const { payload: collectionsPayload } = await getDashboardTabPayload(page, "collections", 7);
    const collectionsMessage = getMessagePayload(collectionsPayload);
    const dueTodayPayments = Array.isArray(collectionsMessage.previews?.due_today_payments)
      ? collectionsMessage.previews.due_today_payments
      : [];
    const overduePayments = Array.isArray(collectionsMessage.previews?.overdue_payments)
      ? collectionsMessage.previews.overdue_payments
      : [];
    const payment = dueTodayPayments[0] || overduePayments[0] || null;

    const { payload: renewalsPayload } = await getDashboardTabPayload(page, "renewals", 15);
    const renewalsMessage = getMessagePayload(renewalsPayload);
    const offerWaitingRenewals = Array.isArray(renewalsMessage.previews?.offer_waiting_renewals)
      ? renewalsMessage.previews.offer_waiting_renewals
      : [];
    const renewal = offerWaitingRenewals[0] || null;

    test.skip(!payment || !renewal, "Canli ortamda drill-down testini calistiracak preview kaydi yok.");

    const paymentTitle = String(payment.payment_no || payment.name || "").trim();
    const paymentQuery = String(payment.payment_no || payment.name || "").trim();
    const paymentPanelTitle = dueTodayPayments[0]
      ? /Bugün Vadesi Gelen Tahsilatlar|Collections Due Today/i
      : /Gecikmiş Tahsilatlar|Overdue Collections/i;

    await page.goto("/at/");
    await page.getByRole("button", { name: /^Tahsilat$|^Collections$/i }).click();

    const paymentPanel = page.locator("article").filter({ hasText: paymentPanelTitle }).first();
    const paymentCard = paymentPanel.locator('[role="button"]').filter({ hasText: paymentTitle }).first();
    await expect(paymentCard).toBeVisible();
    await paymentCard.click();
    await expect(page).toHaveURL(/\/at\/payments(?:\?|$)/);

    const paymentUrl = new URL(page.url());
    expect(paymentUrl.searchParams.get("query")).toBe(paymentQuery);

    const renewalTitle = String(renewal.policy || renewal.name || "").trim();

    await page.goto("/at/");
    await page.getByRole("button", { name: /^Yenileme$|^Renewals$/i }).click();

    const renewalPanel = page.locator("article").filter({ hasText: /Teklif Bekleyen Yenilemeler|Renewals Waiting For Offer/i }).first();
    const renewalCard = renewalPanel.locator('[role="button"]').filter({ hasText: renewalTitle }).first();
    await expect(renewalCard).toBeVisible();
    await renewalCard.click();
    await expect(page).toHaveURL(/\/at\/renewals(?:\?|$)/);

    const renewalUrl = new URL(page.url());
    expect(renewalUrl.searchParams.get("task")).toBe(String(renewal.name));
  });
});