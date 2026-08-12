import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const smokeSource = fs.readFileSync(
  path.resolve(process.cwd(), "tests/e2e/at-smoke.spec.js"),
  "utf8",
);

describe("sidebar diagnostics route privacy", () => {
  it("sanitizes pathname before storing it in a snapshot", () => {
    expect(smokeSource).toContain("function sanitizeDiagnosticRoute(pathname)");
    expect(smokeSource).toContain("route: sanitizeDiagnosticRoute(window.location.pathname)");
    expect(smokeSource).not.toContain("route: window.location.pathname");
  });

  it("allows only static shell route categories and strips dynamic segments", () => {
    expect(smokeSource).toContain("const safeRouteCategories = new Set([\"at\", \"desk\", \"login\"])");
    expect(smokeSource).toContain("return `/${category}`");
    expect(smokeSource).toContain("return \"/at\"");
  });
});
