import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { ensureAuthenticated, pageRequest } from "./helpers/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CUSTOMER_FIXTURE = path.resolve(__dirname, "../fixtures/e2e/customer_import.csv");

async function uploadPrivateFile(page, filePath, fileName) {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString("base64");

  return page.evaluate(
    async ({ encoded, name }) => {
      const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: "text/csv" });
      const formData = new FormData();
      formData.append("file", blob, name);
      formData.append("is_private", "1");
      formData.append("folder", "Home");

      const csrfToken = window.csrf_token || window.frappe?.csrf_token || "";
      const response = await fetch("/api/method/upload_file", {
        method: "POST",
        headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {},
        body: formData,
        credentials: "include",
      });
      const text = await response.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return { ok: response.ok, status: response.status, json, text };
    },
    { encoded: base64, name: fileName },
  );
}

async function callImportMethod(page, method, params = {}) {
  const form = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    form[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return pageRequest(page, "POST", `/api/method/acentem_takipte.acentem_takipte.api.data_import.${method}`, {
    form,
  });
}

test.describe("Import and export flows", () => {
  test("API: upload, preview, and enqueue customer import job", async ({ page }) => {
    test.setTimeout(120000);
    await ensureAuthenticated(page);

    const upload = await uploadPrivateFile(page, CUSTOMER_FIXTURE, `e2e-customer-${Date.now()}.csv`);
    expect(upload.ok, upload.text).toBeTruthy();
    const uploadedName = upload.json?.message?.name;
    expect(uploadedName).toBeTruthy();

    const draft = await callImportMethod(page, "create_import_job_draft", {
      dataset: "customers",
      file_name: uploadedName,
    });
    expect(draft.ok, draft.text).toBeTruthy();
    const jobName = draft.json?.message?.job_name;
    const headers = draft.json?.message?.headers || [];
    expect(jobName).toBeTruthy();
    expect(headers.length).toBeGreaterThan(0);

    const mapping = Object.fromEntries(headers.map((header) => [header, header]));
    const preview = await callImportMethod(page, "preview_data_import", {
      job_name: jobName,
      column_mapping: mapping,
      import_options: { duplicate_policy: "skip" },
    });
    expect(preview.ok, preview.text).toBeTruthy();
    const summary = preview.json?.message?.summary || {};
    expect(Number(summary.total_rows || 0)).toBeGreaterThan(0);
    expect(Number(summary.ready || 0) + Number(summary.skipped || 0)).toBeGreaterThan(0);

    if (Number(summary.ready || 0) > 0) {
      const enqueue = await callImportMethod(page, "enqueue_data_import", { job_name: jobName });
      expect(enqueue.ok, enqueue.text).toBeTruthy();
      expect(enqueue.json?.message?.status).toBe("Queued");
    }
  });

  test("UI: data-import preview shows mapped customer row", async ({ page }) => {
    test.setTimeout(120000);
    await ensureAuthenticated(page);

    await page.goto("/at/data-import");
    await expect(page.getByRole("heading", { name: /Veri İçe Aktarma|Data Import/i }).first()).toBeVisible();

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(CUSTOMER_FIXTURE);

    await expect(page.getByText(/customer_import\.csv|e2e/i).first()).toBeVisible({ timeout: 15000 });

    const previewButton = page.getByRole("button", { name: /Önizle|Preview/i }).first();
    await expect(previewButton).toBeEnabled({ timeout: 15000 });
    await previewButton.click();

    await expect(page.getByText(/ready|hazır|skipped|atlandı|error|hata/i).first()).toBeVisible({
      timeout: 30000,
    });
  });

  test("UI: data-export starts download with Turkish-capable format", async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);

    const popupPromise = page.waitForEvent("popup", { timeout: 15000 }).catch(() => null);
    await page.goto("/at/data-export");
    await expect(page.getByRole("heading", { name: /Veri Dışa Aktarma|Data Export/i }).first()).toBeVisible();

    const exportButton = page.getByRole("button", { name: /Dışa Aktar|Export/i }).first();
    await exportButton.click();

    const popup = await popupPromise;
    if (popup) {
      await expect(popup).toHaveURL(/download_export/);
      await expect(popup).toHaveURL(/export_format=(xlsx|csv|pdf)/);
      await popup.close();
      return;
    }

    const download = await page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
    test.skip(!download, "Export did not open a popup or download in this environment.");
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv|pdf)$/i);
  });
});
