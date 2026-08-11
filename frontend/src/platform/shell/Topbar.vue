<template>
  <header class="at-shell-topbar sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur sm:px-4 lg:px-6">
    <div class="flex w-full flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
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

      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

import OfficeBranchSelect from "../ui/shell/OfficeBranchSelect.vue";
import { useAuthStore } from "../state/authStore";
import { translateText, uppercaseText } from "@/platform/i18n";

defineEmits(["toggle-sidebar"]);

const route = useRoute();
const authStore = useAuthStore();

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

</script>

