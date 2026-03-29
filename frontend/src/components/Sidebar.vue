<template>
  <div>
    <button
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
      type="button"
      @click="$emit('close')"
    />
    <aside
      class="fixed inset-y-0 left-0 z-40 flex h-screen w-[220px] shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white transition-all duration-200 lg:static lg:z-0"
      :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0', isCollapsed ? 'lg:w-24' : 'lg:w-[220px]']"
    >
      <SidebarBrandPanel
        :menu-label="menuLabel"
        :brand-label="brandLabel"
        :subtitle-label="subtitleLabel"
        :mini-title-label="miniTitleLabel"
        :collapsed="isCollapsed"
        :toggle-title="sidebarToggleTitle"
        @close="$emit('close')"
        @toggle-collapse="toggleSidebarCollapsedDesktop"
      />

      <nav class="flex-1 overflow-y-auto pb-4">
        <SidebarNavGroup
          v-for="section in navSections"
          :key="section.title"
          :section="section"
          :collapsed="isCollapsed"
          @navigate="$emit('navigate')"
        />
      </nav>

      <SidebarFooterPanel
        :collapsed="isCollapsed"
        :user-initials="userInitials"
        :user-display-name="userDisplayName"
        :branch-label="branchLabel"
        :toggle-title="sidebarToggleTitle"
        :toggle-short-label="sidebarToggleShortLabel"
        :collapse-sidebar-label="collapseSidebarLabel"
        @toggle-collapse="toggleSidebarCollapsedDesktop"
      />
    </aside>
  </div>
</template>

<script setup>
import SidebarBrandPanel from "./sidebar/SidebarBrandPanel.vue";
import SidebarFooterPanel from "./sidebar/SidebarFooterPanel.vue";
import SidebarNavGroup from "./sidebar/SidebarNavGroup.vue";
import { useSidebarNavigation } from "../composables/useSidebarNavigation";

defineProps({
  mobileOpen: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["close", "navigate"]);

const {
  isCollapsed,
  menuLabel,
  brandLabel,
  subtitleLabel,
  miniTitleLabel,
  collapseSidebarLabel,
  sidebarToggleTitle,
  sidebarToggleShortLabel,
  userDisplayName,
  userInitials,
  branchLabel,
  navSections,
  toggleSidebarCollapsedDesktop,
} = useSidebarNavigation();
</script>
