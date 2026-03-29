<template>
  <div class="border-b border-gray-100 px-4 py-4">
    <div class="mb-4 flex items-center justify-between lg:hidden">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{{ menuLabel }}</p>
      <button class="rounded-lg border border-slate-300 px-2 py-1 text-xs" type="button" @click="$emit('close')">
        X
      </button>
    </div>

    <div class="flex items-start gap-2.5">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-gray-900" :class="collapsed ? 'text-center' : ''">{{ brandLabel }}</p>
        <template v-if="!collapsed">
          <p class="mt-0.5 text-xs text-gray-400">{{ subtitleLabel }}</p>
        </template>
        <template v-else>
          <p class="mt-2 text-center text-xs font-semibold text-slate-700">{{ miniTitleLabel }}</p>
        </template>
      </div>

      <button
        class="hidden h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 lg:grid"
        type="button"
        :title="toggleTitle"
        @click="$emit('toggle-collapse')"
      >
        {{ collapsed ? ">>" : "<<" }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  menuLabel: { type: String, required: true },
  brandLabel: { type: String, required: true },
  subtitleLabel: { type: String, required: true },
  miniTitleLabel: { type: String, required: true },
  collapsed: { type: Boolean, default: false },
  toggleTitle: { type: String, required: true },
});

defineEmits(["close", "toggle-collapse"]);
</script>
