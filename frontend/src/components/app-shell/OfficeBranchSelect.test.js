import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import OfficeBranchSelect from "./OfficeBranchSelect.vue";
import { useAuthStore } from "../../stores/auth";
import { useBranchStore } from "../../stores/branch";

const routerReplace = vi.fn(async () => {});

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn(), afterEach: vi.fn(), currentRoute: { value: { query: {} } } }),
  createWebHistory: vi.fn(() => ({})),
  useRouter: () => ({ replace: routerReplace }),
  useRoute: () => ({ path: "/at", query: {}, hash: "" }),
}));

describe("OfficeBranchSelect", () => {
  beforeEach(() => {
    routerReplace.mockReset();
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "manager@example.com",
      full_name: "Manager",
      roles: ["Manager"],
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

    expect(wrapper.get('[data-testid="branch-scope-trigger"]').text()).toContain("AT Sigorta");

    await wrapper.get('[data-testid="branch-scope-trigger"]').trigger("click");
    const allOption = wrapper.find('[data-testid="branch-option-all"]');
    expect(allOption.exists()).toBe(false);

    const options = wrapper
      .findAll('[data-testid^="branch-option-"]')
      .map((node) => node.find(".branch-option-label").text().trim());

    expect(options).toEqual(["AT Sigorta [Merkez]", "- Ankara"]);
    expect(wrapper.text()).toContain("Merkez şube");
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

    expect(labels).toEqual(["- Ankara"]);
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
});