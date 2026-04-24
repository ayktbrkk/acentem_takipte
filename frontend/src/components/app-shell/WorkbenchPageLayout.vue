<template>
  <section class="page-shell space-y-4">
    <slot name="topbar">
      <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <nav v-if="breadcrumb" class="mb-1">
            <ol class="flex items-center text-xs font-medium text-gray-500">
              <li>{{ breadcrumb }}</li>
            </ol>
          </nav>
          <h1 class="text-2xl font-bold tracking-tight text-gray-900">{{ title }}</h1>
          <p v-if="subtitle" class="mt-1 text-sm text-gray-500 font-medium">{{ subtitle }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <slot name="actions" />
          <div v-if="showRecordCount && recordCount !== null" class="ml-2 hidden h-4 w-px bg-gray-200 lg:block"></div>
          <span
            v-if="showRecordCount && recordCount !== null && recordCount !== undefined"
            class="text-xs font-semibold uppercase tracking-wider text-gray-400"
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
