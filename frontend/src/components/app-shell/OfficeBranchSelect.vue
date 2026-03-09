<template>
  <label
    class="flex min-w-[180px] flex-col gap-1 rounded-lg border px-3 py-2"
    :class="isLocked ? 'border-slate-200 bg-slate-100/80' : 'border-slate-200 bg-slate-50'"
  >
    <span class="text-[11px] text-slate-500">{{ t("branch") }}</span>
    <select
      class="bg-transparent text-sm font-semibold outline-none"
      :class="isLocked ? 'cursor-not-allowed text-slate-500' : 'text-slate-800'"
      :value="selectedValue"
      :disabled="isLocked"
      :aria-label="t('branch')"
      @change="onChange"
    >
      <option v-if="branchStore.canAccessAll" value="">{{ t("allBranches") }}</option>
      <option v-for="option in branchStore.options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <span class="text-[11px] text-slate-500">{{ helperLabel }}</span>
  </label>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "../../stores/auth";
import { useBranchStore } from "../../stores/branch";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();

const copy = {
  tr: {
    branch: "Sube",
    allBranches: "Tum Subeler",
    allBranchesActive: "Tum subeler goruntuleniyor",
    singleBranchLocked: "Kullanici kapsaminda sabit sube",
    activeBranchPrefix: "Aktif",
  },
  en: {
    branch: "Branch",
    allBranches: "All Branches",
    allBranchesActive: "Showing all branches",
    singleBranchLocked: "Locked to assigned branch",
    activeBranchPrefix: "Active",
  },
};

function t(key) {
  const locale = unref(authStore.locale) || "en";
  return copy[locale]?.[key] || copy.en[key] || key;
}

const selectedValue = computed(() => branchStore.selected || "");
const isLocked = computed(() => !branchStore.canAccessAll && branchStore.options.length <= 1);
const helperLabel = computed(() => {
  if (branchStore.canAccessAll && !branchStore.requestBranch) {
    return t("allBranchesActive");
  }

  const activeLabel =
    branchStore.activeBranch?.label ||
    branchStore.options.find((option) => option.value === branchStore.requestBranch)?.label ||
    branchStore.requestBranch ||
    "";

  if (isLocked.value) {
    return activeLabel ? `${t("singleBranchLocked")} • ${activeLabel}` : t("singleBranchLocked");
  }

  return activeLabel ? `${t("activeBranchPrefix")}: ${activeLabel}` : "";
});

async function onChange(event) {
  if (isLocked.value) return;
  const nextValue = String(event?.target?.value || "");
  branchStore.setActiveBranch(nextValue);
  await branchStore.persistToRoute(router, route);
}
</script>
