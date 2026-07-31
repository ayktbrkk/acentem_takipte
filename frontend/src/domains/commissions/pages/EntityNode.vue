<template>
  <div class="ml-4" :style="{ marginLeft: depth * 16 + 'px' }">
    <div
      class="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors"
      :class="[
        selectedName === node.name ? 'bg-brand-50 border border-brand-200' : 'hover:bg-slate-50',
        !node.children_valid ? 'border border-at-amber/30' : '',
      ]"
      @click="$emit('select', node)"
    >
      <FeatherIcon
        v-if="node.children.length"
        name="chevron-down"
        class="h-3 w-3 text-slate-400"
      />
      <FeatherIcon
        v-else
        name="circle"
        class="h-2 w-2 text-slate-300"
      />
      <span class="text-sm font-medium text-slate-700">{{ node.full_name }}</span>
      <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
        {{ node.entity_type }}
      </span>
      <span v-if="node.is_root" class="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 font-medium">
        {{ t('root') }}
      </span>
      <span v-if="node.is_pool" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
        {{ t('pool') }}
      </span>
      <span class="ml-auto text-xs font-mono" :class="node.share_pct > 0 ? 'text-slate-600' : 'text-slate-400'">
        {{ node.share_pct }}%
      </span>
    </div>
    <div v-if="node.children.length" class="border-l border-slate-200 ml-2">
      <EntityNode
        v-for="child in node.children"
        :key="child.name"
        :node="child"
        :depth="depth + 1"
        :selected-name="selectedName"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";
import { COMMISSION_TRANSLATIONS } from "../i18n/translations";
import { useAuthStore } from "../../../stores/auth";
import { computed } from "vue";

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  selectedName: { type: String, default: "" },
});

defineEmits(["select"]);

const authStore = useAuthStore();
const activeLocale = computed(() =>
  String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en",
);

function t(key) {
  return (
    COMMISSION_TRANSLATIONS[activeLocale.value]?.[key] ||
    COMMISSION_TRANSLATIONS.en?.[key] ||
    key
  );
}
</script>
