<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
    <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
      <slot name="icon">
        <component :is="LucideInbox" class="h-8 w-8" />
      </slot>
    </div>
    <h4 class="text-sm font-semibold text-gray-900">{{ title }}</h4>
    <p class="mt-1 text-xs text-gray-500">{{ description }}</p>
    <div v-if="$slots.actions" class="mt-4">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { Inbox as LucideInbox } from "lucide-vue-next";

defineProps({
  title: { type: String, default: "Kayıt bulunamadı" },
  description: { type: String, default: "Şu an takip edilecek bir kayıt yok." },
});
</script>
