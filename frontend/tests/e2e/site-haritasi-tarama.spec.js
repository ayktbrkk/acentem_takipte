/**
 * site-haritasi-tarama.spec.js
 * ─────────────────────────────────────────────────────────────────
 * Acentem Takipte — Tam Site Haritası Tarama Testi
 *
 * Hedef   : Tüm liste/board, detay, aux ve rapor sayfalarını ziyaret et;
 *           görsel tutarlılık (page-shell, detail-title, nav-tabs-bar),
 *           console hataları ve eksik içerik kontrolü yap.
 *           Her sayfanın screenshotunu kaydet.
 *
 * Kullanım: E2E_USER=Administrator E2E_PASSWORD=admin npx playwright test site-haritasi-tarama.spec.js --headed
 * ─────────────────────────────────────────────────────────────────
 */

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { ensureAuthenticated, pageRequest } from "./helpers/auth.js";

const KNOWN_EXTERNAL_CONSOLE_PATTERNS = [
  /Failed to load resource: net::ERR_CONNECTION_REFUSED/i,
  /Failed to load resource: net::ERR_NETWORK_CHANGED/i,
  /Failed to load resource: the server responded with a status of 404 \(NOT FOUND\)/i,
  /Failed to load resource: the server responded with a status of 417 \(EXPECTATION FAILED\)/i,
  /Unable to preload CSS for \/assets\//i,
];

const EXTERNAL_ERROR_TYPE_PATTERNS = [
  { key: "err_connection_refused", pattern: /net::ERR_CONNECTION_REFUSED/i },
  { key: "other_external", pattern: /net::ERR_NETWORK_CHANGED/i },
  { key: "http_404", pattern: /status of 404 \(NOT FOUND\)/i },
  { key: "http_417", pattern: /status of 417 \(EXPECTATION FAILED\)/i },
];

function isKnownExternalConsoleError(message) {
  return KNOWN_EXTERNAL_CONSOLE_PATTERNS.some((pattern) => pattern.test(message));
}

function splitConsoleErrors(errors) {
  const externalErrors = [];
  const appErrors = [];

  for (const errorText of errors) {
    if (isKnownExternalConsoleError(errorText)) {
      externalErrors.push(errorText);
    } else {
      appErrors.push(errorText);
    }
  }

  return {
    externalErrors,
    appErrors,
  };
}

function classifyExternalError(message) {
  const found = EXTERNAL_ERROR_TYPE_PATTERNS.find((entry) => entry.pattern.test(message));
  return found ? found.key : "other_external";
}

const scanMetrics = {
  visitedPages: 0,
  appErrorCount: 0,
  externalErrorCount: 0,
  externalErrorByType: {
    err_connection_refused: 0,
    http_404: 0,
    http_417: 0,
    other_external: 0,
  },
  appErrorPages: [],
  externalErrorPages: [],
};

function recordConsoleMetrics({ label, url, appErrors, externalErrors }) {
  scanMetrics.visitedPages += 1;

  if (appErrors.length) {
    scanMetrics.appErrorCount += appErrors.length;
    scanMetrics.appErrorPages.push({
      label,
      url,
      count: appErrors.length,
      sample: appErrors[0],
    });
  }

  if (externalErrors.length) {
    scanMetrics.externalErrorCount += externalErrors.length;
    for (const errorText of externalErrors) {
      const type = classifyExternalError(errorText);
      scanMetrics.externalErrorByType[type] += 1;
    }
    scanMetrics.externalErrorPages.push({
      label,
      url,
      count: externalErrors.length,
      sample: externalErrors[0],
    });
  }
}

// ──────────────────────────────────────────────────────────────────
// Yardımcı: İlk kaydın adını API'den al
// ──────────────────────────────────────────────────────────────────
async function getFirstRecord(page, doctype) {
  const resp = await pageRequest(page, "POST", "/api/method/frappe.client.get_list", {
    form: {
      doctype,
      fields: JSON.stringify(["name"]),
      order_by: "modified desc",
      limit_page_length: 1,
    },
  }).catch(() => null);
  if (!resp?.ok) return null;
  return Array.isArray(resp.json?.message) ? resp.json.message[0]?.name || null : null;
}

// ──────────────────────────────────────────────────────────────────
// Yardımcı: Sayfaya git, temel kontrolleri yap, screenshot al
// ──────────────────────────────────────────────────────────────────
async function visitPage(page, url, label) {
  const consoleErrors = [];
  const onConsoleError = (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  };
  page.on("console", onConsoleError);

  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 }).catch(() =>
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })
  );

  // page-shell varlığı (liste + detail sayfaları)
  const hasPageShell = await page.locator(".page-shell").first().isVisible().catch(() => false);

  // Sayfa başlığı / içerik varlığı
  const hasHeading = await page
    .locator("h1, h2, .detail-title, .at-hero-title, .page-title")
    .first()
    .isVisible()
    .catch(() => false);

  // Sayfa 404 veya hata mı?
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const is404 = /404|not found|sayfa bulunamadı/i.test(bodyText);

  // Screenshot
  const screenshotName = label.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]/g, "_");
  await page.screenshot({
    path: `test-results/screenshots/${screenshotName}.png`,
    fullPage: false,
  }).catch(() => {});

  page.off("console", onConsoleError);

  const { externalErrors, appErrors } = splitConsoleErrors(consoleErrors);
  recordConsoleMetrics({
    label,
    url,
    appErrors,
    externalErrors,
  });

  return {
    url,
    label,
    hasPageShell,
    hasHeading,
    is404,
    consoleErrors: consoleErrors.slice(0, 5),
    externalConsoleErrors: externalErrors.slice(0, 5),
    appConsoleErrors: appErrors.slice(0, 5),
    status: is404 ? "❌ 404" : !hasHeading ? "⚠️ Boş" : !hasPageShell ? "⚠️ page-shell eksik" : "✅ OK",
  };
}

// ──────────────────────────────────────────────────────────────────
// Adım 1.1 — Kimlik Doğrulama
// ──────────────────────────────────────────────────────────────────
test.describe("Adım 1.1 — Kimlik Doğrulama", () => {
  test("Administrator olarak giriş yapılabilmeli", async ({ page }) => {
    const authenticated = await ensureAuthenticated(page);
    expect(authenticated).toBe(true);

    const resp = await pageRequest(page, "GET", "/api/method/frappe.auth.get_logged_user");
    const payload = resp.json;
    expect(resp.ok).toBeTruthy();
    expect(payload?.message).not.toBe("Guest");

    console.log(`✅ Giriş başarılı: ${payload?.message}`);
  });
});

// ──────────────────────────────────────────────────────────────────
// Adım 1.2 — 14 Ana Liste ve Board Sayfası
// ──────────────────────────────────────────────────────────────────
test.describe("Adım 1.2 — 14 Ana Liste ve Board Sayfası", () => {
  const LIST_PAGES = [
    { url: "/at/", label: "Dashboard_Pano" },
    { url: "/at/leads", label: "Firsat_Yonetimi" },
    { url: "/at/offers", label: "Teklif_Panosu" },
    { url: "/at/policies", label: "Police_Yonetimi" },
    { url: "/at/customers", label: "Musteri_Yonetimi" },
    { url: "/at/claims", label: "Hasar_Panosu" },
    { url: "/at/payments", label: "Odeme_Operasyonlari" },
    { url: "/at/renewals", label: "Yenileme_Panosu" },
    { url: "/at/communication", label: "Iletisim_Merkezi" },
    { url: "/at/reconciliation", label: "Mutabakat_Masasi" },
    { url: "/at/reports", label: "Raporlar" },
    { url: "/at/data-import", label: "Veri_Ice_Aktarma" },
    { url: "/at/data-export", label: "Veri_Disa_Aktarma" },
    { url: "/at/tasks", label: "Aux_Gorevler" },
  ];

  for (const pg of LIST_PAGES) {
    test(`${pg.label} sayfası yüklenmeli`, async ({ page }) => {
      await ensureAuthenticated(page);
      const result = await visitPage(page, pg.url, pg.label);

      console.log(
        `${result.status} | ${result.label} | page-shell:${result.hasPageShell} | heading:${result.hasHeading}` +
          (result.appConsoleErrors.length ? ` | APP CONSOLE ERR: ${result.appConsoleErrors.join(" | ")}` : "") +
          (result.externalConsoleErrors.length ? ` | EXT CONSOLE ERR: ${result.externalConsoleErrors.join(" | ")}` : "")
      );

      expect(result.is404, `${pg.label} 404 döndü`).toBe(false);
      expect(result.hasHeading, `${pg.label} sayfasında başlık bulunamadı`).toBe(true);
      expect(result.appConsoleErrors, `${pg.label} sayfasında uygulama console hatası var`).toEqual([]);
    });
  }
});

// ──────────────────────────────────────────────────────────────────
// Adım 1.3 — 17 Detay Sayfası (Ana + Aux)
// ──────────────────────────────────────────────────────────────────
test.describe("Adım 1.3 — 17 Detay Sayfası", () => {
  const DETAIL_CONFIGS = [
    // Ana detay sayfaları
    { doctype: "AT Lead", routePrefix: "/at/leads", label: "Lead_Detay" },
    { doctype: "AT Offer", routePrefix: "/at/offers", label: "Teklif_Detay" },
    { doctype: "AT Policy", routePrefix: "/at/policies", label: "Police_Detay" },
    { doctype: "AT Customer", routePrefix: "/at/customers", label: "Musteri_Detay" },
    { doctype: "AT Claim", routePrefix: "/at/claims", label: "Hasar_Detay" },
    { doctype: "AT Payment", routePrefix: "/at/payments", label: "Odeme_Detay" },
    { doctype: "AT Renewal Task", routePrefix: "/at/renewals", label: "Yenileme_Detay" },
    { doctype: "AT Reconciliation Item", routePrefix: "/at/reconciliation", label: "Mutabakat_Detay" },
    // Aux detay sayfaları
    { doctype: "AT Renewal Task", routePrefix: "/at/tasks", label: "Aux_Gorev_Detay" },
    { doctype: "AT Notification Draft", routePrefix: "/at/notification-drafts", label: "Aux_Bildirim_Taslak_Detay" },
    { doctype: "AT Notification Outbox", routePrefix: "/at/notification-outbox", label: "Aux_Giden_Bildirim_Detay" },
    { doctype: "AT Insurance Company", routePrefix: "/at/insurance-companies", label: "Aux_Sigorta_Sirketi_Detay" },
    { doctype: "AT Branch", routePrefix: "/at/branches", label: "Aux_Brans_Detay" },
    { doctype: "AT Sales Entity", routePrefix: "/at/sales-entities", label: "Aux_Satis_Birimi_Detay" },
    { doctype: "AT Notification Template", routePrefix: "/at/notification-templates", label: "Aux_Bildirim_Sablon_Detay" },
    { doctype: "AT Accounting Entry", routePrefix: "/at/accounting-entries", label: "Aux_Muhasebe_Kaydı_Detay" },
    { doctype: "AT Reconciliation Item", routePrefix: "/at/reconciliation-items", label: "Aux_Mutabakat_Kalemi_Detay" },
  ];

  for (const cfg of DETAIL_CONFIGS) {
    test(`${cfg.label} detay sayfası yüklenmeli`, async ({ page }) => {
      await ensureAuthenticated(page);
      const name = await getFirstRecord(page, cfg.doctype);

      if (!name) {
        console.log(`⚠️ ATLANDI | ${cfg.label} | ${cfg.doctype} kaydı bulunamadı`);
        test.skip(true, `${cfg.doctype} kaydı yok, detay sayfası atlandı.`);
        return;
      }

      const url = `${cfg.routePrefix}/${encodeURIComponent(name)}`;
      const result = await visitPage(page, url, cfg.label);

      console.log(
        `${result.status} | ${result.label} | page-shell:${result.hasPageShell} | heading:${result.hasHeading}` +
          (result.appConsoleErrors.length ? ` | APP CONSOLE ERR: ${result.appConsoleErrors.join(" | ")}` : "") +
          (result.externalConsoleErrors.length ? ` | EXT CONSOLE ERR: ${result.externalConsoleErrors.join(" | ")}` : "")
      );

      expect(result.is404, `${cfg.label} 404 döndü`).toBe(false);
      expect(result.hasHeading, `${cfg.label} sayfasında başlık bulunamadı`).toBe(true);
      expect(result.appConsoleErrors, `${cfg.label} sayfasında uygulama console hatası var`).toEqual([]);
    });
  }
});

// ──────────────────────────────────────────────────────────────────
// Adım 1.3b — Hızlı Ekranlar (QuickCreate Dialog)
// ──────────────────────────────────────────────────────────────────
test.describe("Adım 1.3b — Hızlı Ekranlar (QuickCreate Dialog)", () => {
  /**
   * Her QuickCreate dialog'u için:
   * - Tetikleyen sayfaya git
   * - "Yeni" / "+" butonunu bul ve tıkla
   * - Dialog'un açıldığını doğrula
   * - Screenshot al
   * - ESC ile kapat
   */
  const QUICK_CREATE_PAGES = [
    {
      label: "QC_Musteri_Olustur",
      triggerUrl: "/at/customers",
      // Müşteri listesindeki "Yeni Müşteri" butonu
      btnSelector: 'button:has-text("Yeni"), button:has-text("New"), button[aria-label*="Yeni"], button[aria-label*="New"]',
      dialogSelector: "[role='dialog'], .modal, .dialog, .at-quick-create-shell, .dialog-shell, .qc-managed-dialog-shell",
    },
    {
      label: "QC_Teklif_Olustur",
      triggerUrl: "/at/offers",
      btnSelector: 'button:has-text("Yeni"), button:has-text("New"), button[aria-label*="Yeni"], button[aria-label*="New"]',
      dialogSelector: "[role='dialog'], .modal, .dialog, .at-quick-create-shell, .dialog-shell, .qc-managed-dialog-shell",
    },
    {
      label: "QC_Hasar_Olustur",
      triggerUrl: "/at/claims",
      btnSelector: 'button:has-text("Yeni"), button:has-text("New"), button[aria-label*="Yeni"], button[aria-label*="New"]',
      dialogSelector: "[role='dialog'], .modal, .dialog, .at-quick-create-shell, .dialog-shell, .qc-managed-dialog-shell",
    },
    {
      label: "QC_Police_Olustur",
      triggerUrl: "/at/policies",
      btnSelector: 'button:has-text("Yeni"), button:has-text("New"), button[aria-label*="Yeni"], button[aria-label*="New"]',
      dialogSelector: "[role='dialog'], .modal, .dialog, .at-quick-create-shell, .dialog-shell, .qc-managed-dialog-shell",
    },
    {
      label: "QC_Firsat_Olustur",
      triggerUrl: "/at/leads",
      btnSelector: 'button:has-text("Yeni"), button:has-text("New"), button[aria-label*="Yeni"], button[aria-label*="New"]',
      dialogSelector: "[role='dialog'], .modal, .dialog, .at-quick-create-shell, .dialog-shell, .qc-managed-dialog-shell",
    },
  ];

  for (const qc of QUICK_CREATE_PAGES) {
    test(`${qc.label} dialog açılmalı`, async ({ page }) => {
      await ensureAuthenticated(page);
      const consoleErrors = [];
      const onConsoleError = (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      };
      page.on("console", onConsoleError);

      await page.goto(qc.triggerUrl, { waitUntil: "networkidle", timeout: 30_000 }).catch(() =>
        page.goto(qc.triggerUrl, { waitUntil: "domcontentloaded", timeout: 30_000 })
      );

      // Butona bul ve tıkla
      const btn = page.locator(qc.btnSelector).first();
      const btnVisible = await btn.isVisible().catch(() => false);

      if (!btnVisible) {
        console.log(`⚠️ BUTON YOK | ${qc.label} | Tetikleyici buton bulunamadı`);
        // screenshot al yine de
        await page.screenshot({
          path: `test-results/screenshots/${qc.label}_no_btn.png`,
          fullPage: false,
        }).catch(() => {});
        expect(btnVisible, `${qc.label} için tetikleyici buton bulunamadı`).toBe(true);
      }

      await btn.click();
      await page.waitForTimeout(800);

      const dialogVisible = await page.locator(qc.dialogSelector).first().isVisible().catch(() => false);
      const { externalErrors, appErrors } = splitConsoleErrors(consoleErrors);
      recordConsoleMetrics({
        label: qc.label,
        url: qc.triggerUrl,
        appErrors,
        externalErrors,
      });

        page.off("console", onConsoleError);

      const screenshotName = `${qc.label}${dialogVisible ? "_open" : "_failed"}`;
      await page.screenshot({
        path: `test-results/screenshots/${screenshotName}.png`,
        fullPage: false,
      }).catch(() => {});

      console.log(
        `${dialogVisible ? "✅" : "❌"} | ${qc.label} | dialog:${dialogVisible}` +
          (appErrors.length ? ` | APP CONSOLE ERR: ${appErrors.join(" | ")}` : "") +
          (externalErrors.length ? ` | EXT CONSOLE ERR: ${externalErrors.join(" | ")}` : "")
      );

      // ESC ile kapat
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      expect(dialogVisible, `${qc.label} dialog açılmadı`).toBe(true);
      expect(appErrors, `${qc.label} dialog akışında uygulama console hatası var`).toEqual([]);
    });
  }
});

test.afterAll(() => {
  const summary = {
    generatedAt: new Date().toISOString(),
    visitedPages: scanMetrics.visitedPages,
    appErrorCount: scanMetrics.appErrorCount,
    externalErrorCount: scanMetrics.externalErrorCount,
    externalErrorByType: scanMetrics.externalErrorByType,
    appErrorPageCount: scanMetrics.appErrorPages.length,
    externalErrorPageCount: scanMetrics.externalErrorPages.length,
    appErrorPages: scanMetrics.appErrorPages,
    externalErrorPages: scanMetrics.externalErrorPages,
  };

  const kpiLine = `SITE_HARITASI_KPI visited=${summary.visitedPages} app_errors=${summary.appErrorCount} external_errors=${summary.externalErrorCount} refused=${summary.externalErrorByType.err_connection_refused} http404=${summary.externalErrorByType.http_404} http417=${summary.externalErrorByType.http_417} other_external=${summary.externalErrorByType.other_external}`;

  console.log(`SITE_HARITASI_SUMMARY ${JSON.stringify(summary)}`);
  console.log(kpiLine);

  try {
    fs.mkdirSync("test-results", { recursive: true });
    fs.writeFileSync("test-results/site-haritasi-summary.json", `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    fs.writeFileSync("test-results/site-haritasi-kpi.txt", `${kpiLine}\n`, "utf8");
  } catch {
    // Summary output is optional for local runs.
  }
});

// ──────────────────────────────────────────────────────────────────
// Adım 1.4 — 12 Yardımcı ve Rapor Sayfası
// ──────────────────────────────────────────────────────────────────
test.describe("Adım 1.4 — 12 Yardımcı ve Rapor Sayfası", () => {
  const AUX_PAGES = [
    { url: "/at/reports/premium", label: "Rapor_Prim" },
    { url: "/at/reports/claim-ratio", label: "Rapor_Hasar_Prim_Orani" },
    { url: "/at/reports/agent-performance", label: "Rapor_Acente_Performans" },
    { url: "/at/reports/customer-segmentation", label: "Rapor_Musteri_Segmentasyon" },
    { url: "/at/insurance-companies", label: "Aux_Sigorta_Sirketleri" },
    { url: "/at/branches", label: "Aux_Branslar" },
    { url: "/at/sales-entities", label: "Aux_Satis_Birimleri" },
    { url: "/at/notification-templates", label: "Aux_Bildirim_Sablonlari" },
    { url: "/at/accounting-entries", label: "Aux_Muhasebe_Kayitlari" },
    { url: "/at/reconciliation-items", label: "Aux_Mutabakat_Kalemleri" },
    { url: "/at/notification-drafts", label: "Aux_Bildirim_Taslaklari" },
    { url: "/at/notification-outbox", label: "Aux_Giden_Bildirimler" },
  ];

  for (const pg of AUX_PAGES) {
    test(`${pg.label} sayfası yüklenmeli`, async ({ page }) => {
      await ensureAuthenticated(page);
      const result = await visitPage(page, pg.url, pg.label);

      console.log(
        `${result.status} | ${result.label} | page-shell:${result.hasPageShell} | heading:${result.hasHeading}` +
          (result.appConsoleErrors.length ? ` | APP CONSOLE ERR: ${result.appConsoleErrors.join(" | ")}` : "") +
          (result.externalConsoleErrors.length ? ` | EXT CONSOLE ERR: ${result.externalConsoleErrors.join(" | ")}` : "")
      );

      expect(result.is404, `${pg.label} 404 döndü`).toBe(false);
      expect(result.hasHeading, `${pg.label} sayfasında başlık bulunamadı`).toBe(true);
      expect(result.appConsoleErrors, `${pg.label} sayfasında uygulama console hatası var`).toEqual([]);
    });
  }
});
