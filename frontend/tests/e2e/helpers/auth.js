import { test } from "@playwright/test";

export async function ensureAuthenticated(page, options = {}) {
  const userEnvKey = options.userEnvKey || "E2E_USER";
  const passwordEnvKey = options.passwordEnvKey || "E2E_PASSWORD";
  const envUser = process.env[userEnvKey];
  const envPassword = process.env[passwordEnvKey];
  const baseURL = String(process.env.E2E_BASE_URL || "http://localhost:8080");
  const allowLocalFallback =
    /localhost|127\.0\.0\.1/i.test(baseURL) &&
    !["0", "false", "False", "FALSE"].includes(String(process.env.E2E_ALLOW_LOCAL_FALLBACK || "1"));
  const loginUser = envUser || (allowLocalFallback ? "Administrator" : "");
  const loginPassword = envPassword || (allowLocalFallback ? "admin" : "");
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
    `Authenticated session required. Set ${userEnvKey}/${passwordEnvKey} or enable localhost fallback credentials.`
  );
  return !stillGuest;
}
