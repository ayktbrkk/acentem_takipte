<template>
  <div class="mb-4">
    <p v-if="!collapsed" class="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
      {{ section.title }}
    </p>
    <div v-else class="mx-2 mb-2 border-t border-slate-200/80" />

    <template v-for="item in section.items" :key="item.key">
      <a
        v-if="item.external"
        :href="item.to"
        :title="item.label"
        class="group mx-2 mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900"
        :class="linkClass(item)"
        @click="$emit('navigate')"
      >
        <span
          class="grid h-6 w-6 shrink-0 place-items-center rounded bg-gray-100 text-[10px] font-semibold text-gray-500"
          :class="item.badgeClass"
        >
          {{ item.short }}
        </span>
        <div v-if="!collapsed" class="min-w-0 flex-1">
          <p class="truncate font-medium" :class="item.indent ? 'text-xs text-slate-500' : ''">
            {{ item.label }}
          </p>
        </div>
      </a>

      <RouterLink
        v-else
        :to="item.to"
        :title="item.label"
        class="group mx-2 mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-600 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900"
        :class="linkClass(item)"
        active-class="bg-brand-50 text-brand-700 font-medium border-l-2 border-brand-600 !rounded-l-none pl-[10px]"
        @click="$emit('navigate')"
      >
        <span
          class="grid h-6 w-6 shrink-0 place-items-center rounded bg-gray-100 text-[10px] font-semibold text-gray-500 [.router-link-active_&]:bg-brand-100 [.router-link-active_&]:text-brand-700"
          :class="item.badgeClass"
        >
          {{ item.short }}
        </span>
        <div v-if="!collapsed" class="min-w-0 flex-1">
          <p class="truncate font-medium" :class="item.indent ? 'text-xs text-slate-500' : ''">
            {{ item.label }}
          </p>
        </div>
      </RouterLink>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["navigate"]);

function linkClass(item) {
  if (props.collapsed) {
    return "justify-center px-2";
  }
  if (item.indent) {
    return "pl-8 pr-3";
  }
  return "px-3";
}
</script>
