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
      <div class="border-b border-gray-100 px-4 py-4">
        <div class="mb-4 flex items-center justify-between lg:hidden">
          <p class="text-xs font-semibold tracking-[0.22em] text-slate-500">{{ upper(t("menu")) }}</p>
          <button class="rounded-lg border border-slate-300 px-2 py-1 text-xs" type="button" @click="$emit('close')">
            X
          </button>
        </div>

        <div class="flex items-start gap-2.5">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900" :class="isCollapsed ? 'text-center' : ''">{{ t("brand") }}</p>
            <template v-if="!isCollapsed">
              <p class="mt-0.5 text-xs text-gray-400">{{ t("subtitle") }}</p>
            </template>
            <template v-else>
              <p class="mt-2 text-center text-xs font-semibold text-slate-700">{{ t("miniTitle") }}</p>
            </template>
          </div>

          <button
            class="hidden h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 lg:grid"
            type="button"
            :title="isCollapsed ? t('expandSidebar') : t('collapseSidebar')"
            @click="toggleSidebarCollapsedDesktop"
          >
            {{ isCollapsed ? ">>" : "<<" }}
          </button>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto pb-4">
        <div v-for="section in navSections" :key="section.title" class="mb-4">
          <p
            v-if="!isCollapsed"
            class="px-4 pb-1 pt-4 text-[10px] font-semibold tracking-widest text-gray-400"
          >
            {{ upper(section.title) }}
          </p>
          <div v-else class="mx-2 mb-2 border-t border-slate-200/80" />

          <template v-for="item in section.items" :key="item.key">
            <a
              v-if="item.external"
              :href="item.to"
              :title="item.label"
              class="group mx-2 mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900"
              :class="linkClass(item)"
              @click="$emit('navigate')"
            >
              <span
                class="grid h-6 w-6 shrink-0 place-items-center rounded bg-gray-100 text-[10px] font-semibold text-gray-500"
                :class="item.badgeClass"
              >
                {{ item.short }}
              </span>
              <div v-if="!isCollapsed" class="min-w-0 flex-1">
                <p class="truncate font-medium" :class="item.indent ? 'text-xs text-slate-500' : ''">
                  {{ item.label }}
                </p>
              </div>
            </a>

            <!-- audit(perf/P-03): v-prefetch preloads the route chunk on hover -->
            <RouterLink
              v-else
              v-prefetch="item.to"
              :to="item.to"
              :title="item.label"
              class="group mx-2 mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900"
              :class="linkClass(item)"
              active-class="bg-brand-50 text-brand-700 font-medium border-l-2 border-brand-600 !rounded-l-none pl-[10px]"
              @click="$emit('navigate')"
            >
              <span
                class="grid h-6 w-6 shrink-0 place-items-center rounded bg-gray-100 text-[10px] font-semibold text-gray-500 [.router-link-active_&]:bg-brand-100 [.router-link-active_&]:text-brand-700"
                :class="item.badgeClass"
              >
                {{ item.short }}
              </span>
              <div v-if="!isCollapsed" class="min-w-0 flex-1">
                <p class="truncate font-medium" :class="item.indent ? 'text-xs text-slate-500' : ''">
                  {{ item.label }}
                </p>
              </div>
            </RouterLink>
          </template>
        </div>
      </nav>

      <footer class="mt-auto border-t border-gray-100 px-4 py-3">
        <div class="mb-3 flex items-center gap-2.5">
          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
            {{ userInitials }}
          </div>
          <div v-if="!isCollapsed" class="min-w-0">
            <p class="truncate text-xs font-medium text-gray-900">{{ userDisplayName }}</p>
            <p class="truncate text-[10px] text-gray-400">{{ branchLabel }}</p>
          </div>
        </div>
        <button
          class="hidden w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 lg:flex"
          type="button"
          :title="isCollapsed ? t('expandSidebar') : t('collapseSidebar')"
          @click="toggleSidebarCollapsedDesktop"
        >
          <span class="text-[11px]">{{ isCollapsed ? t("expandShort") : t("collapseShort") }}</span>
          <span v-if="!isCollapsed">{{ t("collapseSidebar") }}</span>
        </button>
      </footer>
    </aside>
  </div>
</template>

<script setup>
import { useSidebarNavigation } from "../composables/useSidebarNavigation";

const props = defineProps({
  mobileOpen: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["close", "navigate"]);

const {
  t,
  upper,
  isCollapsed,
  userDisplayName,
  userInitials,
  branchLabel,
  navSections,
  toggleSidebarCollapsedDesktop,
  linkClass,
} = useSidebarNavigation();
</script>

