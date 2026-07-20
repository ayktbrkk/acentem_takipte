<template>
  <div
    v-if="totalPages > 1 || showViewAll"
    class="flex flex-wrap items-center justify-between gap-3 pt-3"
  >
    <div v-if="totalPages > 1" class="flex flex-wrap items-center gap-1">
      <button
        v-for="page in totalPages"
        :key="page"
        type="button"
        class="inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-semibold transition"
        :class="
          page === currentPage
            ? 'border-brand-700 bg-brand-700 text-white'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
        "
        @click="$emit('change-page', page)"
      >
        {{ page }}
      </button>
    </div>
    <div v-else />

    <button
      v-if="showViewAll"
      type="button"
      class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
      @click="$emit('view-all')"
    >
      {{ viewAllLabel }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  currentPage: {
    type: Number,
    default: 1,
  },
  totalPages: {
    type: Number,
    default: 1,
  },
  showViewAll: {
    type: Boolean,
    default: false,
  },
  viewAllLabel: {
    type: String,
    default: "",
  },
});

defineEmits(["change-page", "view-all"]);
</script>
