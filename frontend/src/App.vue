<template>
  <div class="app-shell min-h-screen w-full">
    <div
      v-if="scopeRefreshNotice"
      class="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow"
      role="alert"
      aria-live="assertive"
    >
      <span class="flex-1">{{ scopeRefreshNotice }}</span>
      <button
        class="shrink-0 rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        @click="confirmScopeRefresh"
      >
        {{ locale === 'tr' ? 'Yenile' : 'Refresh' }}
      </button>
      <button
        class="shrink-0 text-amber-700 hover:text-amber-900 focus:outline-none"
        :aria-label="locale === 'tr' ? 'Kapat' : 'Dismiss'"
        @click="dismissScopeNotice"
      >
        &times;
      </button>
    </div>
    <div class="flex min-h-screen w-full">
      <Sidebar :mobile-open="uiStore.sidebarOpen" @close="uiStore.closeSidebar" @navigate="uiStore.closeSidebar" />
      <div class="at-shell-content flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <Topbar @toggle-sidebar="uiStore.toggleSidebar" />
        <main class="at-shell-main flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 xl:px-8 2xl:px-10">
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
import { useRoute } from "vue-router";
import Sidebar from "./components/Sidebar.vue";
import Topbar from "./components/Topbar.vue";
import { sessionState } from "./state/session";
import { useUiStore } from "./stores/ui";
import { getAppPinia } from "./pinia";
import { useAuthStore } from "./stores/auth";

const uiStore = useUiStore();
const authStore = useAuthStore(getAppPinia());
const route = useRoute();
const scopeRefreshNotice = ref("");
const locale = computed(() => unref(authStore.locale) || "en");

let scopeChangeHandler = null;

// - No auto-reload: if the user has an unsaved form open, a forced reload would
//   discard their work. Instead we show a persistent notice and let the user
//   decide when it is safe to reload.
function handleScopeChanged(payload) {
  const targetUser = String(payload?.user || "").trim();
  if (targetUser && sessionState.userId && targetUser !== sessionState.userId) {
    return;
  }
  scopeRefreshNotice.value = locale.value === "tr"
    ? "Erisim yetkileriniz guncellendi. Guncel yetkilerle devam etmek icin sayfayi yenileyin."
    : "Your access permissions have been updated. Refresh to continue with the latest permissions.";
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
  realtime.on("at_scope_changed", scopeChangeHandler);
}

function unbindScopeRealtimeListener() {
  const realtime = window?.frappe?.realtime;
  if (!realtime || typeof realtime.off !== "function" || !scopeChangeHandler) {
    return;
  }
  realtime.off("at_scope_changed", scopeChangeHandler);
  scopeChangeHandler = null;
}

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
