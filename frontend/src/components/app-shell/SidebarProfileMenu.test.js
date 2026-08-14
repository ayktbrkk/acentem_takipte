import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import SidebarProfileMenu from "./SidebarProfileMenu.vue";
import { SIDEBAR_TRANSLATIONS } from "../../platform/i18n/sidebar";
import { useAuthStore } from "../../platform/state/authStore";
import { useBranchStore } from "../../platform/state/branchStore";
import { setPreferredLocale } from "../../platform/state/session";

const PROFILE_MENU_TRANSLATIONS = {
  tr: {
    profileMenu: "Profil menüsü",
    role: "Rol",
    activeBranch: "Aktif şube",
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
    openProfileMenu: "Open profile menu",
    closeProfileMenu: "Close profile menu",
    account: "My Account",
    desk: "Open Desk",
    logout: "Logout",
  },
};

let mountedWrappers = [];

function mountSidebar(options = {}) {
  const wrapper = mount(SidebarProfileMenu, { attachTo: document.body, ...options });
  mountedWrappers.push(wrapper);
  return wrapper;
}

function findProfileMenu() {
  const menus = document.body.querySelectorAll('[data-testid="sidebar-profile-menu"]');
  return new DOMWrapper(menus[menus.length - 1] || null);
}

function removeTeleportedMenus() {
  document.querySelectorAll('[data-testid="sidebar-profile-menu"]').forEach((menu) => menu.remove());
}

describe("Sidebar profile menu contract", () => {
  afterEach(() => {
    mountedWrappers.forEach((wrapper) => wrapper.unmount());
    mountedWrappers = [];
    removeTeleportedMenus();
    setPreferredLocale("en");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    removeTeleportedMenus();
    setActivePinia(createPinia());
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

  it("renders the user, localized role, informational branch, and logout actions", async () => {
    const wrapper = mountSidebar({ props: { mobile: false } });
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');

    expect(trigger.exists()).toBe(true);
    expect(wrapper.find('[data-testid="sidebar-profile-menu"]').exists()).toBe(false);

    expect(trigger.attributes("aria-haspopup")).toBe("menu");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.attributes("aria-controls")).toBeUndefined();
    expect(trigger.find('[data-testid="profile-trigger-active-branch"]').text()).toContain("AT Sigorta");
    await trigger.trigger("click");

    const profileMenu = findProfileMenu();
    expect(profileMenu.exists()).toBe(true);
    expect(profileMenu.attributes("id")).toBe("sidebar-profile-menu-surface");
    expect(trigger.attributes("aria-controls")).toBe(profileMenu.attributes("id"));
    expect(profileMenu.attributes("role")).toBe("menu");
    expect(profileMenu.text()).toContain("Aykut Yılmaz");
    expect(profileMenu.text()).toContain("Rol");
    expect(profileMenu.text()).toContain("AT Yönetici");
    expect(profileMenu.text()).toContain("Aktif şube");
    expect(profileMenu.text()).toContain("AT Sigorta");
    expect(profileMenu.find('[data-testid="profile-mobile-language"]').exists()).toBe(false);
    expect(profileMenu.element.querySelector('[data-testid="branch-scope-trigger"]')).toBe(null);
    expect(profileMenu.text()).toContain("Çıkış Yap");
    expect(profileMenu.find('[data-testid="profile-account-actions"]').exists()).toBe(true);
    expect(profileMenu.find('[data-testid="profile-logout-actions"]').exists()).toBe(true);
    expect(profileMenu.find('[data-testid="profile-account-actions"]').findAll('[role="menuitem"]')).toHaveLength(2);
    expect(profileMenu.find('[data-testid="profile-logout-actions"]').findAll('[role="menuitem"]')).toHaveLength(1);
    expect(profileMenu.find('[data-testid="profile-logout-actions"]').classes()).toContain("border-t");
    expect(profileMenu.find('[data-testid="profile-logout-actions"] [role="menuitem"]').classes()).toContain("text-at-red-700");
    expect(profileMenu.find('[data-testid="profile-summary-user"]').text()).toBe("Aykut Yılmaz");
    expect(profileMenu.find('[data-testid="profile-summary-role"]').text()).toContain("AT Yönetici");
    const activeBranchSummary = profileMenu.find('[data-testid="profile-summary-active-branch"]');
    expect(activeBranchSummary.text()).toContain("AT Sigorta");
    expect(["menuitem", "button", "link", "option", "combobox", "listbox"]).not.toContain(
      activeBranchSummary.attributes("role"),
    );
    expect(activeBranchSummary.element.closest("button, a, input, select, textarea")).toBe(null);
  });

  it("clamps the teleported menu to the mobile viewport and applies a usable max-height", async () => {
    vi.stubGlobal("requestAnimationFrame", (callback) => {
      callback();
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(390);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(844);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if (this.matches('[data-testid="sidebar-profile-trigger"]')) {
        return { left: 380, right: 412, top: 700, bottom: 732, width: 32, height: 32 };
      }
      if (this.matches('[data-testid="sidebar-profile-menu"]')) {
        return { left: 0, right: 288, top: 0, bottom: 400, width: 288, height: 400 };
      }
      return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    });

    const wrapper = mountSidebar({ props: { mobile: false } });
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");
    const menu = findProfileMenu();

    expect(menu.attributes("style")).toContain("left: 94px");
    expect(menu.attributes("style")).toContain("top: 288px");
    expect(menu.attributes("style")).toContain("max-height: 828px");
    expect(menu.classes()).toContain("overflow-y-auto");
  });

  it("caps the profile surface width inside a narrow drawer viewport", async () => {
    vi.stubGlobal("requestAnimationFrame", (callback) => {
      callback();
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(220);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(491);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if (this.matches('[data-testid="sidebar-profile-trigger"]')) {
        return { left: 16, right: 204, top: 410, bottom: 450, width: 188, height: 40 };
      }
      if (this.matches('[data-testid="sidebar-profile-menu"]')) {
        return { left: 0, right: 288, top: 0, bottom: 400, width: 288, height: 400 };
      }
      return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    });

    const wrapper = mountSidebar({ props: { mobile: true } });
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");

    expect(findProfileMenu().attributes("style")).toContain("width: 204px");
  });

  it("renders localized role and active-branch labels in English", async () => {
    const authStore = useAuthStore();
    authStore.setLocale("en");
    const wrapper = mountSidebar();
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");

    expect(findProfileMenu().text()).toContain("Role");
    expect(findProfileMenu().text()).toContain("AT Manager");
    expect(findProfileMenu().text()).toContain("Active branch");
    expect(findProfileMenu().text()).toContain("AT Sigorta");
  });

  it.each([
    [["AT Agent", "AT Manager"], "AT Yönetici", "AT Manager"],
    [["System Manager", "AT Manager"], "AT Yönetici", "AT Manager"],
    [["Administrator", "AT Manager"], "AT Yönetici", "AT Manager"],
    [["Administrator"], "Yönetici", "Administrator"],
    [["Unknown Role"], "Rol", "Role"],
  ])("uses the highest-priority localized business role", async (roles, trExpected, enExpected) => {
    const authStore = useAuthStore();
    authStore.applyContext({ locale: "tr", user: "Aykut", roles });
    const wrapper = mountSidebar();
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");
    expect(findProfileMenu().text()).toContain(trExpected);

    authStore.setLocale("en");
    await wrapper.vm.$nextTick();
    expect(findProfileMenu().text()).toContain(enExpected);
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

    expect(findProfileMenu().text()).toContain("Tüm Şubeler");
    expect(findProfileMenu().text()).not.toContain("AT Sigorta");
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

    expect(findProfileMenu().text()).toContain(expectedFallback);
    expect(wrapper.find('[data-testid="profile-trigger-active-branch"]').text()).toContain(expectedFallback);
    expect(findProfileMenu().text()).not.toContain("-");
  });

  it("closes with Escape and outside click", async () => {
    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');

    expect(trigger.exists()).toBe(true);

    await trigger.trigger("click");
    const profileMenu = findProfileMenu();
    expect(profileMenu.exists()).toBe(true);
    expect(document.activeElement).toBe(profileMenu.find('[role="menuitem"]').element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(findProfileMenu().exists()).toBe(false);
    expect(trigger.attributes("aria-controls")).toBeUndefined();
    expect(document.activeElement).toBe(trigger.element);

    await trigger.trigger("click");
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(findProfileMenu().exists()).toBe(false);

    await trigger.trigger("click");
    await trigger.trigger("click");
    expect(findProfileMenu().exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
  });

  it("returns focus for a non-focusable outside click without stealing focus from another control", async () => {
    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');

    await trigger.trigger("click");
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(findProfileMenu().exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);

    await trigger.trigger("click");
    const externalControl = document.createElement("button");
    externalControl.type = "button";
    document.body.append(externalControl);
    externalControl.focus();
    externalControl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(findProfileMenu().exists()).toBe(false);
    expect(document.activeElement).toBe(externalControl);
    externalControl.remove();
  });

  it("supports ArrowUp, ArrowDown, Home, and End menu navigation", async () => {
    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');

    await trigger.trigger("click");
    const items = findProfileMenu().findAll('[role="menuitem"]');
    expect(document.activeElement).toBe(items[0].element);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(items[1].element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(document.activeElement).toBe(items[0].element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(document.activeElement).toBe(items[items.length - 1].element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(document.activeElement).toBe(items[items.length - 2].element);
  });

  it("keeps the profile surface free of duplicate language controls", async () => {
    const wrapper = mountSidebar();
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');
    expect(trigger.exists()).toBe(true);
    await trigger.trigger("click");

    const profileMenu = findProfileMenu();
    expect(profileMenu.find('[data-testid="profile-mobile-language"]').exists()).toBe(false);
    expect(profileMenu.text()).toContain("Hesabım");
    expect(profileMenu.text()).toContain("Desk'i Aç");
    expect(profileMenu.text()).toContain("Çıkış Yap");
  });

  it("keeps the mobile profile trigger outside the drawer scroll region and the menu outside clipping ancestors", async () => {
    const aside = document.createElement("aside");
    const nav = document.createElement("nav");
    const footer = document.createElement("footer");
    nav.className = "overflow-y-auto";
    nav.style.height = "100px";
    nav.innerHTML = "<div style=\"height: 600px\"></div>";
    aside.append(nav, footer);
    document.body.append(aside);

    const wrapper = mountSidebar({ attachTo: footer, props: { mobile: true } });
    const trigger = wrapper.find('[data-testid="sidebar-profile-trigger"]');
    nav.scrollTop = 320;

    expect(nav.scrollTop).toBe(320);
    expect(nav.contains(trigger.element)).toBe(false);
    expect(footer.contains(trigger.element)).toBe(true);
    expect(trigger.isVisible()).toBe(true);
    expect(trigger.element.disabled).toBe(false);

    await trigger.trigger("click");
    const profileMenu = findProfileMenu();
    const ancestors = [];
    let ancestor = profileMenu.element.parentElement;
    while (ancestor && ancestor !== document.body) {
      ancestors.push(ancestor);
      ancestor = ancestor.parentElement;
    }

    expect(profileMenu.element.parentElement).toBe(document.body);
    expect(profileMenu.element.closest("aside")).toBe(null);
    expect(ancestors.some((node) => node.classList.contains("overflow-y-auto"))).toBe(false);
    expect(ancestors.some((node) => node.classList.contains("overflow-auto"))).toBe(false);
    aside.remove();
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
    await findProfileMenu()
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
    expect(findProfileMenu().find('[role="alert"]').text()).toContain("Logout failed");
    expect(findProfileMenu().find('button[role="menuitem"]').text()).toContain("Retry");
  });

  it("keeps successful logout free of an error state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mountSidebar();
    await wrapper.find('[data-testid="sidebar-profile-trigger"]').trigger("click");
    await findProfileMenu()
      .findAll('[role="menuitem"]')
      .find((item) => item.text().trim() === "Çıkış Yap")
      .trigger("click");
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith("/api/method/logout", expect.any(Object));
    expect(document.body.querySelector('[role="alert"]')).toBe(null);
  });
});
