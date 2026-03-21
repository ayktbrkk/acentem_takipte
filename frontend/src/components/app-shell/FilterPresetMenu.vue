<template>
  <div class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
    <label class="text-xs font-semibold text-slate-500 sm:whitespace-nowrap">{{ label }}</label>
    <select
      :value="modelValue"
      class="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 sm:min-w-[180px]"
      :disabled="disabled"
      @change="onChange"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <div class="flex items-center gap-2 sm:contents">
      <button
        v-if="showSave"
        class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="disabled"
        type="button"
        @click="$emit('save')"
      >
        {{ saveLabel }}
      </button>
      <button
        v-if="showDelete"
        class="qc-danger-button"
        :disabled="disabled || !canDelete"
        type="button"
        @click="$emit('delete')"
      >
        {{ deleteLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  modelValue: {
    type: String,
    default: "default",
  },
  options: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  showSave: {
    type: Boolean,
    default: false,
  },
  showDelete: {
    type: Boolean,
    default: false,
  },
  canDelete: {
    type: Boolean,
    default: false,
  },
  saveLabel: {
    type: String,
    default: "Save",
  },
  deleteLabel: {
    type: String,
    default: "Delete",
  },
});

const emit = defineEmits(["update:modelValue", "change", "save", "delete"]);

function onChange(event) {
  const value = String(event?.target?.value || "");
  emit("update:modelValue", value);
  emit("change", value);
}
</script>
