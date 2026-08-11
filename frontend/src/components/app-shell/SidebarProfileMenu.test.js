import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import Sidebar from "../../platform/shell/Sidebar.vue";
import { useAuthStore } from "../../platform/state/authStore";
import { useBranchStore } from "../../platform/state/branchStore";

const resourceMock = vi.hoisted(() => {
  const localeResource = {
    submit: vi.fn(async ({ locale }) => ({ message: { locale } })),
  };

  return {
    localeResource,
    createResource: vi.fn((options = {}) => {
      if (String(options.url || "").includes("set_session_locale")) {
        return localeResource;
      }
      return { submit: vi.fn() };
    }),
  };
});

vi.mock("frappe-ui", () => ({
  createResource: resourceMock.createResource,
}));

const RouterLinkStub = {
  props: ["to", "title"],
  template: `<a :href="typeof to === 'string' ? to : to?.path || '/'" :title="title"><slot /></a>`,
};

const OfficeBranchSelectStub = {
  template: `<div class="office-branch-select-stub">Office Branch Select</div>`,
};

function mountSidebar() {
  return mount(Sidebar, {
    props: { mobileOpen: false },
    global: {
      directives: { prefetch: {} },
      stubs: {
        RouterLink: RouterLinkStub,
        OfficeBranchSelect: OfficeBranchSelectStub,
      },
    },
  });
}

describe("Sidebar profile menu contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      user: "Aykut Yılmaz",
      userId: "aykut",
      full_name: "Aykut Yılmaz",
      roles: ["AT Manager"],
      default_office_branch: "AT Sigorta",
      office_branches: [{ name: "HQ", office_branch_name: "AT Sigorta", is_default: 1 }],
    });
    useBranchStore().hydrateFromSession();
  });

  it("renders the user, role, branch, language, and logout actions", async () => {
    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');

    expect(trigger.exists()).toBe(true);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    expect(trigger.attributes("aria-haspopup")).toBe("menu");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    await trigger.trigger("click");

    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Aykut Yılmaz");
    expect(wrapper.text()).toContain("AT Manager");
    expect(wrapper.text()).toContain("AT Sigorta");
    expect(wrapper.text()).toContain("Dil");
    expect(wrapper.text()).toContain("Türkçe");
    expect(wrapper.text()).toContain("English");
    expect(wrapper.text()).toContain("Çıkış Yap");
  });

  it("closes with Escape and outside click without changing sidebar state", async () => {
    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');

    expect(trigger.exists()).toBe(true);

    await trigger.trigger("click");
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    await trigger.trigger("click");
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Menüyü daralt"]').exists()).toBe(true);
  });

  it("switches to English through the profile menu and persists the locale", async () => {
    const authStore = useAuthStore();
    const setLocaleSpy = vi.spyOn(authStore, "setLocale");
    resourceMock.localeResource.submit.mockClear();

    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');
    expect(trigger.exists()).toBe(true);
    await trigger.trigger("click");

    const englishAction = wrapper
      .findAll('[role="menuitem"]')
      .find((item) => item.text().trim() === "English");
    expect(englishAction).toBeTruthy();
    await englishAction.trigger("click");

    expect(setLocaleSpy).toHaveBeenCalledWith("en");
    expect(authStore.locale).toBe("en");
    expect(resourceMock.createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "acentem_takipte.acentem_takipte.platform.api.session.set_session_locale",
      }),
    );
    expect(resourceMock.localeResource.submit).toHaveBeenCalledWith({ locale: "en" });
  });
});
