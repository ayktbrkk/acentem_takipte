import { test } from "@playwright/test";

export async function pageRequest(page, method, path, options = {}) {
  return page.evaluate(
    async ({ requestMethod, requestPath, requestOptions }) => {
      const headers = new Headers(requestOptions.headers || {});
      const csrfToken =
        requestOptions.csrfToken
        || (typeof window !== "undefined" && window.csrf_token)
        || "";

      if (csrfToken && !headers.has("X-Frappe-CSRF-Token")) {
        headers.set("X-Frappe-CSRF-Token", csrfToken);
      }

      let body;
      if (requestOptions.form) {
        body = new URLSearchParams();
        for (const [key, value] of Object.entries(requestOptions.form)) {
          if (value == null) continue;
          body.append(key, String(value));
        }
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        }
      } else if (requestOptions.body != null) {
        body = requestOptions.body;
      }

      const response = await fetch(requestPath, {
        method: requestMethod,
        headers,
        body,
        credentials: "include",
      });

      const text = await response.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        text,
        json,
      };
    },
    {
      requestMethod: method,
      requestPath: path,
      requestOptions: options,
    }
  );
}

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
