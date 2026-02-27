import { expect, test } from "@playwright/test";

test.describe("Acentem Takipte smoke", () => {
  test("dashboard -> offers -> policies navigation", async ({ page }) => {
    const loginUser = process.env.E2E_USER;
    const loginPassword = process.env.E2E_PASSWORD;
    const hasCredentials = Boolean(loginUser && loginPassword);
    let user = "Guest";

    const sessionResponse = await page.request.get("/api/method/frappe.auth.get_logged_user");
    if (sessionResponse.ok()) {
      const initialPayload = await sessionResponse.json();
      user = initialPayload?.message || "Guest";
    } else if (!hasCredentials) {
      test.skip(
        true,
        "Session endpoint requires auth. Set E2E_USER and E2E_PASSWORD for auto-login."
      );
      return;
    }

    if (user === "Guest") {
      if (hasCredentials) {
        const loginResponse = await page.request.post("/api/method/login", {
          form: {
            usr: loginUser,
            pwd: loginPassword,
          },
        });
        if (!loginResponse.ok()) {
          throw new Error(`Auto-login request failed with status ${loginResponse.status()}`);
        }

        const afterLoginResponse = await page.request.get("/api/method/frappe.auth.get_logged_user");
        if (afterLoginResponse.ok()) {
          const afterLoginPayload = await afterLoginResponse.json();
          user = afterLoginPayload?.message || "Guest";
        }
      }
    }

    if (hasCredentials && user === "Guest") {
      throw new Error("Auto-login failed. Check E2E_USER/E2E_PASSWORD credentials.");
    }

    test.skip(
      user === "Guest",
      "Authenticated session is required. Set E2E_USER and E2E_PASSWORD for auto-login."
    );

    await page.goto("/at/");
    await expect(page.getByText("Dashboard").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Offers|Teklif/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Policies|Police/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /Offers|Teklif/i }).first().click();
    await expect(page).toHaveURL(/\/at\/offers/);
    await expect(page.getByRole("heading", { name: /Offer Board|Teklif/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /Policies|Police/i }).first().click();
    await expect(page).toHaveURL(/\/at\/policies/);
    await expect(page.getByRole("heading", { name: /Policy Workbench|Police/i }).first()).toBeVisible();
  });
});
