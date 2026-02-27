import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:8080";
const traceMode = process.env.E2E_TRACE_MODE || "retain-on-failure";
const headlessEnv = process.env.E2E_HEADLESS;
const headless =
  headlessEnv == null ? true : !["0", "false", "False", "FALSE"].includes(String(headlessEnv));

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    headless,
    trace: traceMode,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
