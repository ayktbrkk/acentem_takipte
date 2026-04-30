import { expect, test } from "@playwright/test";
import { ensureAuthenticated, pageRequest } from "./helpers/auth.js";

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
  const params = new URLSearchParams({
    tab,
    filters: JSON.stringify(buildFilters(days)),
  });
  const response = await pageRequest(
    page,
    "GET",
    `/api/method/acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_tab_payload?${params.toString()}`
  );

  const payload = response.json;
  return { response, payload };
}

function getMessagePayload(payload) {
  return payload?.message || {};
}

const DASHBOARD_TAB_NAMES = {
  sales: /^Satış(?:lar)?$|^Sales$/i,
  collections: /^Tahsilat(?:lar)?$|^Collections$/i,
  renewals: /^Yenileme(?:ler)?$|^Renewals$/i,
};

async function openDashboardTab(page, tabKey) {
  await page.getByRole("button", { name: DASHBOARD_TAB_NAMES[tabKey] }).click();
}

async function expectMetricCardCount(page, count) {
  await expect(page.locator("article").filter({ hasText: /Bugünkü Durum|Today's Status/i })).toHaveCount(count);
}

test.describe("dashboard tab contract", () => {
  test("operations, sales, collections and renewals expose live sections and dashboard contracts", async ({ page }) => {
    test.setTimeout(120000);
    await ensureAuthenticated(page);

    const { response: salesResponse, payload: salesPayload } = await getDashboardTabPayload(page, "sales", 7);
    const salesMessage = getMessagePayload(salesPayload);
    expect(salesResponse.ok).toBeTruthy();
    expect(salesMessage.tab).toBe("sales");
    expect(salesMessage.metrics).toMatchObject({
      ready_offer_count: expect.any(Number),
      accepted_offer_count: expect.any(Number),
      converted_offer_count: expect.any(Number),
    });
    expect(Array.isArray(salesMessage.previews?.offers)).toBeTruthy();

    const { response: collectionsResponse, payload: collectionsPayload } = await getDashboardTabPayload(page, "collections", 7);
    const collectionsMessage = getMessagePayload(collectionsPayload);
    expect(collectionsResponse.ok).toBeTruthy();
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
    expect(renewalsResponse.ok).toBeTruthy();
    expect(renewalsMessage.tab).toBe("renewals");
    expect(renewalsMessage.metrics).toMatchObject({
      offer_waiting_count: expect.any(Number),
    });
    expect(Array.isArray(renewalsMessage.previews?.offer_waiting_renewals)).toBeTruthy();

    await page.goto("/at/");

    await expect(page.getByRole("heading", { name: /Öncelikli Takipler|Priority Follow-ups/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Bugün Yapılacaklar|Today's Tasks/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Son Aktiviteler|Recent Activities/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Açık Hasarlar|Open Claims/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Son Poliçeler|Recent Policies/i })).toBeVisible();
    await expectMetricCardCount(page, 4);

    await openDashboardTab(page, "sales");
    await expect(page.getByRole("heading", { name: /Güncel Fırsat Kartları|Recent Lead Cards/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Teklif Süreci|Offer Pipeline/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Dönüşen Teklifler|Converted Offers/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Son Poliçeler|Recent Policies/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Müşteri Aday Aksiyonu|Prospect Action Queue/i })).toBeVisible();
    await expectMetricCardCount(page, 4);

    await openDashboardTab(page, "collections");
    await expect(page.getByRole("heading", { name: /Bugün Vadesi Gelen Tahsilatlar|Collections Due Today/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Gecikmiş Tahsilatlar|Overdue Collections/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Tahsilat Performansı|Collection Performance/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Riskli Müşteriler \/ Poliçeler|Risky Customers \/ Policies/i }).first()).toBeVisible();
    await expectMetricCardCount(page, 4);

    await openDashboardTab(page, "renewals");
    await expect(page.getByRole("heading", { name: /Teklif Bekleyen Yenilemeler|Renewals Waiting For Offer/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Yenileme Takip Listesi|Renewal Follow-up List/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Dönüşüm \/ Ödeme Sonucu|Conversion \/ Payment Outcome/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Bağlı Poliçeler|Linked Policies/i })).toBeVisible();
    await expectMetricCardCount(page, 4);
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
    await openDashboardTab(page, "collections");

    const paymentPanel = page.locator("article").filter({ hasText: paymentPanelTitle }).first();
    const paymentCard = paymentPanel.locator('[role="button"]').filter({ hasText: paymentTitle }).first();
    await expect(paymentCard).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/at\/payments(?:\?|$)/),
      paymentCard.click(),
    ]);

    const paymentUrl = new URL(page.url());
    expect(paymentUrl.searchParams.get("query")).toBe(paymentQuery);

    const renewalTitle = String(renewal.policy || renewal.name || "").trim();

    await page.goto("/at/");
    await openDashboardTab(page, "renewals");

    const renewalPanel = page.locator("article").filter({ hasText: /Teklif Bekleyen Yenilemeler|Renewals Waiting For Offer/i }).first();
    const renewalCard = renewalPanel.locator('[role="button"]').filter({ hasText: renewalTitle }).first();
    await expect(renewalCard).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/at\/renewals(?:\?|$)/),
      renewalCard.click(),
    ]);

    const renewalUrl = new URL(page.url());
    expect(renewalUrl.searchParams.get("task")).toBe(String(renewal.name));
  });

  test("sales converted offer card exposes policy drill-down when live data exists", async ({ page }) => {
    await ensureAuthenticated(page);

    const { payload: salesPayload } = await getDashboardTabPayload(page, "sales", 15);
    const salesMessage = getMessagePayload(salesPayload);
    const convertedOffers = Array.isArray(salesMessage.previews?.offers)
      ? salesMessage.previews.offers.filter((offer) => Boolean(offer?.converted_policy) || String(offer?.status || "") === "Converted")
      : [];
    const offer = convertedOffers[0] || null;

    test.skip(!offer?.converted_policy, "Canli ortamda policy drill-down icin donusen teklif kaydi yok.");

    await page.goto("/at/");
    await openDashboardTab(page, "sales");

    const convertedPanel = page.locator("article").filter({ hasText: /Dönüşen Teklifler|Converted Offers/i }).first();
    const offerCard = convertedPanel.locator('[role="button"]').filter({ hasText: String(offer.name) }).first();
    await expect(offerCard).toBeVisible();
    await Promise.all([
      page.waitForURL(new RegExp(`/at/policies/${offer.converted_policy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)),
      offerCard.getByRole("button", { name: /Poliçeyi Aç|Open Policy/i }).click(),
    ]);
  });

  test("operations open claim card drills into claim detail when live data exists", async ({ page }) => {
    await ensureAuthenticated(page);

    const response = await pageRequest(page, "POST", "/api/method/frappe.client.get_list", {
      form: {
        doctype: "AT Claim",
        fields: JSON.stringify(["name", "claim_no", "claim_status"]),
        order_by: "modified desc",
        limit_page_length: 8,
      },
    });
    const payload = response.ok ? response.json : null;
    const rows = Array.isArray(payload?.message) ? payload.message : [];
    const openClaim = rows.find((claim) => ["Open", "Under Review", "Approved"].includes(String(claim?.claim_status || ""))) || null;

    test.skip(!openClaim?.name, "Canli ortamda claim drill-down icin acik hasar kaydi yok.");

    await page.goto("/at/");
    const claimsPanel = page.locator("article").filter({ hasText: /Açık Hasarlar|Open Claims/i }).first();
    const claimCard = claimsPanel.locator('[role="button"]').filter({ hasText: String(openClaim.claim_no || openClaim.name) }).first();
    await expect(claimCard).toBeVisible();
    await Promise.all([
      page.waitForURL(new RegExp(`/at/claims/${openClaim.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)),
      claimCard.click(),
    ]);
  });

  test("operations recent policy card drills into policy detail when live data exists", async ({ page }) => {
    await ensureAuthenticated(page);

    const { payload: operationsPayload } = await getDashboardTabPayload(page, "daily", 15);
    const operationsMessage = getMessagePayload(operationsPayload);
    const policies = Array.isArray(operationsMessage.previews?.policies) ? operationsMessage.previews.policies : [];
    const policy = policies[0] || null;

    test.skip(!policy?.name, "Canli ortamda operasyon policy drill-down icin policy preview kaydi yok.");

    await page.goto("/at/");
    const policiesPanel = page.locator("article").filter({ hasText: /Son Poliçeler|Recent Policies/i }).first();
    const policyCard = policiesPanel.locator('[role="button"]').filter({ hasText: String(policy.policy_no || policy.name) }).first();
    await expect(policyCard).toBeVisible();
    await Promise.all([
      page.waitForURL(new RegExp(`/at/policies/${policy.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)),
      policyCard.click(),
    ]);
  });

  test("sales candidate action card opens task or reminder detail when live data exists", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.goto("/at/");
    await openDashboardTab(page, "sales");

    const actionPanel = page.locator("article").filter({ hasText: /Müşteri Aday Aksiyonu|Prospect Action Queue/i }).first();
    const actionCards = actionPanel.locator("ul").locator('[role="button"]');
    if ((await actionCards.count()) === 0) {
      return;
    }

    const actionCard = actionCards.first();
    await expect(actionCard).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/at\/(?:tasks|reminders)\/[^/?#]+$/),
      actionCard.click(),
    ]);
  });

  test("collections risky row opens payments board when live data exists", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.goto("/at/");
    await openDashboardTab(page, "collections");

    const riskPanel = page.locator("article").filter({ hasText: /Riskli Müşteriler \/ Poliçeler|Risky Customers \/ Policies/i }).first();
    const emptyState = riskPanel.locator(".at-empty-block");
    if ((await emptyState.count()) > 0) {
      return;
    }

    const riskCard = riskPanel.locator("ul").locator('[role="button"]').first();
    await expect(riskCard).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/at\/payments(?:\?|$)/),
      riskCard.click(),
    ]);
  });

  test("dashboard tabs remain usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ensureAuthenticated(page);

    await expect(page.locator(".dashboard-hero")).toBeVisible();
    await expect(page.locator(".at-tab-chip").first()).toBeVisible();
    await expectMetricCardCount(page, 4);

    await openDashboardTab(page, "sales");
    await expect(page.getByRole("heading", { name: /Teklif Süreci|Offer Pipeline/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Müşteri Aday Aksiyonu|Prospect Action Queue/i }).first()).toBeVisible();

    await openDashboardTab(page, "collections");
    await expect(page.getByRole("heading", { name: /Bugün Vadesi Gelen Tahsilatlar|Collections Due Today/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Tahsilat Performansı|Collection Performance/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Riskli Müşteriler \/ Poliçeler|Risky Customers \/ Policies/i }).first()).toBeVisible();

    await openDashboardTab(page, "renewals");
    await expect(page.getByRole("heading", { name: /Teklif Bekleyen Yenilemeler|Renewals Waiting For Offer/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Dönüşüm \/ Ödeme Sonucu|Conversion \/ Payment Outcome/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Bağlı Poliçeler|Linked Policies/i }).first()).toBeVisible();
    await expectMetricCardCount(page, 4);
  });
});
