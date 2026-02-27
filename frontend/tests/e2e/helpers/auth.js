import { test } from "@playwright/test";

export async function ensureAuthenticated(page, options = {}) {
  const userEnvKey = options.userEnvKey || "E2E_USER";
  const passwordEnvKey = options.passwordEnvKey || "E2E_PASSWORD";
  const loginUser = process.env[userEnvKey];
  const loginPassword = process.env[passwordEnvKey];
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

        return { ok: response.ok, status: response.status };
      },
      { user: loginUser, password: loginPassword }
    );

    if (!loginResult.ok) {
      throw new Error(`Authentication request failed (${loginResult.status}) for E2E credentials.`);
    }
  }

  await page.goto("/at/");
  const stillGuest = await page
    .getByRole("heading", { name: /Login to Frappe/i })
    .isVisible()
    .catch(() => false);

  if (stillGuest && hasCredentials) {
    throw new Error(
      `Authentication failed for provided ${userEnvKey}/${passwordEnvKey} credentials.`
    );
  }

  test.skip(
    stillGuest,
    `Authenticated session required. Set ${userEnvKey}/${passwordEnvKey}.`
  );
  return !stillGuest;
}
