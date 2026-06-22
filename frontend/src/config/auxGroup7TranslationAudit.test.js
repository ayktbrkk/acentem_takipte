import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AUX_WORKBENCH_TRANSLATIONS } from "./aux_workbench_translations";
import { AUX_DETAIL_TRANSLATIONS } from "./aux_detail_translations";
import { DOCUMENT_TRANSLATIONS } from "./document_translations";
import { WORKBENCH_FILE_UPLOAD_TRANSLATIONS } from "./workbench_file_upload_translations";
import { SIDEBAR_TRANSLATIONS } from "./sidebar_translations";
import { AUX_WORKBENCH_FIELD_LABELS } from "./aux_workbench_field_labels";
import { AUX_DETAIL_FIELD_LABELS } from "./aux_detail_field_labels";
import { AUX_WORKBENCH_CONFIGS } from "./auxWorkbench/registry";

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

function expectFieldLabelParity(name, labels) {
  const trConfigs = Object.keys(labels.tr || {}).sort();
  const enConfigs = Object.keys(labels.en || {}).sort();
  expect(enConfigs, `${name} config keys differ between TR and EN`).toEqual(trConfigs);
  for (const configKey of trConfigs) {
    const trFields = Object.keys(labels.tr[configKey] || {}).sort();
    const enFields = Object.keys(labels.en[configKey] || {}).sort();
    expect(enFields, `${name}.${configKey} field keys differ`).toEqual(trFields);
  }
}

function expectDetailFieldLabelParity(labels) {
  const configKeys = Object.keys(labels).sort();
  for (const configKey of configKeys) {
    const trFields = Object.keys(labels[configKey]?.tr || {}).sort();
    const enFields = Object.keys(labels[configKey]?.en || {}).sort();
    expect(enFields, `aux_detail_field_labels.${configKey} field keys differ`).toEqual(trFields);
  }
}

describe("Group 7 translation audit", () => {
  it("keeps Group 7 translation maps symmetric", () => {
    expectTranslationParity("aux_workbench", AUX_WORKBENCH_TRANSLATIONS);
    expectTranslationParity("aux_detail", AUX_DETAIL_TRANSLATIONS);
    expectTranslationParity("document", DOCUMENT_TRANSLATIONS);
    expectTranslationParity("workbench_file_upload", WORKBENCH_FILE_UPLOAD_TRANSLATIONS);
    expectTranslationParity("sidebar", SIDEBAR_TRANSLATIONS);
  });

  it("keeps aux field label maps symmetric and config-aligned", () => {
    expectFieldLabelParity("aux_workbench_field_labels", AUX_WORKBENCH_FIELD_LABELS);
    expectDetailFieldLabelParity(AUX_DETAIL_FIELD_LABELS);

    const registryKeys = Object.keys(AUX_WORKBENCH_CONFIGS).sort();
    expect(Object.keys(AUX_WORKBENCH_FIELD_LABELS.en).sort()).toEqual(registryKeys);
    expect(Object.keys(AUX_DETAIL_FIELD_LABELS).sort()).toEqual(registryKeys);
  });

  it("does not keep inline field label maps in Group 7 composables", () => {
    const workbenchVm = readSource("composables/useAuxWorkbenchViewModel.js");
    const detailSummary = readSource("composables/useAuxRecordDetailSummary.js");

    expect(workbenchVm).not.toMatch(/const AUX_FIELD_LABELS\s*=/);
    expect(detailSummary).not.toMatch(/const AUX_DETAIL_FIELD_LABELS\s*=/);
    expect(workbenchVm).toContain('from "../config/aux_workbench_field_labels"');
    expect(detailSummary).toContain('from "../config/aux_detail_field_labels"');
  });

  it("uses domain-correct Turkish insurance terms for audited Group 7 surfaces", () => {
    expect(AUX_WORKBENCH_TRANSLATIONS.tr.openDetail).toBe("Detayı Görüntüle");
    expect(AUX_DETAIL_TRANSLATIONS.tr.valPolicy).toBe("Poliçe");
    expect(AUX_DETAIL_TRANSLATIONS.tr.valClaim).toBe("Hasar");
    expect(DOCUMENT_TRANSLATIONS.tr.kindPolicy).toBe("Poliçe");
    expect(WORKBENCH_FILE_UPLOAD_TRANSLATIONS.tr.linkPolicy).toBe("Poliçe");
    expect(SIDEBAR_TRANSLATIONS.tr.documentCenter).toBe("Doküman Merkezi");
    expect(AUX_WORKBENCH_FIELD_LABELS.tr["at-documents"].policy).toBe("Poliçe");
    expect(AUX_WORKBENCH_FIELD_LABELS.tr["at-documents"].claim).toBe("Hasar");
  });

  it("keeps Turkish casing-friendly labels for İ/i-sensitive terms", () => {
    expect(AUX_WORKBENCH_TRANSLATIONS.tr.inactive).toBe("Pasif");
    expect(AUX_DETAIL_TRANSLATIONS.tr.valInProgress).toBe("Devam Ediyor");
    expect(DOCUMENT_TRANSLATIONS.tr.isSensitive).toBe("Hassas Veri");
    expect(SIDEBAR_TRANSLATIONS.tr.dataImport).toBe("Veri İçe Aktarma");
  });
});
