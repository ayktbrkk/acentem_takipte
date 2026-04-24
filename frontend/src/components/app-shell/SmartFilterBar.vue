<template>
  <div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
    <div class="relative flex-1">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <FeatherIcon name="search" class="h-4 w-4 text-gray-400" />
      </div>
      <input
        :value="modelValue"
        type="text"
        class="block w-full rounded-lg border-gray-200 pl-10 text-sm focus:border-brand-500 focus:ring-brand-500"
        :placeholder="placeholder || 'Ara...'"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <slot name="primary-filters" />
      
      <div class="h-6 w-px bg-gray-200 mx-1 hidden lg:block" />
      
      <button
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
        @click="$emit('open-advanced')"
      >
        <FeatherIcon name="filter" class="h-4 w-4" />
        {{ advancedLabel || 'Gelişmiş Filtre' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";

defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  advancedLabel: { type: String, default: "" },
});

defineEmits(["update:modelValue", "open-advanced"]);
</script>
