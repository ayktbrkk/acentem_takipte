import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth";

async function clickFirstRow(page) {
  const rows = page.locator("tbody tr.at-table-row");
  await rows.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  const count = await rows.count();
  if (!count) return false;
  await rows.first().click();
  return true;
}

test.describe.serial("Critical Production Flows", () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test("Policy Creation Flow (via Customer)", async ({ page }) => {
    await page.goto("/at/customers");
    const opened = await clickFirstRow(page);
    test.skip(!opened, "No customer rows available.");

    // Click 'New Policy' button in customer detail
    const newPolicyBtn = page.getByRole("button", { name: /Yeni Poliçe|New Policy/i }).first();
    await expect(newPolicyBtn).toBeVisible();
    await newPolicyBtn.click();

    // Verify Quick Create Form
    await expect(page).toHaveURL(/\/at\/policies/);
    await expect(page.getByText(/Hızlı Poliçe|Quick Policy|Yeni Poliçe/i).first()).toBeVisible();

    // Fill minimum fields
    // Assuming fields are named 'policy_no', 'insurance_company', etc.
    // This is a smoke test, so we verify the form opens and fields are present.
    await expect(page.locator('input[name="policy_no"]')).toBeVisible();
  });

  test("Payment / Collection Flow (via Policy)", async ({ page }) => {
    await page.goto("/at/policies");
    const opened = await clickFirstRow(page);
    test.skip(!opened, "No policy rows available.");

    // Click 'New Payment' button in policy detail
    const newPaymentBtn = page.getByRole("button", { name: /Yeni Tahsilat|Yeni Ödeme|New Payment/i }).first();
    await expect(newPaymentBtn).toBeVisible();
    await newPaymentBtn.click();

    // Verify Quick Create Form
    await expect(page).toHaveURL(/\/at\/payments/);
    await expect(page.getByText(/Hızlı Tahsilat|Quick Payment|Yeni Tahsilat/i).first()).toBeVisible();
    
    await expect(page.locator('input[name="amount"]')).toBeVisible();
  });
});
