<template>
  <SectionPanel :title="t('templatesTitle')" :show-count="false">
    <p class="mb-3 text-sm text-slate-600">{{ t("templatesHint") }}</p>
    <div class="flex flex-wrap gap-2">
      <a
        v-for="item in templates"
        :key="item.key"
        class="inline-flex items-center rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        :href="item.href"
        download
      >
        {{ item.label }}
      </a>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";

import SectionPanel from "../app-shell/SectionPanel.vue";

const props = defineProps({
  t: {
    type: Function,
    required: true,
  },
});

const templates = computed(() => [
  { key: "customers", label: props.t("customerTemplate"), href: "/assets/acentem_takipte/import_templates/customers.csv" },
  { key: "offers", label: props.t("offerTemplate"), href: "/assets/acentem_takipte/import_templates/offers.csv" },
  { key: "policies", label: props.t("policyTemplate"), href: "/assets/acentem_takipte/import_templates/policies.csv" },
]);
</script>
