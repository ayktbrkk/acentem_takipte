import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth";

async function capturePageIssues(page) {
  const consoleMessages = [];
  const pageErrors = [];
  const failedResponses = [];

  page.on("console", (message) => {
    const type = message.type();
    if (type === "error" || type === "warning") {
      consoleMessages.push(`[${type}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message || error));
  });
  page.on("response", async (response) => {
    if (!response.url().includes("/api/method/")) return;
    if (response.ok()) return;
    try {
      const body = await response.text();
      failedResponses.push(`${response.status()} ${response.url()} :: ${body.slice(0, 300)}`);
    } catch (error) {
      failedResponses.push(`${response.status()} ${response.url()} :: ${String(error?.message || error)}`);
    }
  });

  return { consoleMessages, pageErrors, failedResponses };
}

test.describe("debug live pages", () => {
  test("offer board, renewals board and reports should render without fatal errors", async ({ page }) => {
    await ensureAuthenticated(page);

    await test.step("OfferBoard", async () => {
      const issues = await capturePageIssues(page);
      await page.goto("/at/offers");
      await page.waitForLoadState("networkidle").catch(() => {});
      await expect(page.getByText(/Teklif|Offer/i).first()).toBeVisible({ timeout: 15000 });
      expect(issues.pageErrors, `OfferBoard page errors: ${issues.pageErrors.join("\n")}`).toEqual([]);
      expect(issues.failedResponses, `OfferBoard failed responses: ${issues.failedResponses.join("\n")}`).toEqual([]);
    });

    await test.step("RenewalsBoard", async () => {
      const issues = await capturePageIssues(page);
      await page.goto("/at/renewals");
      await page.waitForLoadState("networkidle").catch(() => {});
      await expect(page.getByText(/Yenile|Renewal/i).first()).toBeVisible({ timeout: 15000 });
      expect(issues.pageErrors, `RenewalsBoard page errors: ${issues.pageErrors.join("\n")}`).toEqual([]);
      expect(issues.failedResponses, `RenewalsBoard failed responses: ${issues.failedResponses.join("\n")}`).toEqual([]);
    });

    await test.step("Reports", async () => {
      const issues = await capturePageIssues(page);
      await page.goto("/at/reports");
      await page.waitForLoadState("networkidle").catch(() => {});
      await expect(page.getByText(/Rapor|Report/i).first()).toBeVisible({ timeout: 15000 });
      expect(issues.pageErrors, `Reports page errors: ${issues.pageErrors.join("\n")}`).toEqual([]);
      expect(issues.failedResponses, `Reports failed responses: ${issues.failedResponses.join("\n")}`).toEqual([]);
    });
  });
});
