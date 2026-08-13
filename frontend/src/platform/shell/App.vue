<template>
  <div class="app-shell min-h-screen w-full">
    <div
      v-if="scopeRefreshNotice"
      class="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-at-amber/40 bg-status-waiting-bg px-4 py-3 text-sm font-medium text-status-waiting-text shadow"
      role="alert"
      aria-live="assertive"
      :inert="uiStore.sidebarOpen"
    >
      <span class="flex-1">{{ scopeRefreshNotice }}</span>
      <button
        class="shrink-0 cursor-pointer rounded bg-at-amber px-2 py-1 text-xs font-semibold text-white transition-colors hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-at-amber"
        @click="confirmScopeRefresh"
      >
        {{ t("refresh") }}
      </button>
      <button
        class="shrink-0 cursor-pointer text-status-waiting-text hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-at-amber"
        :aria-label="t('dismiss')"
        @click="dismissScopeNotice"
      >
        <FeatherIcon name="x" class="h-4 w-4" />
      </button>
    </div>
    <div class="flex min-h-screen w-full">
      <Sidebar :mobile-open="uiStore.sidebarOpen" @close="uiStore.closeSidebar" @navigate="uiStore.closeSidebar" />
      <div class="at-shell-content flex min-w-0 flex-1 flex-col overflow-x-hidden" :inert="uiStore.sidebarOpen">
        <Topbar :mobile-sidebar-open="uiStore.sidebarOpen" @toggle-sidebar="uiStore.toggleSidebar" />
        <main class="at-shell-main flex-1 overflow-y-auto overflow-x-hidden p-5 lg:p-6 xl:p-8 2xl:p-10">
          <RouterView v-slot="{ Component, route }">
            <component
              :is="Component"
              :key="`${route.name || route.path}:${JSON.stringify(route.params || {})}`"
            />
          </RouterView>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, unref, watch } from "vue";
import { FeatherIcon } from "frappe-ui";
import { useRoute } from "vue-router";
import Sidebar from "./Sidebar.vue";
import Topbar from "./Topbar.vue";
import { sessionState } from "../state/session";
import { useUiStore } from "../state/uiStore";
import { getAppPinia } from "../../pinia";
import { useAuthStore } from "../state/authStore";
import { translateText } from "../i18n";

const uiStore = useUiStore();
const authStore = useAuthStore(getAppPinia());
const route = useRoute();
const scopeRefreshNotice = ref("");
const locale = computed(() => unref(authStore.locale) || "en");

let scopeChangeHandler = null;
let emergencyAccessHandler = null;

function t(key) {
  return translateText(key, locale.value);
}

function interpolate(source, values) {
  return source.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

// - No auto-reload: if the user has an unsaved form open, a forced reload would
//   discard their work. Instead we show a persistent notice and let the user
//   decide when it is safe to reload.
function handleScopeChanged(payload) {
  const targetUser = String(payload?.user || "").trim();
  if (targetUser && sessionState.userId && targetUser !== sessionState.userId) {
    return;
  }
  scopeRefreshNotice.value = t("scopeRefreshNotice");
}

function handleEmergencyAccessGranted(payload) {
  // Only show to System Managers (Role check happens here)
  const userRoles = authStore.roles || [];
  if (!userRoles.includes("System Manager") && !userRoles.includes("AT System Manager")) {
    return;
  }

  const { beneficiary, scope } = payload;
  scopeRefreshNotice.value = interpolate(t("emergencyAccessNotice"), { beneficiary, scope });
}

function confirmScopeRefresh() {
  scopeRefreshNotice.value = "";
  window.location.reload();
}

function dismissScopeNotice() {
  scopeRefreshNotice.value = "";
}

function bindScopeRealtimeListener() {
  const realtime = window?.frappe?.realtime;
  if (!realtime || typeof realtime.on !== "function") {
    return;
  }

  scopeChangeHandler = (payload) => {
    handleScopeChanged(payload || {});
  };
  
  emergencyAccessHandler = (payload) => {
    handleEmergencyAccessGranted(payload || {});
  };

  realtime.on("at_scope_changed", scopeChangeHandler);
  realtime.on("at_emergency_access_granted", emergencyAccessHandler);
}

function unbindScopeRealtimeListener() {
  const realtime = window?.frappe?.realtime;
  if (!realtime || typeof realtime.off !== "function") {
    return;
  }
  if (scopeChangeHandler) {
    realtime.off("at_scope_changed", scopeChangeHandler);
    scopeChangeHandler = null;
  }
  if (emergencyAccessHandler) {
    realtime.off("at_emergency_access_granted", emergencyAccessHandler);
    emergencyAccessHandler = null;
  }
}

watch(
  () => locale.value,
  (newLocale) => {
    // Standard solution for Turkish case conversion (i -> İ) with CSS uppercase.
    // Browsers rely on the HTML lang attribute to apply correct locale-specific 
    // transformations. Setting this dynamically ensures consistency across 
    // the entire application shell.
    document.documentElement.lang = newLocale || "en";
  },
  { immediate: true }
);

watch(
  () => route.fullPath,
  () => {
    // Keep mobile navigation predictable: any route transition closes the drawer.
    uiStore.closeSidebar();
  }
);

onMounted(() => {
  bindScopeRealtimeListener();
});

onBeforeUnmount(() => {
  unbindScopeRealtimeListener();
});
</script>
