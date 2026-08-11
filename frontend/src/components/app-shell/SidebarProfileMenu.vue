<template>
  <div ref="menuRef" class="relative w-full">
    <button
      data-testid="sidebar-profile-trigger"
      class="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="menuOpen ? 'true' : 'false'"
      :aria-label="menuOpen ? t('closeProfileMenu') : t('openProfileMenu')"
      @click="toggleMenu"
    >
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
        {{ userInitials }}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xs font-medium text-slate-900" :title="displayUser">
          {{ displayUser }}
        </span>
        <span class="block truncate text-[10px] text-slate-400" :title="branchLabel">
          {{ branchLabel }}
        </span>
      </span>
    </button>

    <div
      v-if="menuOpen"
      class="absolute bottom-[calc(100%+0.75rem)] left-0 z-40 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-lg shadow-slate-900/10"
      role="menu"
      :aria-label="t('profileMenu')"
    >
      <div class="border-b border-slate-100 px-4 pb-3 pt-2">
        <p class="truncate text-sm font-semibold text-slate-900" :title="displayUser">{{ displayUser }}</p>
        <p class="truncate text-xs text-slate-500" :title="roleLabel">{{ roleLabel }}</p>
        <p class="truncate text-xs text-slate-500" :title="branchLabel">{{ branchLabel }}</p>
      </div>

      <div class="px-2 py-2" role="group" :aria-label="t('language')">
        <p class="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{{ t("language") }}</p>
        <button
          v-for="item in localeItems"
          :key="item.locale"
          class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          type="button"
          role="menuitem"
          :aria-current="authStore.locale === item.locale ? 'true' : undefined"
          @click="setLocale(item.locale)"
        >
          <span>{{ item.label }}</span>
          <span v-if="authStore.locale === item.locale" aria-hidden="true">✓</span>
        </button>
      </div>

      <div class="border-t border-slate-100 px-2 pt-2">
        <button
          v-for="item in accountMenuItems"
          :key="item.key"
          class="block w-full rounded-lg px-2 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          :class="item.destructive ? 'text-at-red-700 hover:bg-at-red-50' : 'text-slate-800 hover:bg-slate-50'"
          type="button"
          role="menuitem"
          @click="runAccountAction(item.action)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { createResource } from "frappe-ui";

import { translateText } from "@/platform/i18n";
import { useAuthStore } from "../../platform/state/authStore";
import { useBranchStore } from "../../platform/state/branchStore";

const authStore = useAuthStore();
const branchStore = useBranchStore();
const menuOpen = ref(false);
const menuRef = ref(null);

function t(key) {
  return translateText(key, authStore.locale);
}

const displayUser = computed(() => String(authStore.user || authStore.userId || t("user")).trim() || t("user"));
const userInitials = computed(() => {
  const parts = displayUser.value.split(/\s+/).filter(Boolean);
  const raw = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.[0] || "A";
  return authStore.locale === "tr" ? raw.toLocaleUpperCase("tr-TR") : raw.toUpperCase();
});
const roleLabel = computed(() => String(authStore.roles?.[0] || t("role")).trim() || t("role"));
const branchLabel = computed(() => {
  const branch = branchStore.selectedBranch;
  const selected = branch?.office_branch_name || branch?.name || branchStore.requestBranch;
  if (selected) return String(selected).trim();
  return branchStore.canAccessAll ? t("allBranches") : "-";
});
const localeItems = computed(() => [
  { locale: "tr", label: t("turkish") },
  { locale: "en", label: t("english") },
]);
const accountMenuItems = computed(() => [
  { key: "account", label: t("account"), action: "account" },
  { key: "desk", label: t("desk"), action: "desk" },
  { key: "logout", label: t("logout"), action: "logout", destructive: true },
]);

const setLocaleResource = createResource({
  url: "acentem_takipte.acentem_takipte.platform.api.session.set_session_locale",
});

async function persistLocaleViaFetch(locale) {
  const response = await fetch(
    `/api/method/acentem_takipte.acentem_takipte.platform.api.session.set_session_locale?locale=${encodeURIComponent(locale)}`,
    {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    },
  );
  const payload = await response.json().catch(() => null);
  return payload?.message || null;
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

function runAccountAction(action) {
  closeMenu();
  if (action === "account") {
    window.location.assign("/me");
    return;
  }
  if (action === "desk") {
    window.location.assign("/desk");
    return;
  }
  if (action === "logout") {
    fetch("/api/method/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Frappe-CSRF-Token": window.csrf_token || "",
      },
    }).finally(() => {
      window.location.assign("/login?redirect-to=/at");
    });
  }
}

async function setLocale(locale) {
  authStore.setLocale(locale);
  let payload = null;

  try {
    const response = await setLocaleResource.submit({ locale });
    payload = response?.message && typeof response.message === "object" ? response.message : response;
  } catch (error) {
    // Keep the local locale when the resource request is unavailable.
  }

  if (!payload) {
    try {
      payload = await persistLocaleViaFetch(locale);
    } catch (error) {
      // Server persistence is non-critical for the local shell.
    }
  }

  if (payload?.locale) authStore.setLocale(payload.locale);
  if (payload && typeof payload === "object") authStore.applyContext(payload);
  closeMenu();
}

function handleDocumentClick(event) {
  if (menuOpen.value && !menuRef.value?.contains(event.target)) closeMenu();
}

function handleKeydown(event) {
  if (!menuOpen.value) return;
  if (event.key === "Escape") {
    closeMenu();
    return;
  }

  const items = [...menuRef.value.querySelectorAll('[role="menuitem"]')];
  const current = items.indexOf(document.activeElement);
  if (!items.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
  items[next].focus();
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleKeydown);
});
</script>
