import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { useAuxRecordDetailQuickDialogs } from "./useAuxRecordDetailQuickDialogs";

const createdResources = [];

vi.mock("frappe-ui", () => ({
  createResource: (config = {}) => {
    const resource = {
      url: String(config?.url || ""),
      doctype: String(config?.params?.doctype || ""),
      data: ref([]),
      loading: ref(false),
      error: ref(null),
      params: { ...(config?.params || {}) },
      reload: vi.fn(async () => []),
      submit: vi.fn(async () => ({})),
    };
    createdResources.push(resource);
    return resource;
  },
}));

describe("useAuxRecordDetailQuickDialogs", () => {
  beforeEach(() => {
    createdResources.splice(0, createdResources.length);
  });

  it("hydrates branch edit sources and normalizes payload values", async () => {
    const reloadDetail = vi.fn(async () => ({}));
    const branchStore = {
      items: [
        { value: "IST", label: "Istanbul" },
        { value: "ANK", label: "Ankara" },
      ],
      selected: { officeBranch: "IST" },
    };
    const authStore = {
      can: vi.fn(() => true),
    };
    const doc = ref({
      name: "BR-001",
      branch_name: "  Merkez  ",
      branch_code: "BR-001",
      insurance_company: "IC-001",
      is_active: "1",
    });
    const config = {
      doctype: "AT Branch",
      quickEdit: {
        registryKey: "branch_master_edit",
        label: { tr: "Hızlı Düzenle", en: "Quick Edit" },
      },
    };

    const composable = useAuxRecordDetailQuickDialogs({
      props: { name: "BR-001" },
      config,
      activeLocale: ref("tr"),
      authStore,
      branchStore,
      activeDoctype: ref("AT Branch"),
      doc,
      reloadDetail,
      localize: (value) => value?.tr || value?.en || "",
      t: (key) => key,
    });

    const insuranceResource = createdResources.find((resource) => resource.doctype === "AT Insurance Company");
    expect(insuranceResource).toBeTruthy();
    insuranceResource.data.value = [
      { name: "IC-001", company_name: "Acme Sigorta", company_code: "AC" },
    ];

    const resetForm = vi.fn();
    await composable.prepareQuickEditDialog({ form: {}, resetForm });

    expect(insuranceResource.reload).toHaveBeenCalled();
    expect(resetForm).toHaveBeenCalledWith({
      branch_name: "  Merkez  ",
      branch_code: "BR-001",
      insurance_company: "IC-001",
      is_active: true,
    });

    expect(composable.quickEditOptionsMap.value.insuranceCompanies).toEqual([
      { value: "IC-001", label: "Acme Sigorta (AC)" },
    ]);

    const payload = await composable.buildQuickEditPayload({
      form: {
        branch_name: "  Yeni Merkez  ",
        branch_code: "  BR-002 ",
        insurance_company: "IC-001",
        is_active: false,
      },
    });

    expect(payload).toEqual({
      doctype: "AT Branch",
      name: "BR-001",
      data: {
        branch_name: "Yeni Merkez",
        branch_code: "BR-002",
        insurance_company: "IC-001",
        is_active: false,
      },
    });

    await composable.afterQuickEditSubmit();
    expect(reloadDetail).toHaveBeenCalled();
  });

  it("returns the configured quick edit definition and copy state", async () => {
    const branchStore = { items: [], selected: {} };
    const authStore = { can: vi.fn(() => true) };
    const composable = useAuxRecordDetailQuickDialogs({
      props: { name: "BR-001" },
      config: {
        doctype: "AT Branch",
        quickEdit: {
          registryKey: "branch_master_edit",
          label: { tr: "Hızlı Düzenle", en: "Quick Edit" },
        },
      },
      activeLocale: ref("en"),
      authStore,
      branchStore,
      activeDoctype: ref("AT Branch"),
      doc: ref({ name: "BR-001" }),
      reloadDetail: vi.fn(),
      localize: (value) => value?.tr || value?.en || "",
      t: (key) => key,
    });

    expect(composable.quickEditConfig.value.registryKey).toBe("branch_master_edit");
    expect(composable.quickEditEyebrow.value).toBe("Hızlı Düzenle");
    expect(composable.canUseQuickEdit.value).toBe(true);
    expect(getQuickCreateConfig("branch_master_edit")).toBeTruthy();
  });
});
