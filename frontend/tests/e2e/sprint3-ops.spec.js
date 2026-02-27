import { expect, test } from "@playwright/test";

async function ensureAuthenticated(page) {
  const loginUser = process.env.E2E_USER;
  const loginPassword = process.env.E2E_PASSWORD;
  const hasCredentials = Boolean(loginUser && loginPassword);

  if (hasCredentials) {
    await page.goto("/login");
    const loginResult = await page.evaluate(
      async ({ user, password }) => {
        const payload = new URLSearchParams({ usr: user, pwd: password });
        const response = await fetch("/api/method/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: payload.toString(),
        });

        let message = "";
        try {
          const json = await response.json();
          message = json?.message || "";
        } catch {
          message = "";
        }

        return {
          ok: response.ok,
          message,
        };
      },
      { user: loginUser, password: loginPassword }
    );

    if (!loginResult.ok) {
      throw new Error("Authentication request failed for E2E credentials.");
    }
  }

  await page.goto("/at/");
  const stillGuest = await page
    .getByRole("heading", { name: /Login to Frappe/i })
    .isVisible()
    .catch(() => false);

  if (stillGuest && hasCredentials) {
    throw new Error("Authentication failed for provided E2E_USER/E2E_PASSWORD credentials.");
  }

  test.skip(stillGuest, "Authenticated session required. Set E2E_USER/E2E_PASSWORD.");
  return !stillGuest;
}

test.describe("Sprint 3 operations", () => {
  test("communication center loads and dispatch action is visible", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.goto("/at/communication");
    await expect(page.getByRole("heading", { name: /Communication Center/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Dispatch|Run Dispatch|Dispatch Calistir/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Outbox/i })).toBeVisible();
  });

  test("reconciliation workbench loads and actions are visible", async ({ page }) => {
    await ensureAuthenticated(page);

    await page.goto("/at/reconciliation");
    await expect(page.getByRole("heading", { name: /Reconciliation Workbench/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Run Reconciliation|Mutabakat Calistir/i })).toBeVisible();
    await expect(page.getByText(/Acik Fark|Open Items/i).first()).toBeVisible();
  });
});
