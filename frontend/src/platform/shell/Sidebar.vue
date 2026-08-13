<template>
  <div>
    <button
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-brand-600/40 backdrop-blur-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden"
      type="button"
      tabindex="-1"
      :aria-label="t('close')"
      @click="$emit('close')"
    />
    <aside
      ref="mobileDrawer"
      id="mobile-sidebar-drawer"
      class="fixed inset-y-0 left-0 z-40 flex h-screen w-[220px] shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 motion-reduce:transition-none lg:static lg:z-0"
      :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0', effectiveCollapsed ? 'lg:w-[76px]' : 'lg:w-[240px]']"
      :role="mobileOpen && !isDesktopViewport ? 'dialog' : undefined"
      :aria-label="mobileOpen && !isDesktopViewport ? t('menu') : undefined"
      :aria-modal="mobileOpen && !isDesktopViewport ? 'true' : undefined"
    >
      <div class="border-b border-slate-100 px-4 py-4">
        <div class="mb-4 flex items-center justify-between lg:hidden">
          <p class="text-xs font-semibold tracking-[0.22em] text-slate-500">{{ upper(t("menu")) }}</p>
          <ActionButton data-testid="mobile-sidebar-close" variant="secondary" size="xs" class="!px-2" :title="t('close')" @click="$emit('close')">
            X
          </ActionButton>
        </div>

        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <p v-if="!effectiveCollapsed" class="truncate text-sm font-medium text-slate-900" :title="t('brand')">
              {{ t("brand") }}
            </p>
            <template v-else>
              <p
                data-testid="sidebar-brand-monogram"
                class="mt-2 text-center text-xs font-semibold text-slate-700"
                role="img"
                :aria-label="t('brand')"
                :title="t('brand')"
              >
                AT
              </p>
            </template>
          </div>

          <button
            data-testid="sidebar-desktop-collapse-toggle"
            class="max-lg:hidden grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none lg:grid"
            type="button"
            :aria-label="effectiveCollapsed ? expandMenuLabel : collapseMenuLabel"
            :title="effectiveCollapsed ? expandMenuLabel : collapseMenuLabel"
            @click="toggleSidebarCollapsedDesktop"
          >
            <component :is="effectiveCollapsed ? IconLucidePanelLeftOpen : IconLucidePanelLeftClose" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav class="flex-1 min-h-0 overflow-y-auto pb-4">
        <div v-for="section in navSections" :key="section.title" class="mb-4">
          <p
            v-if="!effectiveCollapsed"
            class="px-4 pb-1 pt-4 text-[10px] font-semibold tracking-widest text-slate-400"
          >
            {{ upper(section.title) }}
          </p>
          <div v-else class="mx-2 mb-2 border-t border-slate-200/80" />

          <template v-for="item in section.items" :key="item.key">
            <a
              v-if="item.external"
              :href="item.to"
              :title="item.label"
              class="group mx-2 mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
              :class="linkClass(item, effectiveCollapsed)"
              @click="$emit('navigate')"
            >
              <component
                v-if="item.icon"
                :is="item.icon"
                class="h-5 w-5 shrink-0 text-slate-500 hover:text-slate-900"
                :class="item.badgeClass"
              />
              <span
                v-else
                class="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-500"
                :class="item.badgeClass"
              >
                {{ item.short }}
              </span>
              <div v-if="!effectiveCollapsed" class="min-w-0 flex-1">
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
              class="group mx-2 mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
              :class="linkClass(item, effectiveCollapsed)"
              active-class="bg-brand-50 text-brand-700 font-medium border-l-2 border-brand-600 !rounded-l-none pl-[10px]"
              @click="$emit('navigate')"
            >
              <component
                v-if="item.icon"
                :is="item.icon"
                class="h-5 w-5 shrink-0 text-slate-500 [.router-link-active_&]:text-brand-700"
                :class="item.badgeClass"
              />
              <span
                v-else
                class="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-500 [.router-link-active_&]:bg-brand-100 [.router-link-active_&]:text-brand-700"
                :class="item.badgeClass"
              >
                {{ item.short }}
              </span>
              <div v-if="!effectiveCollapsed" class="min-w-0 flex-1">
                <p class="truncate font-medium" :class="item.indent ? 'text-xs text-slate-500' : ''">
                  {{ item.label }}
                </p>
              </div>
            </RouterLink>
          </template>
        </div>
      </nav>

      <footer class="mt-auto shrink-0 border-t border-slate-100 px-3 py-3">
        <SidebarProfileMenu :collapsed="effectiveCollapsed" :mobile="false" />
      </footer>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";

import ActionButton from "../ui/shell/ActionButton.vue";
import SidebarProfileMenu from "../../components/app-shell/SidebarProfileMenu.vue";
import IconLucidePanelLeftClose from '~icons/lucide/panel-left-close';
import IconLucidePanelLeftOpen from '~icons/lucide/panel-left-open';
import { useSidebarNavigation } from "../composables/useSidebarNavigation";

const props = defineProps({
  mobileOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "navigate"]);

const {
  t,
  upper,
  isCollapsed,
  collapseMenuLabel,
  expandMenuLabel,
  navSections,
  toggleSidebarCollapsedDesktop,
  linkClass,
} = useSidebarNavigation();

const isDesktopViewport = shallowRef(false);
const effectiveCollapsed = computed(() => isCollapsed.value && isDesktopViewport.value);
const mobileDrawer = shallowRef(null);
let isMounted = false;
let desktopMediaQuery = null;
let desktopMediaQueryListenerMode = null;
let mobileDrawerKeydownListener = null;

function focusMobileCloseControl() {
  document.querySelector('[data-testid="mobile-sidebar-close"]')?.focus();
}

function restoreMobileSidebarTriggerFocus() {
  const trigger = document.querySelector('[data-testid="mobile-sidebar-trigger"]');
  if (trigger instanceof HTMLElement && document.contains(trigger)) trigger.focus();
}

function isTabbable(element) {
  if (!(element instanceof HTMLElement) || element.hidden || element.getAttribute("aria-hidden") === "true") return false;
  if (element.hasAttribute("disabled") || element.closest("fieldset:disabled")) return false;
  const styles = window.getComputedStyle(element);
  if (styles.display === "none" || styles.visibility === "hidden") return false;
  return element.tabIndex >= 0;
}

function getMobileDrawerTabbables() {
  const drawer = mobileDrawer.value;
  const drawerTabbables = drawer
    ? [...drawer.querySelectorAll("button, a[href], input, select, textarea, [tabindex]")]
    : [];
  const profileMenu = document.querySelector('[data-testid="sidebar-profile-menu"]');
  const profileTabbables = profileMenu
    ? [...profileMenu.querySelectorAll("button, a[href], input, select, textarea, [tabindex]")]
    : [];
  return [...drawerTabbables, ...profileTabbables].filter(isTabbable);
}

function handleMobileDrawerKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key !== "Tab") return;

  const tabbables = getMobileDrawerTabbables();
  if (!tabbables.length) return;
  const currentIndex = tabbables.indexOf(document.activeElement);
  if (currentIndex === -1) return;
  if (!event.shiftKey && currentIndex === tabbables.length - 1) {
    event.preventDefault();
    tabbables[0].focus();
  } else if (event.shiftKey && currentIndex === 0) {
    event.preventDefault();
    tabbables[tabbables.length - 1].focus();
  }
}

function removeMobileDrawerListener() {
  if (!mobileDrawerKeydownListener) return;
  document.removeEventListener("keydown", mobileDrawerKeydownListener);
  mobileDrawerKeydownListener = null;
}

function syncMobileDrawerListener() {
  if (!isMounted) return;
  const shouldListen = props.mobileOpen && !isDesktopViewport.value;
  if (typeof document === "undefined") return;
  if (shouldListen && !mobileDrawerKeydownListener) {
    mobileDrawerKeydownListener = handleMobileDrawerKeydown;
    document.addEventListener("keydown", mobileDrawerKeydownListener);
  } else if (!shouldListen) {
    removeMobileDrawerListener();
  }
}

watch(
  () => props.mobileOpen,
  (isOpen, wasOpen) => {
    if (isOpen === wasOpen || isDesktopViewport.value) return;
    nextTick(() => {
      if (isDesktopViewport.value) return;
      if (isOpen) focusMobileCloseControl();
      else restoreMobileSidebarTriggerFocus();
    });
  },
  { immediate: true },
);

watch(() => [props.mobileOpen, isDesktopViewport.value], syncMobileDrawerListener, { immediate: true });

function updateDesktopViewport(event) {
  isDesktopViewport.value = Boolean(event?.matches ?? desktopMediaQuery?.matches);
}

onMounted(() => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

  desktopMediaQuery = window.matchMedia("(min-width: 1024px)");
  updateDesktopViewport();
  isMounted = true;
  syncMobileDrawerListener();
  if (typeof desktopMediaQuery.addEventListener === "function") {
    desktopMediaQueryListenerMode = "eventListener";
    desktopMediaQuery.addEventListener("change", updateDesktopViewport);
  } else if (typeof desktopMediaQuery.addListener === "function") {
    desktopMediaQueryListenerMode = "listener";
    desktopMediaQuery.addListener(updateDesktopViewport);
  }
});

onBeforeUnmount(() => {
  isMounted = false;
  removeMobileDrawerListener();
  if (!desktopMediaQuery) return;
  if (desktopMediaQueryListenerMode === "eventListener") {
    desktopMediaQuery.removeEventListener("change", updateDesktopViewport);
  } else if (desktopMediaQueryListenerMode === "listener") {
    desktopMediaQuery.removeListener(updateDesktopViewport);
  }
  desktopMediaQuery = null;
  desktopMediaQueryListenerMode = null;
});
</script>

