<template>
  <div class="app-shell min-h-screen w-full">
    <div class="flex min-h-screen w-full">
      <Sidebar :mobile-open="uiState.sidebarOpen" @close="closeSidebar" @navigate="closeSidebar" />
      <div class="at-shell-content flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <Topbar @toggle-sidebar="toggleSidebar" />
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
import Sidebar from "./components/Sidebar.vue";
import Topbar from "./components/Topbar.vue";
import { closeSidebar, toggleSidebar, uiState } from "./state/ui";
</script>
