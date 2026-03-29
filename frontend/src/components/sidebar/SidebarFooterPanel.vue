<template>
  <footer class="mt-auto border-t border-gray-100 px-4 py-3">
    <div class="mb-3 flex items-center gap-2.5">
      <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
        {{ userInitials }}
      </div>
      <div v-if="!collapsed" class="min-w-0">
        <p class="truncate text-xs font-medium text-gray-900">{{ userDisplayName }}</p>
        <p class="truncate text-[10px] text-gray-400">{{ branchLabel }}</p>
      </div>
    </div>
    <button
      class="hidden w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 lg:flex"
      type="button"
      :title="toggleTitle"
      @click="$emit('toggle-collapse')"
    >
      <span class="text-[11px]">{{ toggleShortLabel }}</span>
      <span v-if="!collapsed">{{ collapseSidebarLabel }}</span>
    </button>
  </footer>
</template>

<script setup>
defineProps({
  collapsed: { type: Boolean, default: false },
  userInitials: { type: String, required: true },
  userDisplayName: { type: String, required: true },
  branchLabel: { type: String, required: true },
  toggleTitle: { type: String, required: true },
  toggleShortLabel: { type: String, required: true },
  collapseSidebarLabel: { type: String, required: true },
});

defineEmits(["toggle-collapse"]);
</script>
