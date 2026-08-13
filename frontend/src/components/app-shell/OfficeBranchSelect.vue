<template>
  <div ref="pickerRef" class="relative w-full min-w-0 max-w-full md:w-[300px] md:max-w-[300px]">
    <div
      class="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 transition"
      :class="isLocked
        ? 'bg-slate-50/80'
        : 'shadow-sm shadow-slate-900/[0.04] hover:border-slate-300'"
    >
      <button
        ref="triggerRef"
        type="button"
        class="flex w-full items-center gap-2.5 text-left transition"
        :class="isLocked
          ? 'cursor-not-allowed opacity-80'
          : 'focus:outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-brand-400'"
        :aria-label="t('scope')"
        :aria-haspopup="isLocked ? undefined : 'listbox'"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-controls="isOpen ? listboxId : undefined"
        :aria-activedescendant="activeDescendantId"
        :disabled="isLocked"
        data-testid="branch-scope-trigger"
        @click="toggleOpen"
        @keydown="onTriggerKeydown"
      >
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <component :is="IconBuilding2" class="h-4 w-4" aria-hidden="true" />
        </span>

        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1.5">
            <span class="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {{ t("scope") }}
            </span>
            <span
              v-if="isLocked"
              data-testid="branch-scope-lock-status"
              class="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500"
            >
              {{ t("singleBranchLocked") }}
            </span>
          </span>
          <span class="flex items-center gap-1.5">
            <span
              class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
              aria-hidden="true"
              :class="isLocked ? 'opacity-40' : ''"
            ></span>
            <span class="block truncate text-[13px] font-semibold text-slate-900" :title="selectedLabel || t('scope')">
              {{ selectedLabel }}
            </span>
          </span>
        </span>

        <span class="shrink-0 text-slate-400" :aria-hidden="true">
          <component :is="isOpen ? IconChevronUp : IconChevronDown" class="h-3.5 w-3.5" />
        </span>
      </button>
    </div>

    <div
      v-if="isOpen && !isLocked"
      :id="listboxId"
      :style="panelStyle"
      class="absolute right-0 z-40 flex w-[380px] max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
      :class="openDirection === 'up' ? 'bottom-full mb-2' : 'top-[calc(100%+0.5rem)]'"
      role="listbox"
      tabindex="-1"
      :aria-label="t('scope')"
      @keydown="onListboxKeydown"
    >
      <div class="border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {{ t("activeScope") }}
        </p>
        <p class="mt-0.5 truncate text-[13px] font-semibold text-slate-900" :title="selectedLabel || t('scope')">
          {{ selectedLabel }}
        </p>
        <p
          v-if="selectedContextLabel"
          class="mt-0.5 truncate text-[11px] text-slate-500"
          :title="selectedContextLabel"
        >
          {{ selectedContextLabel }}
        </p>
        <p class="mt-1.5 border-t border-slate-100 pt-1.5 text-[11px] leading-4 text-slate-500">
          {{ helperLabel }}
        </p>
      </div>

      <div class="border-b border-slate-100 px-3 py-2">
        <div class="relative">
          <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
            <component :is="IconSearch" class="h-3.5 w-3.5" />
          </span>
          <input
            ref="searchInputRef"
            v-model.trim="searchQuery"
            type="text"
            class="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60"
            :placeholder="t('searchPlaceholder')"
            data-testid="branch-search-input"
            @keydown="onSearchInputKeydown"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            :aria-label="t('clear')"
            data-testid="branch-search-clear"
            @click="clearSearch"
          >
            <component :is="IconX" class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
        <p
          v-if="filteredOptions.length === 0"
          class="px-3 py-4 text-center text-xs text-slate-500"
          data-testid="branch-option-empty"
        >
          {{ t("noResults") }}
        </p>

        <div
          v-for="(option, index) in filteredOptions"
          :key="option.value === null ? '__all__' : option.value"
          :id="optionDomId(index)"
          role="option"
          tabindex="0"
          :ref="(el) => setOptionRef(el, index)"
          class="group flex w-full cursor-pointer items-center gap-1.5 rounded-lg pr-2 text-left text-[13px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          :class="[
            option.value === null ? 'py-2.5' : 'py-1',
            highlightedIndex === index
              ? 'bg-brand-50 text-brand-800'
              : String(option.value ?? '') === selectedValue
                ? 'bg-brand-50/60 text-brand-800'
                : 'text-slate-700 hover:bg-slate-50',
          ]"
          :style="{ paddingLeft: `${8 + Math.max(option.depth, 0) * 16}px` }"
          :aria-selected="String(option.value ?? '') === selectedValue ? 'true' : 'false'"
          :data-testid="`branch-option-${option.value === null ? 'all' : option.value}`"
          @mouseenter="setHighlightedIndex(index, { focus: false })"
          @click="onSelect(option.value)"
          @keydown.enter.prevent="onSelect(option.value)"
          @keydown.space.prevent="onSelect(option.value)"
        >
          <button
            v-if="option.hasChildren"
            type="button"
            class="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            :aria-label="isBranchCollapsed(option) ? t('expandChildren') : t('collapseChildren')"
            @click.stop="toggleCollapse(option)"
          >
            <component :is="isBranchCollapsed(option) ? IconChevronRight : IconChevronDown" class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span v-else class="h-5 w-5 shrink-0" aria-hidden="true" />

          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1.5">
              <span
                class="branch-option-label"
                :class="option.value === null ? 'font-semibold' : 'font-medium'"
              >
                <template v-for="(part, pIdx) in getHighlightedParts(option.name, searchQuery)" :key="pIdx">
                  <mark v-if="part.isMatch">{{ part.text }}</mark>
                  <span v-else>{{ part.text }}</span>
                </template>
              </span>
              <span
                v-if="option.isHeadOffice"
                class="shrink-0 rounded-full border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-700"
              >
                {{ t("headOfficeShort") }}
              </span>
            </span>
            <span
              v-if="option.code || option.city"
              class="mt-0.5 block truncate text-[11px] text-slate-500"
            >
              {{ [option.code, option.city].filter(Boolean).join(" • ") }}
            </span>
          </span>

          <span
            v-if="String(option.value ?? '') === selectedValue"
            class="shrink-0 text-brand-600"
            aria-hidden="true"
          >
            <component :is="IconCheck" class="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import IconBuilding2 from '~icons/lucide/building-2';
import IconSearch from '~icons/lucide/search';
import IconX from '~icons/lucide/x';
import IconCheck from '~icons/lucide/check';
import IconChevronDown from '~icons/lucide/chevron-down';
import IconChevronUp from '~icons/lucide/chevron-up';
import IconChevronRight from '~icons/lucide/chevron-right';
import { useOfficeBranchSelect } from "../../composables/useOfficeBranchSelect";

const {
  t,
  selectedValue,
  isLocked,
  isOpen,
  openDirection,
  panelStyle,
  highlightedIndex,
  pickerRef,
  triggerRef,
  searchInputRef,
  optionRefs,
  listboxId,
  searchQuery,
  filteredOptions,
  selectedLabel,
  selectedContextLabel,
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
  toggleCollapse,
  isBranchCollapsed,
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
