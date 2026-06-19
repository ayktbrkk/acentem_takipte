<template>
  <SectionPanel :title="t('templatesTitle')" panel-class="surface-card rounded-2xl p-5">
    <p class="mb-3 text-sm text-slate-600">{{ t("templatesHint") }}</p>
    <div class="flex flex-wrap gap-2">
      <a
        v-for="item in templates"
        :key="item.key"
        class="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-slate-50"
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
