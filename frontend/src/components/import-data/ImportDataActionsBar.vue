<template>
  <div class="flex justify-end gap-2">
    <button class="btn btn-outline" type="button" @click="$emit('cancel')">{{ t("cancel") }}</button>
    <button class="btn btn-primary" type="button" :disabled="!canImport" @click="$emit('import')">
      {{ t("importAction") }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  canImport: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["cancel", "import"]);
</script>
