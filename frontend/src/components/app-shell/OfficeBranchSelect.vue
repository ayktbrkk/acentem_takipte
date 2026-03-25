<template>
  <div ref="pickerRef" class="relative min-w-[240px] max-w-[340px]">
    <div
      class="surface-card rounded-xl px-2.5 py-2 transition"
      :class="isLocked
        ? 'border-slate-200 bg-slate-100/85'
        : 'border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-sky-50/65 shadow-slate-200/70'"
    >
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{{ t("scope") }}</span>
        <span
          v-if="isLocked"
          class="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500"
        >
          {{ t("singleBranchLocked") }}
        </span>
      </div>

      <button
        ref="triggerRef"
        type="button"
        class="group flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-1.5 py-1 text-left transition"
        :class="isLocked
          ? 'cursor-not-allowed text-slate-500'
          : 'text-slate-900 hover:border-sky-200 hover:bg-white/85 focus:outline-none focus-visible:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-200/60'"
        :aria-label="t('scope')"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-controls="listboxId"
        :aria-activedescendant="activeDescendantId"
        :disabled="isLocked"
        data-testid="branch-scope-trigger"
        @click="toggleOpen"
        @keydown="onTriggerKeydown"
      >
        <span class="flex min-w-0 items-center gap-2">
          <span class="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-500 shadow-sm shadow-sky-300/60"></span>
          <span class="min-w-0">
            <span class="block truncate text-[13px] font-semibold">{{ selectedLabel }}</span>
            <span v-if="selectedMeta" class="block truncate text-[11px] text-slate-500">{{ selectedMeta }}</span>
          </span>
        </span>
        <span class="text-xs text-slate-500 transition group-hover:text-slate-700">{{ isOpen ? '▲' : '▼' }}</span>
      </button>

      <p class="mt-1 truncate text-[10px] text-slate-500">{{ helperLabel }}</p>
    </div>

    <div
      v-if="isOpen && !isLocked"
      :id="listboxId"
      class="absolute right-0 top-[calc(100%+0.45rem)] z-40 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
      role="listbox"
      tabindex="-1"
      :aria-label="t('scope')"
      @keydown="onListboxKeydown"
    >
      <div class="border-b border-slate-100 bg-slate-50/70 px-2.5 py-2">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{{ t("scope") }}</p>
        <p class="mt-0.5 text-xs text-slate-500">{{ helperLabel }}</p>
        <div class="mt-2 relative">
          <input
            ref="searchInputRef"
            v-model.trim="searchQuery"
            type="text"
            class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 pr-6 text-xs text-slate-700 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200/60"
            :placeholder="t('searchPlaceholder')"
            data-testid="branch-search-input"
            @keydown="onSearchInputKeydown"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            :aria-label="t('clear')"
            data-testid="branch-search-clear"
            @click="clearSearch"
          >
            <span class="text-sm">×</span>
          </button>
        </div>
      </div>
      <p
        v-if="filteredOptions.length === 0"
        class="px-2.5 py-3 text-center text-xs text-slate-500"
        data-testid="branch-option-empty"
      >
        {{ t("noResults") }}
      </p>
      <button
        v-for="(option, index) in filteredOptions"
        :key="option.value === null ? '__all__' : option.value"
        :id="optionDomId(index)"
        type="button"
        role="option"
        :ref="(el) => setOptionRef(el, index)"
        class="flex w-full items-start justify-between gap-2 px-2.5 py-2 text-left text-[13px] transition"
        :class="highlightedIndex === index
          ? 'bg-sky-100/80 text-sky-900'
          : String(option.value ?? '') === selectedValue
          ? 'bg-sky-50 text-sky-900'
          : 'text-slate-700 hover:bg-slate-50'"
        :aria-selected="String(option.value ?? '') === selectedValue ? 'true' : 'false'"
        :data-testid="`branch-option-${option.value === null ? 'all' : option.value}`"
        @mouseenter="setHighlightedIndex(index, { focus: false })"
        @click="onSelect(option.value)"
      >
        <span class="min-w-0">
          <span
            class="branch-option-label block truncate"
            :class="option.value === null ? 'font-semibold' : 'font-medium'"
          >
            <template v-for="(part, pIdx) in getHighlightedParts(option.label, searchQuery)" :key="pIdx">
              <mark v-if="part.isMatch">{{ part.text }}</mark>
              <span v-else>{{ part.text }}</span>
            </template>
          </span>
          <span v-if="option.meta" class="mt-0.5 block truncate text-[11px] text-slate-500">
            {{ option.meta }}
          </span>
        </span>
        <span
          v-if="String(option.value ?? '') === selectedValue"
          class="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700"
        >
          {{ t("selected") }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref, watch } from "vue";
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
    defaultBranchPrefix: "Varsayılan şube",
    defaultBranchMissing: "Varsayılan şube tanımlı değil",
    headOfficePrefix: "Merkez şube",
    selected: "Seçili",
    searchPlaceholder: "Şube ara...",
    noResults: "Eşleşen şube bulunamadı",
    clear: "Aramayı temizle",
  },
  en: {
    scope: "Branch Scope",
    allBranches: "All Branches",
    allBranchesActive: "All branches selected",
    singleBranchLocked: "Locked scope",
    defaultBranchPrefix: "Default branch",
    defaultBranchMissing: "Default branch not set",
    headOfficePrefix: "Head office",
    selected: "Selected",
    searchPlaceholder: "Search branch...",
    noResults: "No matching branch",
    clear: "Clear search",
  },
};

function t(key) {
  const locale = unref(authStore.locale) || "en";
  return copy[locale]?.[key] || copy.en[key] || key;
}

const selectedValue = computed(() => branchStore.selected || "");
const isLocked = computed(() => !branchStore.canAccessAll && branchStore.options.length <= 1);
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const pickerRef = ref(null);
const triggerRef = ref(null);
const searchInputRef = ref(null);
const optionRefs = ref([]);
const listboxId = "office-branch-scope-listbox";
const typeaheadQuery = ref("");
const typeaheadTimer = ref(null);
const searchQuery = ref("");

const selectableOptions = computed(() => {
  const options = branchStore.options.map((option) => ({
    value: option.value,
    label: option.label,
    meta: buildOptionMeta(option),
  }));
  if (branchStore.canAccessAll) {
    options.unshift({ value: null, label: t("allBranches"), meta: "" });
  }
  return options;
});
const filteredOptions = computed(() => {
  const query = normalizeOptionLabel(searchQuery.value);
  if (!query) {
    return selectableOptions.value;
  }
  return selectableOptions.value.filter((option) => {
    const label = normalizeOptionLabel(option.label);
    const meta = normalizeOptionLabel(option.meta);
    return label.includes(query) || meta.includes(query);
  });
});

const selectedLabel = computed(() => {
  if (branchStore.canAccessAll && !selectedValue.value) {
    return t("allBranches");
  }
  return branchStore.activeBranch?.office_branch_name || branchStore.activeBranch?.name || defaultBranchLabel.value || t("allBranches");
});

const defaultBranchLabel = computed(() =>
  branchStore.defaultBranch?.office_branch_name || branchStore.defaultBranch?.name || ""
);
const headOfficeLabel = computed(() => {
  const row = branchStore.items.find((item) => Number(item?.is_head_office || 0) === 1);
  return row?.office_branch_name || row?.name || "";
});
const selectedMeta = computed(() => {
  if (branchStore.canAccessAll && !selectedValue.value) {
    return t("allBranchesActive");
  }

  const activeBranch = branchStore.activeBranch;
  if (!activeBranch) {
    return "";
  }

  const detailParts = [
    String(activeBranch.office_branch_code || "").trim(),
    String(activeBranch.city || "").trim(),
  ].filter(Boolean);

  if (Number(activeBranch.is_head_office || 0) === 1) {
    detailParts.unshift(t("headOfficePrefix"));
  }
  return detailParts.join(" • ");
});
const helperLabel = computed(() => {
  const defaultLabel = defaultBranchLabel.value
    ? `${t("defaultBranchPrefix")}: ${defaultBranchLabel.value}`
    : t("defaultBranchMissing");
  const headLabel = headOfficeLabel.value
    ? `${t("headOfficePrefix")}: ${headOfficeLabel.value}`
    : "";
  const activeLabel = branchStore.activeBranch?.office_branch_name || branchStore.activeBranch?.name || "";

  if (branchStore.canAccessAll && !branchStore.requestBranch) {
    return [t("allBranchesActive"), headLabel, defaultLabel].filter(Boolean).join(" • ");
  }

  if (isLocked.value) {
    return [t("singleBranchLocked"), headLabel || defaultLabel].filter(Boolean).join(" • ");
  }

  const labels = [activeLabel];
  if (headLabel && headOfficeLabel.value !== activeLabel) {
    labels.push(headLabel);
  }
  if (defaultLabel && defaultBranchLabel.value !== activeLabel) {
    labels.push(defaultLabel);
  }
  return labels.filter(Boolean).join(" • ");
});
const activeDescendantId = computed(() => {
  if (!isOpen.value || highlightedIndex.value < 0) {
    return undefined;
  }
  return optionDomId(highlightedIndex.value);
});

function buildOptionMeta(option) {
  if (!option || option.value === null) {
    return "";
  }

  const row = option.row || {};
  const detailParts = [
    Number(row.is_head_office || 0) === 1 ? t("headOfficePrefix") : "",
    String(option.code || "").trim(),
    String(option.city || "").trim(),
  ].filter(Boolean);
  return detailParts.join(" • ");
}

function optionDomId(index) {
  return `office-branch-option-${index}`;
}

function setOptionRef(element, index) {
  optionRefs.value[index] = element || null;
}

function findSelectedOptionIndex() {
  const selectedIndex = filteredOptions.value.findIndex((option) => String(option.value ?? "") === selectedValue.value);
  return selectedIndex >= 0 ? selectedIndex : 0;
}

function setHighlightedIndex(index, options = {}) {
  const optionCount = filteredOptions.value.length;
  if (!optionCount) {
    highlightedIndex.value = -1;
    return;
  }

  const normalizedIndex = Math.min(Math.max(index, 0), optionCount - 1);
  highlightedIndex.value = normalizedIndex;

  if (options.focus) {
    nextTick(() => {
      optionRefs.value[normalizedIndex]?.focus?.();
    });
  }
}

function normalizeOptionLabel(label) {
  return String(label || "")
    .replace(/^[\s\-–—•]+/u, "")
    .trim()
    .toLocaleLowerCase(unref(authStore.locale) || "en");
}

function getHighlightedParts(text, query) {
  if (!query) {
    return [{ text, isMatch: false }];
  }

  const normalizedText = normalizeOptionLabel(text);
  const normalizedQuery = normalizeOptionLabel(query);
  
  if (!normalizedText.includes(normalizedQuery)) {
    return [{ text, isMatch: false }];
  }

  // Find actual position in original text
  const lowerText = String(text || "").toLocaleLowerCase();
  const queryLower = normalizeOptionLabel(query);
  const startIndex = lowerText.indexOf(queryLower);
  
  if (startIndex === -1) {
    return [{ text, isMatch: false }];
  }

  const parts = [];
  if (startIndex > 0) {
    parts.push({ text: text.slice(0, startIndex), isMatch: false });
  }
  parts.push({ text: text.slice(startIndex, startIndex + queryLower.length), isMatch: true });
  if (startIndex + queryLower.length < text.length) {
    parts.push({ text: text.slice(startIndex + queryLower.length), isMatch: false });
  }
  
  return parts;
}

function clearTypeahead() {
  typeaheadQuery.value = "";
  if (typeaheadTimer.value) {
    clearTimeout(typeaheadTimer.value);
    typeaheadTimer.value = null;
  }
}

function queueTypeaheadReset() {
  if (typeaheadTimer.value) {
    clearTimeout(typeaheadTimer.value);
  }
  typeaheadTimer.value = setTimeout(() => {
    typeaheadQuery.value = "";
    typeaheadTimer.value = null;
  }, 700);
}

function isTypeableCharacter(event) {
  return (
    String(event?.key || "").length === 1
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
  );
}

function applyTypeahead(char) {
  const options = filteredOptions.value;
  if (!options.length) {
    return;
  }

  const nextQuery = `${typeaheadQuery.value}${char}`
    .trim()
    .toLocaleLowerCase(unref(authStore.locale) || "en");
  if (!nextQuery) {
    return;
  }

  typeaheadQuery.value = nextQuery;
  queueTypeaheadReset();

  const startIndex = highlightedIndex.value >= 0 ? highlightedIndex.value + 1 : 0;
  const orderedIndices = [
    ...Array.from({ length: options.length - startIndex }, (_, offset) => startIndex + offset),
    ...Array.from({ length: startIndex }, (_, offset) => offset),
  ];

  const matchedIndex = orderedIndices.find((index) => normalizeOptionLabel(options[index]?.label).startsWith(nextQuery));
  if (matchedIndex !== undefined) {
    setHighlightedIndex(matchedIndex, { focus: true });
  }
}

function openPicker(preferredIndex = null, options = {}) {
  if (isLocked.value) return;
  isOpen.value = true;
  searchQuery.value = "";
  clearTypeahead();
  const nextIndex = Number.isInteger(preferredIndex) ? preferredIndex : findSelectedOptionIndex();
  setHighlightedIndex(nextIndex, { focus: Boolean(options.focus) });
}

function moveHighlight(step) {
  if (!filteredOptions.value.length) {
    return;
  }
  if (!isOpen.value) {
    openPicker(step > 0 ? 0 : filteredOptions.value.length - 1, { focus: true });
    return;
  }

  const current = highlightedIndex.value >= 0 ? highlightedIndex.value : findSelectedOptionIndex();
  const maxIndex = filteredOptions.value.length - 1;
  const nextIndex = (current + step + filteredOptions.value.length) % filteredOptions.value.length;
  setHighlightedIndex(Math.min(Math.max(nextIndex, 0), maxIndex), { focus: true });
}

function selectHighlighted() {
  if (!isOpen.value || highlightedIndex.value < 0) {
    return;
  }
  const option = filteredOptions.value[highlightedIndex.value];
  if (!option) {
    return;
  }
  void onSelect(option.value);
}

function toggleOpen() {
  if (isLocked.value) return;
  if (isOpen.value) {
    closeOpen();
    return;
  }
  openPicker();
}

function closeOpen() {
  isOpen.value = false;
  highlightedIndex.value = -1;
  searchQuery.value = "";
  clearTypeahead();
}

function clearSearch() {
  searchQuery.value = "";
  searchInputRef.value?.focus?.();
}

function onDocumentClick(event) {
  if (!isOpen.value) return;
  if (pickerRef.value?.contains(event?.target)) return;
  closeOpen();
}

function onEscape(event) {
  if (event.key === "Escape") {
    closeOpen();
  }
}

function onTriggerKeydown(event) {
  if (isLocked.value) {
    return;
  }

  if (isTypeableCharacter(event)) {
    event.preventDefault();
    if (!isOpen.value) {
      openPicker(findSelectedOptionIndex(), { focus: true });
    }
    applyTypeahead(event.key);
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!isOpen.value) {
      openPicker(findSelectedOptionIndex(), { focus: true });
      return;
    }
    moveHighlight(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!isOpen.value) {
      openPicker(findSelectedOptionIndex(), { focus: true });
      return;
    }
    moveHighlight(-1);
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!isOpen.value) {
      openPicker(findSelectedOptionIndex(), { focus: true });
      return;
    }
    selectHighlighted();
  }
}

function onListboxKeydown(event) {
  const fromSearchInput = event?.target === searchInputRef.value;

  if (fromSearchInput && event.key === "ArrowDown") {
    event.preventDefault();
    setHighlightedIndex(0, { focus: true });
    return;
  }

  if (fromSearchInput && event.key === "Escape") {
    event.preventDefault();
    closeOpen();
    triggerRef.value?.focus?.();
    return;
  }

  if (fromSearchInput) {
    return;
  }

  if (isTypeableCharacter(event)) {
    event.preventDefault();
    applyTypeahead(event.key);
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveHighlight(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveHighlight(-1);
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    setHighlightedIndex(0, { focus: true });
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    setHighlightedIndex(filteredOptions.value.length - 1, { focus: true });
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectHighlighted();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeOpen();
    triggerRef.value?.focus?.();
  }
}

function onSearchInputKeydown(event) {
  if (event.key === "ArrowDown" || event.key === "Escape") {
    onListboxKeydown(event);
  }
}

async function onSelect(value) {
  if (isLocked.value) return;
  const nextValue = String(value || "");
  branchStore.setActiveBranch(nextValue);
  await branchStore.persistToRoute(router, route);
  closeOpen();
}

watch(filteredOptions, () => {
  optionRefs.value = [];
  if (!isOpen.value) {
    return;
  }
  if (!filteredOptions.value.length) {
    highlightedIndex.value = -1;
    return;
  }
  setHighlightedIndex(findSelectedOptionIndex(), { focus: false });
});

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onEscape);
  clearTypeahead();
});
</script>

<style scoped>
:deep(mark) {
  background-color: rgba(14, 165, 233, 0.3);
  font-weight: 600;
  color: inherit;
  border-radius: 2px;
  padding: 0 2px;
}
</style>
