import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import SidebarProfileMenu from "./SidebarProfileMenu.vue";
import { SIDEBAR_TRANSLATIONS } from "../../platform/i18n/sidebar";
import { useAuthStore } from "../../platform/state/authStore";
import { useBranchStore } from "../../platform/state/branchStore";
import { setPreferredLocale } from "../../platform/state/session";

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

const PROFILE_MENU_TRANSLATIONS = {
  tr: {
    profileMenu: "Profil menüsü",
    role: "Rol",
    activeBranch: "Aktif şube",
    language: "Dil",
    turkish: "Türkçe",
    english: "English",
    openProfileMenu: "Profil menüsünü aç",
    closeProfileMenu: "Profil menüsünü kapat",
    account: "Hesabım",
    desk: "Desk'i Aç",
    logout: "Çıkış Yap",
  },
  en: {
    profileMenu: "Profile menu",
    role: "Role",
    activeBranch: "Active branch",
    language: "Language",
    turkish: "Türkçe",
    english: "English",
    openProfileMenu: "Open profile menu",
    closeProfileMenu: "Close profile menu",
    account: "My Account",
    desk: "Open Desk",
    logout: "Logout",
  },
};

let mountedWrappers = [];

function mountSidebar() {
  const wrapper = mount(SidebarProfileMenu, { attachTo: document.body });
  mountedWrappers.push(wrapper);
  return wrapper;
}

describe("Sidebar profile menu contract", () => {
  afterEach(() => {
    mountedWrappers.forEach((wrapper) => wrapper.unmount());
    mountedWrappers = [];
    setPreferredLocale("en");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    resourceMock.createResource.mockClear();
    resourceMock.localeResource.submit.mockReset();
    resourceMock.localeResource.submit.mockImplementation(async ({ locale }) => ({ message: { locale } }));
    const authStore = useAuthStore();
    setPreferredLocale("tr");
    authStore.applyContext({
      locale: "tr",
      user: "Aykut Yılmaz",
      userId: "aykut",
      full_name: "Aykut Yılmaz",
      roles: ["AT Manager"],
      default_office_branch: "AT Sigorta",
      office_branches: [{ name: "HQ", office_branch_name: "AT Sigorta", is_default: 1 }],
    });
    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
  });

  it("keeps new profile-menu labels exact in Turkish and English", () => {
    for (const [locale, translations] of Object.entries(PROFILE_MENU_TRANSLATIONS)) {
      for (const [key, expected] of Object.entries(translations)) {
        expect(SIDEBAR_TRANSLATIONS[locale]?.[key], `${locale}.${key}`).toBe(expected);
      }
    }
  });

  it("renders the user, localized role, branch, mobile language, and logout actions", async () => {
    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');

    expect(trigger.exists()).toBe(true);
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    expect(trigger.attributes("aria-haspopup")).toBe("menu");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    await trigger.trigger("click");

    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Aykut Yılmaz");
    expect(wrapper.text()).toContain("Rol");
    expect(wrapper.text()).toContain("AT Yönetici");
    expect(wrapper.text()).toContain("Aktif şube");
    expect(wrapper.text()).toContain("AT Sigorta");
    expect(wrapper.find('[data-testid="profile-mobile-language"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-mobile-language"]').text()).toContain("Türkçe");
    expect(wrapper.find('[data-testid="profile-mobile-language"]').text()).toContain("English");
    expect(wrapper.text()).toContain("Çıkış Yap");
  });

  it("renders localized role and active-branch labels in English", async () => {
    const authStore = useAuthStore();
    authStore.setLocale("en");
    const wrapper = mountSidebar();
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");

    expect(wrapper.text()).toContain("Role");
    expect(wrapper.text()).toContain("AT Manager");
    expect(wrapper.text()).toContain("Active branch");
    expect(wrapper.text()).toContain("AT Sigorta");
  });

  it.each([
    [["AT Agent", "AT Manager"], "AT Yönetici", "AT Manager"],
    [["Administrator"], "Yönetici", "Administrator"],
    [["Unknown Role"], "Rol", "Role"],
  ])("uses the highest-priority localized business role", async (roles, trExpected, enExpected) => {
    const authStore = useAuthStore();
    authStore.applyContext({ locale: "tr", user: "Aykut", roles });
    const wrapper = mountSidebar();
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");
    expect(wrapper.text()).toContain(trExpected);

    authStore.setLocale("en");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain(enExpected);
  });

  it("shows all branches when access is global without an explicit request branch", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      user: "Aykut Yılmaz",
      userId: "aykut",
      roles: ["AT Manager"],
      default_office_branch: "HQ",
      can_access_all_office_branches: true,
      office_branches: [{ name: "HQ", office_branch_name: "AT Sigorta", is_default: 1 }],
    });
    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
    branchStore.syncFromRoute({ query: {} });
    expect(branchStore.canAccessAll).toBe(true);

    const wrapper = mountSidebar();
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");

    expect(wrapper.text()).toContain("Tüm Şubeler");
    expect(wrapper.text()).not.toContain("AT Sigorta");
  });

  it.each([
    ["tr", "Belirtilmedi"],
    ["en", "Not provided"],
  ])("localizes a missing non-global branch in %s", async (locale, expectedFallback) => {
    const authStore = useAuthStore();
    setPreferredLocale(locale);
    authStore.applyContext({
      locale,
      user: "Aykut Yılmaz",
      userId: "aykut",
      roles: ["AT Manager"],
      default_office_branch: null,
      office_branches: [],
      can_access_all_office_branches: false,
    });
    useBranchStore().hydrateFromSession();

    const wrapper = mountSidebar();
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");

    expect(wrapper.text()).toContain(expectedFallback);
    expect(wrapper.text()).not.toContain("-");
  });

  it("closes with Escape and outside click", async () => {
    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');

    expect(trigger.exists()).toBe(true);

    await trigger.trigger("click");
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);
    expect(document.activeElement).toBe(wrapper.find('[role="menuitem"]').element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);

    await trigger.trigger("click");
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });

  it("moves focus through the menu when no item is currently focused", async () => {
    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');

    await trigger.trigger("click");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await wrapper.vm.$nextTick();

    const items = wrapper.findAll('[role="menuitem"]');
    expect(document.activeElement).toBe(items[items.length - 1].element);
  });

  it("switches to English through the profile menu and persists the locale", async () => {
    const authStore = useAuthStore();
    const setLocaleSpy = vi.spyOn(authStore, "setLocale");
    resourceMock.localeResource.submit.mockClear();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');
    expect(trigger.exists()).toBe(true);
    trigger.element.focus();
    await trigger.trigger("click");

     const englishAction = wrapper
       .findAll('[data-testid="profile-mobile-language"] [role="menuitem"]')
      .find((item) => item.text().trim() === "English");
    expect(englishAction).toBeTruthy();
    await englishAction.trigger("click");

    expect(setLocaleSpy).toHaveBeenCalledWith("en");
    expect(authStore.locale).toBe("en");
    expect(resourceMock.createResource).toHaveBeenCalledTimes(1);
    expect(resourceMock.createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "acentem_takipte.acentem_takipte.platform.api.session.set_session_locale",
      }),
    );
    expect(resourceMock.localeResource.submit).toHaveBeenCalledWith({ locale: "en" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger.element);
  });

  it("falls back to the session locale endpoint when resource persistence fails", async () => {
    const authStore = useAuthStore();
    const setLocaleSpy = vi.spyOn(authStore, "setLocale");
    resourceMock.localeResource.submit.mockRejectedValue(new Error("Resource unavailable"));
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ message: { locale: "en" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');
    expect(trigger.exists()).toBe(true);
    await trigger.trigger("click");

     const englishAction = wrapper
       .findAll('[data-testid="profile-mobile-language"] [role="menuitem"]')
      .find((item) => item.text().trim() === "English");
    expect(englishAction).toBeTruthy();
    await englishAction.trigger("click");

    expect(setLocaleSpy).toHaveBeenCalledWith("en");
    expect(authStore.locale).toBe("en");
    expect(resourceMock.localeResource.submit).toHaveBeenCalledWith({ locale: "en" });
    await expect(resourceMock.localeResource.submit.mock.results[0].value).rejects.toThrow("Resource unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/method/acentem_takipte.acentem_takipte.platform.api.session.set_session_locale?locale=en",
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );
  });

  it.each([
    ["non-OK response", { ok: false, json: vi.fn() }, "en"],
    ["network rejection", null, "en"],
  ])("keeps the profile menu open with a retry state after logout %s", async (_label, response, locale) => {
    const authStore = useAuthStore();
    authStore.setLocale(locale);
    const fetchMock = vi.fn();
    if (response) {
      fetchMock.mockResolvedValue(response);
    } else {
      fetchMock.mockRejectedValue(new Error("network unavailable"));
    }
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mountSidebar();
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");
    await wrapper
      .findAll('[role="menuitem"]')
      .find((item) => item.text().trim() === "Logout")
      .trigger("click");
    await wrapper.vm.$nextTick();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/method/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "X-Frappe-CSRF-Token": "" }),
      }),
    );
    expect(wrapper.find('[role="alert"]').text()).toContain("Logout failed");
    expect(wrapper.find('button[role="menuitem"]').text()).toContain("Retry");
  });

  it("keeps successful logout free of an error state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mountSidebar();
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");
    await wrapper
      .findAll('[role="menuitem"]')
      .find((item) => item.text().trim() === "Çıkış Yap")
      .trigger("click");
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith("/api/method/logout", expect.any(Object));
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
