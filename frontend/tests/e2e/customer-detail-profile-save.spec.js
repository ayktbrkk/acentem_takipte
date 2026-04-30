import { expect, test } from "@playwright/test";

import { ensureAuthenticated, pageRequest } from "./helpers/auth.js";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fieldContainer(page, pattern) {
  return page.getByLabel(pattern).first();
}

async function getFieldInput(page, pattern) {
  const input = fieldContainer(page, pattern);
  await expect(input).toBeVisible();
  return input;
}

async function getFirstCustomerName(page) {
  const response = await pageRequest(page, "POST", "/api/method/frappe.client.get_list", {
    form: {
      doctype: "AT Customer",
      fields: JSON.stringify(["name"]),
      order_by: "modified desc",
      limit_page_length: 1,
    },
  });

  if (!response.ok) {
    return null;
  }

  const rows = Array.isArray(response.json?.message) ? response.json.message : [];
  return rows[0]?.name || null;
}

test("Customer profile save reflects immediately and filters use Hepsi", async ({ page }) => {
  test.setTimeout(90000);
  await ensureAuthenticated(page, {
    userEnvKey: "E2E_USER",
    passwordEnvKey: "E2E_PASSWORD",
  });

  await page.goto("/at/customers", { waitUntil: "networkidle" });

  const trButton = page.getByRole("button", { name: /^TR$/i });
  if (await trButton.isVisible().catch(() => false)) {
    await trButton.click();
  }

  const filterSelects = page.locator("select");
  const filterSelectCount = await filterSelects.count();
  expect(filterSelectCount, "Sayfada en az bir select filtresi görünmeli").toBeGreaterThan(0);

  const selectedFilterOption = page.locator("select option:checked").first();
  const hepsiOptionCount = await selectedFilterOption.filter({ hasText: /Hepsi|All/i }).count();
  expect.soft(hepsiOptionCount, "Filtrelerde ilk seçenek metni Hepsi olmalı").toBeGreaterThan(0);

  const customerName = await getFirstCustomerName(page);
  expect(customerName, "Test için en az bir müşteri kaydı olmalı").toBeTruthy();

  await page.goto(`/at/customers/${encodeURIComponent(customerName)}`, { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/at\/customers\//);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  await page.getByRole("button", { name: /Düzenle|Edit/i }).first().click();

  const fullNameInput = await getFieldInput(page, /AD SOYAD|Ad Soyad|FULL NAME|Full Name/i);
  const phoneInput = await getFieldInput(page, /CEP TELEFONU|Cep Telefonu|PHONE|Phone|MOBILE PHONE|Mobile Phone/i);

  const originalFullName = (await fullNameInput.inputValue()).trim();
  const originalPhone = (await phoneInput.inputValue()).trim();

  const newFullName = originalFullName.endsWith(" PW") ? `${originalFullName}2` : `${originalFullName} PW`;
  const newPhone = "5559876543";

  await fullNameInput.fill(newFullName);
  await phoneInput.fill(newPhone);

  await page.getByRole("button", { name: /Kaydet|Save/i }).click();

  await expect(page.getByText(/Değişiklikler başarıyla kaydedildi\.|Changes saved successfully\./i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Düzenle|Edit/i }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(escapeRegExp(newFullName), "i") })).toBeVisible();
  await expect(page.getByText(newPhone, { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: /Düzenle|Edit/i }).first().click();
  await expect((await getFieldInput(page, /AD SOYAD|Ad Soyad|FULL NAME|Full Name/i))).toHaveValue(newFullName);
  await page.getByRole("button", { name: /İptal|Cancel/i }).click();

  // Roll back for repeatable test runs.
  try {
    await page.getByRole("button", { name: /Düzenle|Edit/i }).first().click();

    await (await getFieldInput(page, /AD SOYAD|Ad Soyad|FULL NAME|Full Name/i)).fill(originalFullName);
    await (await getFieldInput(page, /CEP TELEFONU|Cep Telefonu|PHONE|Phone|MOBILE PHONE|Mobile Phone/i)).fill(originalPhone);

    await page.getByRole("button", { name: /Kaydet|Save/i }).click();
  } catch {
    // Cleanup should not hide primary assertion results.
  }
});
