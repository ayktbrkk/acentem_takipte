import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { COMMON_TRANSLATIONS } from "./common_translations";
import { ACCESS_REQUEST_TRANSLATIONS } from "./access_request_translations";
import { ROUTER_TRANSLATIONS } from "./router_translations";
import { QUICK_CREATE_TRANSLATIONS } from "./quick_create_translations";
import { AUX_WORKBENCH_ROUTE_DEFS } from "./auxWorkbench";
import { translateText } from "../utils/i18n";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, "..");

function readSource(relativePath) {
  return readFileSync(resolve(srcRoot, relativePath), "utf8");
}

function expectTranslationParity(name, translations) {
  const trKeys = Object.keys(translations.tr || {}).sort();
  const enKeys = Object.keys(translations.en || {}).sort();
  expect(enKeys, `${name} has missing or extra EN keys`).toEqual(trKeys);
}

function collectQuickCreateRegistryKeys() {
  const registrySource = readSource("config/quickCreate/registry.js");
  return [...new Set([...registrySource.matchAll(/i18nLabel\("([^"]+)"\)/g)].map((match) => match[1]))].sort();
}

function collectUnresolvedKeys(keys, locale = "tr") {
  return keys.filter((key) => key && translateText(key, locale) === key && /[_]/.test(key));
}

describe("Group 8 translation audit", () => {
  it("keeps Group 8 translation maps symmetric", () => {
    expectTranslationParity("common", COMMON_TRANSLATIONS);
    expectTranslationParity("access_request", ACCESS_REQUEST_TRANSLATIONS);
    expectTranslationParity("router", ROUTER_TRANSLATIONS);
    expectTranslationParity("quick_create", QUICK_CREATE_TRANSLATIONS);
  });

  it("resolves shared ListTable keys for TR and EN", () => {
    expect(translateText("days", "tr")).toBe("gün");
    expect(translateText("days", "en")).toBe("days");
    expect(translateText("preview", "tr")).toBe("Önizleme");
    expect(translateText("preview", "en")).toBe("Preview");
    expect(translateText("no_records_found", "tr")).toBe("Kayıt bulunamadı");
    expect(translateText("no_records_found", "en")).toBe("No records found");
  });

  it("resolves quick create registry keys for TR locale", () => {
    const keys = collectQuickCreateRegistryKeys();
    const unresolved = collectUnresolvedKeys(keys, "tr");
    expect(unresolved, `unresolved quick create keys: ${unresolved.join(", ")}`).toEqual([]);
  });

  it("resolves quick create eyebrows and validation messages", () => {
    const keys = [
      "Quick Create",
      "Quick Policy Entry",
      "Quick Lead",
      "Quick Offer",
      "Quick Customer",
      "Quick Claim",
      "Please fill required fields.",
      "Create failed.",
      "Disabled for corporate customers.",
    ];
    const unresolved = collectUnresolvedKeys(keys, "tr");
    expect(unresolved).toEqual([]);
  });

  it("covers router translation aliases for legacy string meta titles", () => {
    const legacyKeys = [
      "Genel Ayarlar",
      "Uyarı Kanal Ayarları",
      "Prim Raporu",
      "Hasar Oranı Raporu",
      "Temsilci Performans Raporu",
      "Müşteri Segmentasyon Raporu",
      "İletişim Merkezi",
      "Yönetim Ayarları",
      "İletişim",
    ];
    for (const key of legacyKeys) {
      expect(translateText(key, "en"), `missing EN alias for ${key}`).not.toBe(key);
      expect(translateText(key, "tr"), `missing TR alias for ${key}`).toBeTruthy();
    }
  });

  it("documents aux route titles via localized meta objects", () => {
    for (const def of AUX_WORKBENCH_ROUTE_DEFS) {
      expect(def.meta?.title?.tr, `${def.key} list TR title`).toBeTruthy();
      expect(def.meta?.title?.en, `${def.key} list EN title`).toBeTruthy();
      expect(def.detailMeta?.title?.tr, `${def.key} detail TR title`).toBeTruthy();
      expect(def.detailMeta?.title?.en, `${def.key} detail EN title`).toBeTruthy();
    }
  });

  it("uses localized empty-state defaults in shared table and empty components", () => {
    const listTable = readSource("components/ui/ListTable.vue");
    const emptyState = readSource("components/app-shell/EmptyState.vue");
    expect(listTable).toContain("resolvedEmptyMessage");
    expect(listTable).toContain('translateText("no_records_found"');
    expect(emptyState).toContain("resolvedTitle");
    expect(emptyState).toContain('translateText("no_records_found"');
  });
});
