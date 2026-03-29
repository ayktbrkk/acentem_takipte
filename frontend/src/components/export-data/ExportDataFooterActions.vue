<template>
  <div class="flex justify-end gap-2">
    <button class="btn btn-outline" type="button" @click="$emit('cancel')">{{ t("cancel") }}</button>
    <button class="btn btn-primary" type="button" @click="$emit('export')">{{ t("exportAction") }}</button>
  </div>
  <p v-if="message" class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
    {{ message }}
  </p>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["cancel", "export"]);
</script>
