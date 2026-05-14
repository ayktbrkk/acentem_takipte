<template>
  <select
    :value="modelValue"
    class="at-select"
    v-bind="$attrs"
    @change="$emit('update:modelValue', ($event.target).value)"
  >
    <option v-if="placeholder" value="">{{ placeholder }}</option>
    <option v-for="opt in options" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </option>
  </select>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: "" },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: "" },
});

defineEmits(["update:modelValue"]);
</script>

<style scoped>
.at-select {
  @apply h-9 min-w-[140px] rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900;
}
</style>
