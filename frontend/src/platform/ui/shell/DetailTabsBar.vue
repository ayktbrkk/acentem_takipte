<template>
  <div class="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div class="flex min-w-max snap-x snap-mandatory items-center gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="at-tab-chip shrink-0 snap-start"
        :class="modelValue === tab.value ? 'at-tab-chip-active' : 'at-tab-chip-idle'"
        @click="$emit('update:modelValue', tab.value)"
      >
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.count !== undefined && tab.count !== null"
          class="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-600"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, default: () => [] },
});

defineEmits(["update:modelValue"]);
</script>

