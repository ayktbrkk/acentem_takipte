<template>
  <header class="at-shell-topbar sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur sm:px-4 lg:px-6">
    <div class="flex w-full flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          class="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 lg:hidden"
          type="button"
          @click="$emit('toggle-sidebar')"
        >
          {{ t("menu") }}
        </button>
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-500">{{ sectionLabel }}</p>
          <p class="text-lg font-semibold text-slate-900">{{ pageTitle }}</p>
        </div>
      </div>

      <div class="flex w-full items-center justify-end gap-2 md:w-auto md:gap-3">
        <OfficeBranchSelect v-if="authStore.officeBranches.length || authStore.canAccessAllOfficeBranches" />

        <button
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          type="button"
          @click="toggleLocale"
        >
          {{ localeLabel }}
        </button>

        <div ref="accountMenuRef" class="relative">
          <button
            class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-medium text-emerald-700 transition hover:bg-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            type="button"
            :aria-expanded="accountMenuOpen ? 'true' : 'false'"
            aria-haspopup="menu"
            :aria-label="displayUser"
            @click="toggleAccountMenu"
          >
            {{ userInitials }}
          </button>

          <div
            v-if="accountMenuOpen"
            class="absolute right-0 top-[calc(100%+0.75rem)] z-40 min-w-[12rem] overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-lg shadow-slate-900/10"
            role="menu"
          >
            <button
              v-for="item in accountMenuItems"
              :key="item.key"
              class="block w-full px-4 py-2.5 text-left text-base text-slate-800 transition hover:bg-slate-50"
              type="button"
              role="menuitem"
              @click="runAccountAction(item.action)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { createResource } from "frappe-ui";

import OfficeBranchSelect from "./app-shell/OfficeBranchSelect.vue";
import { useAuthStore } from "../stores/auth";

defineEmits(["toggle-sidebar"]);

const route = useRoute();
const authStore = useAuthStore();
const accountMenuOpen = ref(false);
const accountMenuRef = ref(null);

const copy = {
  tr: {
    menu: "Menu",
    user: "Kullanıcı",
    defaultPage: "Pano",
    defaultSection: "Acentem Takipte",
    scope: "Kapsam",
    allBranches: "Tüm Şubeler",
    account: "Hesabim",
    logout: "Çıkış",
    desk: "Uygulamaya Git",
  },
  en: {
    menu: "Menu",
    user: "User",
    defaultPage: "Dashboard",
    defaultSection: "Acentem Takipte",
    scope: "Scope",
    allBranches: "All Branches",
    account: "My Account",
    logout: "Logout",
    desk: "Go to Desk",
  },
};

function t(key) {
  return copy[authStore.locale]?.[key] || copy.en[key] || key;
}

const pageTitle = computed(() => {
  const title = route.meta?.title;
  if (title && typeof title === "object") {
    return title[authStore.locale] || title.en || t("defaultPage");
  }
  return title || t("defaultPage");
});
const sectionLabel = computed(() => {
  const section = route.meta?.section;
  if (section && typeof section === "object") {
    return section[authStore.locale] || section.en || t("defaultSection");
  }
  return section || t("defaultSection");
});
const localeLabel = computed(() => (authStore.locale === "tr" ? "TR" : "EN"));
const displayUser = computed(() => authStore.user || authStore.userId || t("user"));
const displayUserId = computed(() => authStore.userId || "");
const userInitials = computed(() => {
  const source = String(displayUser.value || displayUserId.value || t("user")).trim();
  if (!source) return "A";

  const parts = source
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source[0].toUpperCase();
});
const accountMenuItems = computed(() => [
  { key: "account", label: t("account"), action: "account" },
  { key: "logout", label: t("logout"), action: "logout" },
  { key: "desk", label: t("desk"), action: "desk" },
]);

const setLocaleResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.session.set_session_locale",
});

async function persistLocaleViaFetch(locale) {
  const response = await fetch(
    `/api/method/acentem_takipte.acentem_takipte.api.session.set_session_locale?locale=${encodeURIComponent(locale)}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Açcept: "application/json",
      },
    },
  );

  const payload = await response.json().catch(() => null);
  return payload?.message || null;
}

function toggleAccountMenu() {
  accountMenuOpen.value = !accountMenuOpen.value;
}

function closeAccountMenu() {
  accountMenuOpen.value = false;
}

function runAccountAction(action) {
  closeAccountMenu();
  if (action === "account") {
    window.location.assign("/me");
    return;
  }
  if (action === "logout") {
    window.location.assign("/logout");
    return;
  }
  if (action === "desk") {
    window.location.assign("/desk");
  }
}

function handleDocumentClick(event) {
  if (!accountMenuOpen.value) return;
  if (accountMenuRef.value?.contains(event.target)) return;
  closeAccountMenu();
}

function handleEscape(event) {
  if (event.key === "Escape") {
    closeAccountMenu();
  }
}

async function toggleLocale() {
  const next = authStore.locale === "tr" ? "en" : "tr";
  authStore.setLocale(next);

  let payload = null;

  try {
    const response = await setLocaleResource.submit({ locale: next });
    payload = response?.message && typeof response.message === "object" ? response.message : response;
  } catch (error) {
    // fallback below
  }

  if (!payload) {
    try {
      payload = await persistLocaleViaFetch(next);
    } catch (error) {
      // Keep local UI locale even if server persistence fails.
    }
  }

  if (payload?.locale) {
    authStore.setLocale(payload.locale);
  }
  if (payload && typeof payload === "object") authStore.applyContext(payload);
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleEscape);
});

</script>
