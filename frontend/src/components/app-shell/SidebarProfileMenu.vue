<template>
  <div ref="menuRef" class="relative w-full">
    <button
      ref="triggerRef"
      data-testid="sidebar-profile-trigger"
      class="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      :class="props.collapsed ? 'justify-center' : ''"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="menuOpen ? 'true' : 'false'"
      :aria-label="menuOpen ? t('closeProfileMenu') : t('openProfileMenu')"
      @click="toggleMenu"
    >
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
        {{ userInitials }}
      </span>
      <span v-if="!props.collapsed" class="min-w-0 flex-1">
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
        <p class="truncate text-xs text-slate-500" :title="`${t('role')}: ${roleLabel}`">
          <span class="font-medium text-slate-400">{{ t("role") }}:</span> {{ roleLabel }}
        </p>
        <p class="truncate text-xs text-slate-500" :title="`${t('activeBranch')}: ${branchLabel}`">
          <span class="font-medium text-slate-400">{{ t("activeBranch") }}:</span> {{ branchLabel }}
        </p>
      </div>

      <div v-if="logoutError" class="border-b border-slate-100 px-4 py-3" role="alert" aria-live="polite">
        <p class="text-xs text-at-red-700">{{ logoutError }}</p>
        <button
          ref="retryRef"
          class="mt-2 rounded-md text-xs font-semibold text-at-red-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          type="button"
          role="menuitem"
          @click="logout"
        >
          {{ t("retry") }}
        </button>
      </div>

      <div v-if="props.mobile" data-testid="profile-mobile-language" class="px-2 py-2" role="group" :aria-label="t('language')">
        <p class="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{{ t("language") }}</p>
        <div class="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            v-for="item in localeItems"
            :key="item.locale"
            class="rounded-md px-2 py-1.5 text-center text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            :class="authStore.locale === item.locale ? 'bg-white text-brand-700 shadow-sm' : ''"
            type="button"
            role="menuitem"
            :aria-current="authStore.locale === item.locale ? 'true' : undefined"
            @click="setLocale(item.locale)"
          >
            {{ item.label }}
          </button>
        </div>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { translateText } from "@/platform/i18n";
import { useLocalePreference } from "../../platform/composables/useLocalePreference";
import { useAuthStore } from "../../platform/state/authStore";
import { useBranchStore } from "../../platform/state/branchStore";
import { SIDEBAR_ROLE_PRIORITY } from "../../platform/i18n/sidebar";

const authStore = useAuthStore();
const branchStore = useBranchStore();
const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
  mobile: {
    type: Boolean,
    default: true,
  },
});
const menuOpen = ref(false);
const menuRef = ref(null);
const triggerRef = ref(null);
const retryRef = ref(null);
const logoutError = ref("");

function t(key) {
  return translateText(key, authStore.locale);
}

const displayUser = computed(() => String(authStore.user || authStore.userId || t("user")).trim() || t("user"));
const userInitials = computed(() => {
  const parts = displayUser.value.split(/\s+/).filter(Boolean);
  const raw = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.[0] || "A";
  return authStore.locale === "tr" ? raw.toLocaleUpperCase("tr-TR") : raw.toUpperCase();
});
const roleLabel = computed(() => {
  const normalizedRoles = new Set((authStore.roles || []).map((role) => String(role).trim().toLowerCase()));
  const match = SIDEBAR_ROLE_PRIORITY.find(({ role }) => normalizedRoles.has(role.toLowerCase()));
  return match ? t(match.labelKey) : t("role");
});
const branchLabel = computed(() => {
  if (branchStore.canAccessAll && !branchStore.requestBranch) return t("allBranches");
  const branch = branchStore.selectedBranch;
  const selected = branch?.office_branch_name || branch?.name || branchStore.requestBranch;
  if (selected) return String(selected).trim();
  return branchStore.canAccessAll ? t("allBranches") : t("notProvided");
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

const { setLocale: persistLocale } = useLocalePreference();

function toggleMenu() {
  if (menuOpen.value) {
    closeMenu(true);
    return;
  }
  logoutError.value = "";
  menuOpen.value = true;
  nextTick(focusFirstMenuItem);
}

function focusTrigger() {
  triggerRef.value?.focus();
}

function closeMenu(restoreFocus = false) {
  menuOpen.value = false;
  if (restoreFocus) focusTrigger();
}

function runAccountAction(action) {
  if (action === "account") {
    closeMenu(true);
    window.location.assign("/me");
    return;
  }
  if (action === "desk") {
    closeMenu(true);
    window.location.assign("/desk");
    return;
  }
  if (action === "logout") {
    logout();
  }
}

async function logout() {
  logoutError.value = "";
  try {
    const response = await fetch("/api/method/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Frappe-CSRF-Token": window.csrf_token || "",
      },
    });
    if (!response.ok) throw new Error("logout failed");
    closeMenu(true);
    window.location.assign("/login?redirect-to=/at");
  } catch (error) {
    logoutError.value = t("logoutError");
    await nextTick();
    retryRef.value?.focus();
  }
}

async function setLocale(locale) {
  await persistLocale(locale);
  closeMenu(true);
}

function focusFirstMenuItem() {
  menuRef.value?.querySelector('[role="menuitem"]')?.focus();
}

function handleDocumentClick(event) {
  if (menuOpen.value && !menuRef.value?.contains(event.target)) closeMenu();
}

function handleKeydown(event) {
  if (!menuOpen.value) return;
  if (event.key === "Escape") {
    closeMenu(true);
    return;
  }

  const items = [...menuRef.value.querySelectorAll('[role="menuitem"]')];
  const current = items.indexOf(document.activeElement);
  if (!items.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "Home") {
    items[0].focus();
    return;
  }
  if (event.key === "End") {
    items[items.length - 1].focus();
    return;
  }
  const direction = event.key === "ArrowDown" ? 1 : -1;
  const next = current < 0 ? (direction === 1 ? 0 : items.length - 1) : (current + direction + items.length) % items.length;
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
