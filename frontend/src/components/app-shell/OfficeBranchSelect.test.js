import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import OfficeBranchSelect from "./OfficeBranchSelect.vue";
import { useAuthStore } from "../../stores/auth";
import { useBranchStore } from "../../stores/branch";
import { setPreferredLocale } from "../../state/session";

const routerReplace = vi.fn(async () => {});

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn(), afterEach: vi.fn(), currentRoute: { value: { query: {} } } }),
  createWebHistory: vi.fn(() => ({})),
  useRouter: () => ({ replace: routerReplace }),
  useRoute: () => ({ path: "/at", query: {}, hash: "" }),
}));

describe("OfficeBranchSelect", () => {
  afterEach(() => {
    setPreferredLocale("en");
  });

  beforeEach(() => {
    routerReplace.mockReset();
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    setPreferredLocale("tr");
    authStore.applyContext({
      user: "manager@example.com",
      full_name: "AT Manager",
      roles: ["AT Manager"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      office_branches: [
        { name: "HQ", office_branch_name: "AT Sigorta", is_head_office: 1, is_default: 1 },
        { name: "SUB", office_branch_name: "Ankara", parent_office_branch: "HQ", is_default: 0 },
      ],
      default_office_branch: "HQ",
      can_access_all_office_branches: false,
    });

    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
  });

  it("renders hierarchical branch labels", async () => {
    const wrapper = mount(OfficeBranchSelect);

    const trigger = wrapper.get('[data-testid="branch-scope-trigger"]');
    expect(trigger.attributes("aria-label")).toBe("Şube Kapsamı: AT Sigorta");
    expect(trigger.text()).toContain("AT Sigorta");
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);

    await wrapper.get('[data-testid="branch-scope-trigger"]').trigger("click");
    const allOption = wrapper.find('[data-testid="branch-option-all"]');
    expect(allOption.exists()).toBe(false);

    const options = wrapper
      .findAll('[data-testid^="branch-option-"]')
      .map((node) => node.find(".branch-option-label").text().trim());

    expect(options).toEqual(["AT Sigorta", "Ankara"]);
    expect(wrapper.text()).toContain("Merkez");
  });

  it("keeps the scope card bounded and exposes a clear locked state", () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      office_branches: [{ name: "HQ", office_branch_name: "AT Sigorta", is_head_office: 1, is_default: 1 }],
      default_office_branch: "HQ",
      can_access_all_office_branches: false,
    });
    useBranchStore().hydrateFromSession();

    const wrapper = mount(OfficeBranchSelect);

    expect(wrapper.classes()).toContain("max-w-full");
    expect(wrapper.classes()).toContain("md:max-w-[300px]");
    expect(wrapper.text()).toContain("Sabit kapsam");
    expect(wrapper.get('[data-testid="branch-scope-trigger"]').attributes("disabled")).toBeDefined();
  });

  it("retains long branch labels and locks the selection without losing the status text", () => {
    const longLabel = "Istanbul Anadolu Yakasi Merkez Acenteler Operasyon Subesi";
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      office_branches: [{ name: "LONG", office_branch_name: longLabel, is_default: 1 }],
      default_office_branch: "LONG",
      can_access_all_office_branches: false,
    });
    useBranchStore().hydrateFromSession();

    const wrapper = mount(OfficeBranchSelect);

    expect(wrapper.get('[data-testid="branch-scope-trigger"]').text()).toContain(longLabel);
    expect(wrapper.get('[data-testid="branch-scope-lock-status"]').text()).toContain("Sabit kapsam");
    expect(wrapper.get('[data-testid="branch-scope-trigger"]').attributes("disabled")).toBeDefined();
  });

  it("uses the English scope label and all-branches value", () => {
    const authStore = useAuthStore();
    setPreferredLocale("en");
    authStore.applyContext({
      locale: "en",
      can_access_all_office_branches: true,
    });
    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
    branchStore.setActiveBranch("");

    const wrapper = mount(OfficeBranchSelect);
    const trigger = wrapper.get('[data-testid="branch-scope-trigger"]');

    expect(trigger.attributes("aria-label")).toBe("Branch Scope: All Branches");
    expect(trigger.text()).toContain("All Branches");
  });

  it("supports keyboard navigation and selection", async () => {
    const wrapper = mount(OfficeBranchSelect);
    const trigger = wrapper.get('[data-testid="branch-scope-trigger"]');

    await trigger.trigger("keydown", { key: "ArrowDown" });
    await trigger.trigger("keydown", { key: "ArrowDown" });
    await trigger.trigger("keydown", { key: "Enter" });

    const branchStore = useBranchStore();
    expect(branchStore.selected).toBe("SUB");
    expect(routerReplace).toHaveBeenCalledTimes(1);
  });

  it("exposes listbox keyboard navigation with a selected option state", async () => {
    const wrapper = mount(OfficeBranchSelect);
    const trigger = wrapper.get('[data-testid="branch-scope-trigger"]');

    await trigger.trigger("click");
    const listbox = wrapper.get('[role="listbox"]');
    const options = wrapper.findAll('[role="option"]');
    expect(options).toHaveLength(2);
    expect(options[0].attributes("aria-selected")).toBe("true");

    await listbox.trigger("keydown", { key: "ArrowDown" });
    expect(trigger.attributes("aria-activedescendant")).toBe(options[1].attributes("id"));
    await listbox.trigger("keydown", { key: "Enter" });
    expect(useBranchStore().selected).toBe("SUB");
  });

  it("keeps the picker and viewport-safe listbox width classes", async () => {
    const wrapper = mount(OfficeBranchSelect);
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["max-w-full", "md:max-w-[300px]"]));

    await wrapper.get('[data-testid="branch-scope-trigger"]').trigger("click");
    const listbox = wrapper.get('[role="listbox"]');
    expect(listbox.classes()).toEqual(expect.arrayContaining(["w-[380px]", "max-w-[calc(100vw-2rem)]"]));
  });

  it("supports type-to-search selection", async () => {
    const wrapper = mount(OfficeBranchSelect);
    const trigger = wrapper.get('[data-testid="branch-scope-trigger"]');

    await trigger.trigger("keydown", { key: "A" });
    await trigger.trigger("keydown", { key: "n" });
    await trigger.trigger("keydown", { key: "Enter" });

    const branchStore = useBranchStore();
    expect(branchStore.selected).toBe("SUB");
    expect(routerReplace).toHaveBeenCalledTimes(1);
  });

  it("filters options from search input", async () => {
    const wrapper = mount(OfficeBranchSelect);
    await wrapper.get('[data-testid="branch-scope-trigger"]').trigger("click");

    const search = wrapper.get('[data-testid="branch-search-input"]');
    await search.setValue("Ank");

    const labels = wrapper
      .findAll('[data-testid^="branch-option-"] .branch-option-label')
      .map((node) => node.text().trim());

    expect(labels).toEqual(["AT Sigorta", "Ankara"]);
  });

  it("clears search with clear button", async () => {
    const wrapper = mount(OfficeBranchSelect);
    await wrapper.get('[data-testid="branch-scope-trigger"]').trigger("click");

    const search = wrapper.get('[data-testid="branch-search-input"]');
    await search.setValue("Ank");

    expect(wrapper.find('[data-testid="branch-search-clear"]').exists()).toBe(true);

    await wrapper.find('[data-testid="branch-search-clear"]').trigger("click");

    expect(search.element.value).toBe("");

    const labels = wrapper
      .findAll('[data-testid^="branch-option-"] .branch-option-label')
      .map((node) => node.text().trim());

    expect(labels.length).toBeGreaterThan(1);
  });

  it("highlights matching text in search results", async () => {
    const wrapper = mount(OfficeBranchSelect);
    await wrapper.get('[data-testid="branch-scope-trigger"]').trigger("click");

    const search = wrapper.get('[data-testid="branch-search-input"]');
    await search.setValue("kar");

    const markElements = wrapper.findAll('[data-testid^="branch-option-"] mark');

    expect(markElements.length).toBeGreaterThan(0);
    expect(markElements[0].text()).toBe("kar");
  });

  it("collapses and expands sub-branches from the tree toggle", async () => {
    const wrapper = mount(OfficeBranchSelect);
    await wrapper.get('[data-testid="branch-scope-trigger"]').trigger("click");

    expect(wrapper.findAll('[data-testid^="branch-option-"]').length).toBe(2);

    await wrapper
      .get('[data-testid="branch-option-HQ"]')
      .find('button[aria-label="Alt şubeleri gizle"]')
      .trigger("click");

    expect(wrapper.findAll('[data-testid^="branch-option-"]').length).toBe(1);
    expect(wrapper.find('[data-testid="branch-option-SUB"]').exists()).toBe(false);

    await wrapper
      .get('[data-testid="branch-option-HQ"]')
      .find('button[aria-label="Alt şubeleri göster"]')
      .trigger("click");

    expect(wrapper.findAll('[data-testid^="branch-option-"]').length).toBe(2);
  });

  it("reveals matching sub-branches while their parent is collapsed", async () => {
    const wrapper = mount(OfficeBranchSelect);
    await wrapper.get('[data-testid="branch-scope-trigger"]').trigger("click");

    await wrapper
      .get('[data-testid="branch-option-HQ"]')
      .find('button[aria-label="Alt şubeleri gizle"]')
      .trigger("click");

    const search = wrapper.get('[data-testid="branch-search-input"]');
    await search.setValue("Ank");

    expect(wrapper.find('[data-testid="branch-option-SUB"]').exists()).toBe(true);

    await search.setValue("");

    expect(wrapper.find('[data-testid="branch-option-SUB"]').exists()).toBe(false);
  });

  it("gives the all-branches quick-select a taller touch target", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      user: "manager@example.com",
      full_name: "AT Manager",
      roles: ["AT Manager"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      office_branches: [
        { name: "HQ", office_branch_name: "AT Sigorta", is_head_office: 1, is_default: 1 },
      ],
      default_office_branch: "HQ",
      can_access_all_office_branches: true,
    });
    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
    branchStore.setActiveBranch("");

    const wrapper = mount(OfficeBranchSelect);
    const trigger = wrapper.get('[data-testid="branch-scope-trigger"]');
    expect(trigger.attributes("aria-label")).toBe("Şube Kapsamı: Tüm Şubeler");
    expect(trigger.text()).toContain("Tüm Şubeler");
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    await wrapper.get('[data-testid="branch-scope-trigger"]').trigger("click");

    const allClasses = wrapper.get('[data-testid="branch-option-all"]').classes();
    const branchClasses = wrapper.get('[data-testid="branch-option-HQ"]').classes();

    expect(allClasses).toContain("py-2.5");
    expect(branchClasses).not.toContain("py-2.5");
    expect(branchClasses).toContain("py-1");
  });
});
