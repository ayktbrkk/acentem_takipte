import { computed } from "vue";
import { defineStore } from "pinia";

import {
  closeSidebar,
  openSidebar,
  setSidebarCollapsed,
  toggleSidebar,
  toggleSidebarCollapsed,
  uiState,
} from "../state/ui";

export const useUiStore = defineStore("ui", () => {
  const sidebarOpen = computed(() => uiState.sidebarOpen);
  const sidebarCollapsed = computed(() => uiState.sidebarCollapsed);

  function setCollapsed(value) {
    setSidebarCollapsed(value);
  }

  return {
    sidebarOpen,
    sidebarCollapsed,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    setCollapsed,
    toggleSidebarCollapsed,
  };
});
