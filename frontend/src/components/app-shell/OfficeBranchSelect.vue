<template>
  <label
    class="flex min-w-[220px] flex-col gap-1 rounded-lg border px-3 py-2"
    :class="isLocked ? 'border-slate-200 bg-slate-100/80' : 'border-slate-200 bg-slate-50'"
  >
    <span class="text-[11px] text-slate-500">{{ t("scope") }}</span>
    <select
      class="bg-transparent text-sm font-semibold outline-none"
      :class="isLocked ? 'cursor-not-allowed text-slate-500' : 'text-slate-800'"
      :value="selectedValue"
      :disabled="isLocked"
      :aria-label="t('scope')"
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
    scope: "Şube Kapsamı",
    allBranches: "Tüm Şubeler",
    allBranchesActive: "Tüm şubeler seçili",
    singleBranchLocked: "Sabit kapsam",
    defaultBranchPrefix: "Ana sube",
    defaultBranchMissing: "Ana sube tanimli degil",
  },
  en: {
    scope: "Branch Scope",
    allBranches: "All Branches",
    allBranchesActive: "All branches selected",
    singleBranchLocked: "Locked scope",
    defaultBranchPrefix: "Main branch",
    defaultBranchMissing: "Main branch not set",
  },
};

function t(key) {
  const locale = unref(authStore.locale) || "en";
  return copy[locale]?.[key] || copy.en[key] || key;
}

const selectedValue = computed(() => branchStore.selected || "");
const isLocked = computed(() => !branchStore.canAccessAll && branchStore.options.length <= 1);
const defaultBranchLabel = computed(() =>
  branchStore.defaultBranch?.office_branch_name || branchStore.defaultBranch?.name || ""
);
const helperLabel = computed(() => {
  const defaultLabel = (defaultBranchLabel.value
    ? `${t("defaultBranchPrefix")}: ${defaultBranchLabel.value}`
    : t("defaultBranchMissing"));

  if (branchStore.canAccessAll && !branchStore.requestBranch) {
    return [t("allBranchesActive"), defaultLabel].filter(Boolean).join(" • ");
  }

  if (isLocked.value) {
    return [t("singleBranchLocked"), defaultLabel].filter(Boolean).join(" • ");
  }

  return defaultLabel;
});

async function onChange(event) {
  if (isLocked.value) return;
  const nextValue = String(event?.target?.value || "");
  branchStore.setActiveBranch(nextValue);
  await branchStore.persistToRoute(router, route);
}
</script>
