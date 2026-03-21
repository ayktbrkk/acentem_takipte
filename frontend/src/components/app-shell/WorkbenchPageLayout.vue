<template>
  <section class="page-shell space-y-4">
    <slot name="topbar">
      <div class="detail-topbar flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0">
          <p v-if="breadcrumb" class="detail-breadcrumb">{{ breadcrumb }}</p>
          <h1 class="detail-title">{{ title }}</h1>
          <p v-if="subtitle" class="detail-subtitle">{{ subtitle }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <slot name="actions" />
          <span
            v-if="showRecordCount && recordCount !== null && recordCount !== undefined"
            class="text-sm text-slate-400"
          >
            {{ recordCount }} {{ recordCountLabel }}
          </span>
        </div>
      </div>
    </slot>

    <section v-if="$slots.metrics" class="w-full">
      <slot name="metrics" />
    </section>

    <slot />
  </section>
</template>

<script setup>
defineProps({
  breadcrumb: { type: String, default: "" },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  recordCount: { type: [String, Number], default: null },
  recordCountLabel: { type: String, default: "" },
  showRecordCount: { type: Boolean, default: true },
  metricsClass: { type: String, default: "w-full grid grid-cols-1 gap-4 md:grid-cols-5" },
});
</script>
