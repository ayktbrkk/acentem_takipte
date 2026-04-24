<template>
  <article class="group relative overflow-hidden bg-white rounded-3xl border border-slate-100 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/10 hover:border-brand-200 active:scale-[0.98]">
    <!-- Background Glow -->
    <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-500/5 blur-3xl transition-all group-hover:bg-brand-500/10"></div>
    
    <div class="relative flex items-start justify-between">
      <div>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{{ title }}</p>
        <p class="text-3xl font-black text-slate-900 tracking-tight">{{ value }}</p>
      </div>
      <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 shadow-sm border border-brand-200/50 transition-transform group-hover:scale-110 group-hover:rotate-3">
        <FeatherIcon :name="icon || 'bar-chart-2'" class="h-6 w-6" />
      </div>
    </div>

    <div class="relative mt-8 flex items-center justify-between border-t border-slate-50 pt-4">
      <div class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {{ t("quickStatStatusLabel") }}
        </span>
      </div>
      <FeatherIcon name="chevron-right" class="h-3 w-3 text-slate-300 transition-transform group-hover:translate-x-1" />
    </div>
  </article>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";

defineProps({
  title: {
    type: String,
    default: "",
  },
  value: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
  icon: {
    type: String,
    default: "bar-chart-2",
  },
});
</script>
