<template>
  <div ref="rootRef" class="relative shrink-0">
    <button
      data-testid="mobile-sidebar-language-trigger"
      class="flex min-w-[112px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left shadow-sm shadow-slate-900/5 transition hover:border-brand-200 hover:bg-brand-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      type="button"
      aria-haspopup="menu"
      :aria-controls="menuOpen ? 'mobile-sidebar-language-menu' : undefined"
      :aria-expanded="menuOpen ? 'true' : 'false'"
      :aria-label="menuOpen ? t('closeLanguageMenu') : t('openLanguageMenu')"
      @click="toggleMenu"
    >
      <IconLucideGlobe2 class="h-4 w-4 shrink-0 text-brand-600" />
      <span class="min-w-0 flex-1">
        <span class="block text-[9px] font-semibold uppercase tracking-[0.14em] leading-3 text-slate-400">{{ t("language") }}</span>
        <span class="mt-0.5 block truncate text-xs font-semibold leading-4 text-slate-800">{{ currentLanguageLabel }}</span>
      </span>
    </button>

    <div
      v-if="menuOpen"
      id="mobile-sidebar-language-menu"
      data-testid="mobile-sidebar-language-menu"
      class="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10"
      role="menu"
      :aria-label="t('language')"
    >
      <button
        v-for="(item, index) in localeItems"
        :key="item.locale"
        class="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        type="button"
        role="menuitemradio"
        :tabindex="focusIndex === index ? 0 : -1"
        :aria-checked="authStore.locale === item.locale ? 'true' : 'false'"
        @focus="focusIndex = index"
        @click="setLocale(item.locale)"
      >
        <span>{{ item.label }}</span>
        <span v-if="authStore.locale === item.locale" aria-hidden="true">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import IconLucideGlobe2 from '~icons/lucide/globe-2';
import { translateText } from "../../platform/i18n";
import { useLocalePreference } from "../../platform/composables/useLocalePreference";
import { useAuthStore } from "../../platform/state/authStore";

const authStore = useAuthStore();
const rootRef = ref(null);
const menuOpen = ref(false);
const focusIndex = ref(0);
const { setLocale: persistLocale } = useLocalePreference();

function t(key) {
  return translateText(key, authStore.locale);
}

const localeItems = computed(() => [
  { locale: "tr", label: t("turkish") },
  { locale: "en", label: t("english") },
]);
const currentLanguageLabel = computed(() => localeItems.value.find((item) => item.locale === authStore.locale)?.label || t("english"));

function toggleMenu() {
  if (menuOpen.value) {
    closeMenu(true);
    return;
  }
  focusIndex.value = 0;
  menuOpen.value = true;
  nextTick(() => focusItem(0));
}

function closeMenu(restoreFocus = false) {
  menuOpen.value = false;
  if (restoreFocus) rootRef.value?.querySelector("[data-testid='mobile-sidebar-language-trigger']")?.focus();
}

function focusItem(index) {
  const items = [...(rootRef.value?.querySelectorAll('[role="menuitemradio"]') || [])];
  if (!items[index]) return;
  focusIndex.value = index;
  items[index].focus();
}

async function setLocale(locale) {
  await persistLocale(locale);
  closeMenu(true);
}

function handleClick(event) {
  if (menuOpen.value && !rootRef.value?.contains(event.target)) closeMenu();
}

function handleKeydown(event) {
  if (!menuOpen.value) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu(true);
    return;
  }
  const items = [...(rootRef.value?.querySelectorAll('[role="menuitemradio"]') || [])];
  const current = items.indexOf(document.activeElement);
  if (!items.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "Home") return focusItem(0);
  if (event.key === "End") return focusItem(items.length - 1);
  const direction = event.key === "ArrowDown" ? 1 : -1;
  focusItem(current < 0 ? (direction === 1 ? 0 : items.length - 1) : (current + direction + items.length) % items.length);
}

onMounted(() => {
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClick);
  document.removeEventListener("keydown", handleKeydown);
});
</script>
