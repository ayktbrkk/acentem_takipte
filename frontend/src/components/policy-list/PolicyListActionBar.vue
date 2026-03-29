<template>
  <div class="flex flex-wrap items-center gap-2">
    <button class="btn btn-outline btn-sm" type="button" @click="$emit('focus-filters')">
      {{ t("focusFilters") }}
    </button>
    <button class="btn btn-outline btn-sm" type="button" :disabled="loading" @click="$emit('export', 'xlsx')">
      {{ t("exportXlsx") }}
    </button>
    <button class="btn btn-primary btn-sm" type="button" @click="$emit('new-policy')">
      {{ t("newPolicy") }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  t: { type: Function, required: true },
  loading: { type: Boolean, default: false },
});

defineEmits(["focus-filters", "export", "new-policy"]);
</script>
