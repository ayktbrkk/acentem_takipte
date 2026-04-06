import { expect, test } from "@playwright/test";

import { ensureAuthenticated } from "./helpers/auth.js";

function fieldContainer(page, pattern) {
  return page
    .locator("div.rounded-xl.border")
    .filter({ has: page.locator("label", { hasText: pattern }) })
    .first();
}

async function getFieldInput(page, pattern) {
  const container = fieldContainer(page, pattern);
  await expect(container).toBeVisible();
  return container.locator("input, select, textarea").first();
}

test("Customer profile save reflects immediately and filters use Hepsi", async ({ page }) => {
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

  const allFirstOptions = page.locator("select option:first-child");
  const hepsiOptionCount = await allFirstOptions.filter({ hasText: /Hepsi/i }).count();
  expect.soft(hepsiOptionCount, "Filtrelerde ilk seçenek metni Hepsi olmalı").toBeGreaterThan(0);

  const firstRow = page.locator("table tbody tr").filter({ hasText: /Bireysel|Individual/i }).first();
  await expect(firstRow).toBeVisible();
  const customerName = (await firstRow.locator("td").first().innerText()).trim();
  expect(customerName, "Test için en az bir müşteri kaydı olmalı").toBeTruthy();

  await page.goto(`/at/customers/${encodeURIComponent(customerName)}`, { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/at\/customers\//);
  await expect(page.getByText(/Müşteri Profili|Customer Profile/i)).toBeVisible();

  await page
    .locator("section, div")
    .filter({ has: page.getByText(/Müşteri Profili|Customer Profile/i) })
    .getByRole("button", { name: /Düzenle|Edit/i })
    .first()
    .click();

  const fullNameInput = await getFieldInput(page, /AD SOYAD|Ad Soyad|FULL NAME|Full Name/i);
  const birthDateInput = await getFieldInput(page, /DOĞUM TARİHİ|Doğum Tarihi|BIRTH DATE|Birth Date/i);
  const phoneInput = await getFieldInput(page, /CEP TELEFONU|Cep Telefonu|MOBILE PHONE|Mobile Phone/i);
  const agentSelect = await getFieldInput(page, /TEMSİLCİ|Temsilci|ASSIGNED AGENT|Assigned Agent/i);

  const originalFullName = (await fullNameInput.inputValue()).trim();
  const originalBirthDate = (await birthDateInput.inputValue()).trim();
  const originalPhone = (await phoneInput.inputValue()).trim();
  const originalAgent = (await agentSelect.inputValue()).trim();

  const agentOptionsCount = await agentSelect.locator("option").count();
  expect(agentOptionsCount, "Temsilci alanında kullanıcı seçenekleri gelmeli").toBeGreaterThan(1);

  const newFullName = originalFullName.endsWith(" PW") ? `${originalFullName}2` : `${originalFullName} PW`;
  const newBirthDate = "1991-01-15";
  const newPhone = "5559876543";

  await fullNameInput.fill(newFullName);
  await birthDateInput.fill(newBirthDate);
  await phoneInput.fill(newPhone);

  const firstAssignableAgent = agentSelect.locator("option").nth(1);
  const firstAssignableAgentValue = await firstAssignableAgent.getAttribute("value");
  const firstAssignableAgentLabel = (await firstAssignableAgent.innerText()).trim();
  if (firstAssignableAgentValue) {
    await agentSelect.selectOption(firstAssignableAgentValue);
  }

  await page.getByRole("button", { name: /Kaydet|Save/i }).click();

  await expect(page.getByText(/Müşteri bilgileri güncellendi\.|Customer profile updated\./i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Düzenle|Edit/i })).toBeVisible();
  await expect(page.locator("h1.detail-title").filter({ hasText: newFullName })).toBeVisible();
  await expect(page.getByText(newPhone, { exact: false }).first()).toBeVisible();
  await expect.soft(page.getByText(/15\.01\.1991|1991-01-15/).first()).toBeVisible();

  await page
    .locator("section, div")
    .filter({ has: page.getByText(/Müşteri Profili|Customer Profile/i) })
    .getByRole("button", { name: /Düzenle|Edit/i })
    .first()
    .click();
  await expect((await getFieldInput(page, /DOĞUM TARİHİ|Doğum Tarihi|BIRTH DATE|Birth Date/i))).toHaveValue(newBirthDate);
  await page.getByRole("button", { name: /İptal|Cancel/i }).click();
  if (firstAssignableAgentValue) {
    await expect(page.getByText(firstAssignableAgentLabel, { exact: false }).first()).toBeVisible();
  }

  // Roll back for repeatable test runs.
  try {
    await page
      .locator("section, div")
      .filter({ has: page.getByText(/Müşteri Profili|Customer Profile/i) })
      .getByRole("button", { name: /Düzenle|Edit/i })
      .first()
      .click();

    await (await getFieldInput(page, /AD SOYAD|Ad Soyad|FULL NAME|Full Name/i)).fill(originalFullName);
    await (await getFieldInput(page, /DOĞUM TARİHİ|Doğum Tarihi|BIRTH DATE|Birth Date/i)).fill(originalBirthDate);
    await (await getFieldInput(page, /CEP TELEFONU|Cep Telefonu|MOBILE PHONE|Mobile Phone/i)).fill(originalPhone);
    await (await getFieldInput(page, /TEMSİLCİ|Temsilci|ASSIGNED AGENT|Assigned Agent/i)).selectOption(originalAgent || "");

    await page.getByRole("button", { name: /Kaydet|Save/i }).click();
  } catch {
    // Cleanup should not hide primary assertion results.
  }
});
