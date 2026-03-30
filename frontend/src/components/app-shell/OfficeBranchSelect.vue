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
import { useOfficeBranchSelect } from "../../composables/useOfficeBranchSelect";

const {
  t,
  selectedValue,
  isLocked,
  isOpen,
  highlightedIndex,
  pickerRef,
  triggerRef,
  searchInputRef,
  optionRefs,
  listboxId,
  searchQuery,
  filteredOptions,
  selectedLabel,
  selectedMeta,
  helperLabel,
  activeDescendantId,
  optionDomId,
  setOptionRef,
  getHighlightedParts,
  clearSearch,
  onTriggerKeydown,
  onListboxKeydown,
  onSearchInputKeydown,
  toggleOpen,
  onSelect,
} = useOfficeBranchSelect();
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

