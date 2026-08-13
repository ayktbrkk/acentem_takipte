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
        <span
          data-testid="profile-trigger-active-branch"
          class="block truncate text-[10px] text-slate-400"
          :title="branchLabel"
        >
          {{ branchLabel }}
        </span>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="menuOpen"
        ref="menuSurfaceRef"
        data-testid="sidebar-profile-menu"
        :data-placement="menuPlacement"
        class="fixed z-40 max-h-[calc(100vh-1rem)] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-lg shadow-slate-900/10"
        :style="menuStyle"
        role="menu"
        :aria-label="t('profileMenu')"
      >
      <div class="border-b border-slate-100 px-4 pb-3 pt-2">
        <p data-testid="profile-summary-user" class="truncate text-sm font-semibold text-slate-900" :title="displayUser">
          {{ displayUser }}
        </p>
        <p data-testid="profile-summary-role" class="truncate text-xs text-slate-500" :title="`${t('role')}: ${roleLabel}`">
          <span class="font-medium text-slate-400">{{ t("role") }}:</span> {{ roleLabel }}
        </p>
        <p
          data-testid="profile-summary-active-branch"
          class="truncate text-xs text-slate-500"
          :title="`${t('activeBranch')}: ${branchLabel}`"
        >
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
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { translateText } from "@/platform/i18n";
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
const menuSurfaceRef = ref(null);
const retryRef = ref(null);
const logoutError = ref("");
const menuStyle = ref({});
const menuPlacement = ref("upward");
const VIEWPORT_INSET = 8;
const MENU_GAP = 12;
let placementFrame = null;

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
const accountMenuItems = computed(() => [
  { key: "account", label: t("account"), action: "account" },
  { key: "desk", label: t("desk"), action: "desk" },
  { key: "logout", label: t("logout"), action: "logout", destructive: true },
]);

function toggleMenu() {
  if (menuOpen.value) {
    closeMenu(true);
    return;
  }
  logoutError.value = "";
  menuOpen.value = true;
  nextTick(() => {
    scheduleMenuPlacement();
    focusFirstMenuItem();
  });
  addPlacementListeners();
}

function focusTrigger() {
  triggerRef.value?.focus();
}

function closeMenu(restoreFocus = false) {
  menuOpen.value = false;
  menuStyle.value = {};
  menuPlacement.value = "upward";
  cancelMenuPlacement();
  removePlacementListeners();
  if (restoreFocus) focusTrigger();
}

function viewportSize() {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width || window.innerWidth,
    height: viewport?.height || window.innerHeight,
    offsetLeft: viewport?.offsetLeft || 0,
    offsetTop: viewport?.offsetTop || 0,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function updateMenuPlacement() {
  if (!menuOpen.value || !triggerRef.value || !menuSurfaceRef.value) return;

  const anchor = triggerRef.value.getBoundingClientRect();
  const surface = menuSurfaceRef.value.getBoundingClientRect();
  const viewport = viewportSize();
  const minLeft = viewport.offsetLeft + VIEWPORT_INSET;
  const maxLeft = viewport.offsetLeft + viewport.width - surface.width - VIEWPORT_INSET;
  const minTop = viewport.offsetTop + VIEWPORT_INSET;
  const maxTop = viewport.offsetTop + viewport.height - surface.height - VIEWPORT_INSET;
  const isMobile = props.mobile || viewport.width < 768;
  const placement = isMobile ? "mobile" : props.collapsed ? "lateral" : "upward";
  menuPlacement.value = placement;

  let left = anchor.left;
  let top = anchor.top - surface.height - MENU_GAP;
  if (placement === "lateral") {
    left = anchor.right + MENU_GAP;
    if (left > maxLeft) left = anchor.left - surface.width - MENU_GAP;
    top = anchor.top;
  } else if (placement === "mobile") {
    top = anchor.bottom + MENU_GAP;
    if (top > maxTop) top = anchor.top - surface.height - MENU_GAP;
  }

  menuStyle.value = {
    left: `${clamp(left, minLeft, maxLeft)}px`,
    top: `${clamp(top, minTop, maxTop)}px`,
    maxHeight: `${Math.max(0, viewport.height - VIEWPORT_INSET * 2)}px`,
  };
}

function handleViewportChange() {
  scheduleMenuPlacement();
}

function scheduleMenuPlacement() {
  if (!menuOpen.value || placementFrame !== null) return;
  const requestFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
  placementFrame = requestFrame(() => {
    placementFrame = null;
    updateMenuPlacement();
  });
}

function cancelMenuPlacement() {
  if (placementFrame === null) return;
  const cancelFrame = window.cancelAnimationFrame || window.clearTimeout;
  cancelFrame(placementFrame);
  placementFrame = null;
}

function addPlacementListeners() {
  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("scroll", handleViewportChange, true);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);
}

function removePlacementListeners() {
  window.removeEventListener("resize", handleViewportChange);
  window.removeEventListener("scroll", handleViewportChange, true);
  window.visualViewport?.removeEventListener("resize", handleViewportChange);
  window.visualViewport?.removeEventListener("scroll", handleViewportChange);
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

function focusFirstMenuItem() {
  menuSurfaceRef.value?.querySelector('[role="menuitem"]')?.focus();
}

function handleDocumentClick(event) {
  if (
    menuOpen.value
    && !menuRef.value?.contains(event.target)
    && !menuSurfaceRef.value?.contains(event.target)
  ) closeMenu();
}

function handleKeydown(event) {
  if (!menuOpen.value) return;
  if (event.key === "Escape") {
    closeMenu(true);
    return;
  }

  const items = [...menuSurfaceRef.value.querySelectorAll('[role="menuitem"]')];
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
  cancelMenuPlacement();
  removePlacementListeners();
});
</script>
