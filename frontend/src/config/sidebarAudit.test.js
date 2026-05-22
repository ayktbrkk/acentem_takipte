import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { SIDEBAR_TRANSLATIONS } from "./sidebar_translations";
import { OFFER_TRANSLATIONS } from "./offer_translations";
import { REPORTS_TRANSLATIONS } from "./reports_translations";
import { AUX_WORKBENCH_ROUTE_DEFS } from "./auxWorkbench";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, "..");

function readSource(relativePath) {
  return readFileSync(resolve(srcRoot, relativePath), "utf8");
}

function extractSidebarLinks() {
  const source = readSource("composables/useSidebarNavigation.js");
  return Array.from(source.matchAll(/\{\s*key:\s*"([^"]+)"[\s\S]*?to:\s*"([^"]+)"/g))
    .map(([, key, to]) => ({ key, to }));
}

function extractRouterPaths() {
  const source = readSource("router/index.js");
  const directPaths = Array.from(source.matchAll(/path:\s*"([^"]+)"/g)).map(([, path]) => path);
  const auxPaths = AUX_WORKBENCH_ROUTE_DEFS.flatMap((def) => [def.listPath, def.detailPath]);
  return new Set([...directPaths, ...auxPaths]);
}

function expectTranslationParity(name, translations) {
  const trKeys = Object.keys(translations.tr || {}).sort();
  const enKeys = Object.keys(translations.en || {}).sort();
  expect(enKeys, `${name} has missing or extra EN keys`).toEqual(trKeys);
}

describe("sidebar page audit guardrails", () => {
  it("keeps every sidebar link backed by a runtime /at route", () => {
    const routePaths = extractRouterPaths();
    const missing = extractSidebarLinks().filter((item) => !routePaths.has(item.to));

    expect(missing).toEqual([]);
  });

  it("keeps shell and audited page translation maps symmetric", () => {
    expectTranslationParity("sidebar", SIDEBAR_TRANSLATIONS);
    expectTranslationParity("offers", OFFER_TRANSLATIONS);
    expectTranslationParity("reports", REPORTS_TRANSLATIONS);
  });

  it("uses domain-correct TR and EN insurance terms for audited shell links", () => {
    expect(SIDEBAR_TRANSLATIONS.tr.policies).toBe("Poliçeler");
    expect(SIDEBAR_TRANSLATIONS.en.policies).toBe("Policies");
    expect(SIDEBAR_TRANSLATIONS.tr.claims).toBe("Hasarlar");
    expect(SIDEBAR_TRANSLATIONS.en.claims).toBe("Claims");
    expect(SIDEBAR_TRANSLATIONS.tr.renewals).toBe("Yenilemeler");
    expect(SIDEBAR_TRANSLATIONS.en.renewals).toBe("Renewals");
    expect(SIDEBAR_TRANSLATIONS.tr.reconciliation).toBe("Mutabakat");
    expect(SIDEBAR_TRANSLATIONS.en.reconciliation).toBe("Reconciliation");
    expect(SIDEBAR_TRANSLATIONS.tr.accountingEntries).toBe("Muhasebe Kayıtları");
    expect(SIDEBAR_TRANSLATIONS.en.accountingEntries).toBe("Accounting Entries");
  });
});
