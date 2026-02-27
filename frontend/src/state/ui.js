import { reactive } from "vue";

const SIDEBAR_COLLAPSED_KEY = "at_sidebar_collapsed";

function readSidebarCollapsed() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function writeSidebarCollapsed(value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? "1" : "0");
  } catch (error) {
    // Ignore storage errors.
  }
}

export const uiState = reactive({
  sidebarOpen: false,
  sidebarCollapsed: readSidebarCollapsed(),
});

export function openSidebar() {
  uiState.sidebarOpen = true;
}

export function closeSidebar() {
  uiState.sidebarOpen = false;
}

export function toggleSidebar() {
  uiState.sidebarOpen = !uiState.sidebarOpen;
}

export function setSidebarCollapsed(value) {
  uiState.sidebarCollapsed = Boolean(value);
  writeSidebarCollapsed(uiState.sidebarCollapsed);
}

export function toggleSidebarCollapsed() {
  setSidebarCollapsed(!uiState.sidebarCollapsed);
}
