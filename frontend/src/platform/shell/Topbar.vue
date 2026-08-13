<template>
  <header class="at-shell-topbar sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur sm:px-4 lg:px-6">
    <div class="flex w-full flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          data-testid="mobile-sidebar-trigger"
          class="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 lg:hidden"
          type="button"
          @click="$emit('toggle-sidebar')"
        >
          {{ t("menu") }}
        </button>
        <div>
          <p class="text-xs tracking-wide text-slate-500">{{ upperLabel(sectionLabel) }}</p>
          <p class="text-lg font-semibold text-slate-900">{{ pageTitle }}</p>
        </div>
      </div>

      <div class="flex w-full items-center justify-end gap-2 md:w-auto md:gap-3">
        <OfficeBranchSelect v-if="authStore.officeBranches.length || authStore.canAccessAllOfficeBranches" />
        <div ref="languageMenuRef" class="relative hidden lg:block">
          <button
            data-testid="topbar-language-trigger"
            class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="languageMenuOpen ? 'true' : 'false'"
             @click="toggleLanguageMenu"
          >
            <IconLucideGlobe2 class="h-4 w-4 text-slate-500" />
            <span>{{ currentLanguageLabel }}</span>
          </button>
          <div
            v-if="languageMenuOpen"
            data-testid="topbar-language-menu"
            class="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10"
            role="menu"
            :aria-label="t('language')"
          >
            <button
              v-for="item in localeItems"
              :key="item.locale"
              class="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              type="button"
              role="menuitem"
              :aria-current="authStore.locale === item.locale ? 'true' : undefined"
              @click="setLocale(item.locale)"
            >
              <span>{{ item.label }}</span>
              <span v-if="authStore.locale === item.locale" aria-hidden="true">✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import OfficeBranchSelect from "../../components/app-shell/OfficeBranchSelect.vue";
import IconLucideGlobe2 from '~icons/lucide/globe-2';
import { useLocalePreference } from "../composables/useLocalePreference";
import { useAuthStore } from "../state/authStore";
import { translateText, uppercaseText } from "@/platform/i18n";

defineEmits(["toggle-sidebar"]);

const route = useRoute();
const authStore = useAuthStore();
const languageMenuOpen = ref(false);
const languageMenuRef = ref(null);
const { setLocale: persistLocale } = useLocalePreference();

function t(key) {
  return translateText(key, authStore.locale);
}

const pageTitle = computed(() => {
  const title = route.meta?.title;
  if (title && typeof title === "object") {
    return title[authStore.locale] || title.en || t("defaultPage");
  }
  return translateText(title || t("defaultPage"), authStore.locale);
});
const sectionLabel = computed(() => {
  const section = route.meta?.section;
  if (section && typeof section === "object") {
    return section[authStore.locale] || section.en || t("defaultSection");
  }
  return translateText(section || t("defaultSection"), authStore.locale);
});

function upperLabel(value) {
  return uppercaseText(value, authStore.locale);
}

const localeItems = computed(() => [
  { locale: "tr", label: t("turkish") },
  { locale: "en", label: t("english") },
]);
const currentLanguageLabel = computed(() => localeItems.value.find((item) => item.locale === authStore.locale)?.label || t("english"));

function toggleLanguageMenu() {
  if (languageMenuOpen.value) {
    closeLanguageMenu(true);
    return;
  }
  languageMenuOpen.value = true;
  nextTick(focusFirstLanguageItem);
}

async function setLocale(locale) {
  await persistLocale(locale);
  closeLanguageMenu(true);
}

function focusTrigger() {
  languageMenuRef.value?.querySelector('[data-testid="topbar-language-trigger"]')?.focus();
}

function closeLanguageMenu(restoreFocus = false) {
  languageMenuOpen.value = false;
  if (restoreFocus) focusTrigger();
}

function focusFirstLanguageItem() {
  languageMenuRef.value?.querySelector('[role="menuitem"]')?.focus();
}

function handleDocumentClick(event) {
  if (languageMenuOpen.value && !languageMenuRef.value?.contains(event.target)) closeLanguageMenu();
}

function handleKeydown(event) {
  if (!languageMenuOpen.value) return;
  if (event.key === "Escape") {
    closeLanguageMenu(true);
    return;
  }

  const items = [...languageMenuRef.value.querySelectorAll('[role="menuitem"]')];
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
});

</script>

