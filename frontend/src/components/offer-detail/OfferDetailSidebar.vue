<template>
  <aside class="detail-sidebar space-y-4">
    <SectionPanel :title="t('customerPanelTitle')">
      <div class="mb-3 flex items-center gap-3">
        <div class="avatar avatar-md avatar-blue">{{ initials(offer.customer_name || offer.customer) }}</div>
        <div>
          <p class="text-sm font-medium text-gray-900">{{ offer.customer_name || offer.customer || '-' }}</p>
          <button class="text-xs text-brand-600 hover:underline" type="button" @click="viewCustomer">{{ t("openCustomer360") }} →</button>
        </div>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('offerInfoTitle')">
      <FieldGroup :fields="offerFields" :cols="1" />
    </SectionPanel>

    <SectionPanel :title="t('recordMetaTitle')">
      <FieldGroup :fields="recordFields" :cols="1" />
    </SectionPanel>
  </aside>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import FieldGroup from "../ui/FieldGroup.vue";

defineProps({
  t: { type: Function, required: true },
  offer: { type: Object, required: true },
  offerFields: { type: Array, default: () => [] },
  recordFields: { type: Array, default: () => [] },
  initials: { type: Function, required: true },
  viewCustomer: { type: Function, required: true },
});
</script>
