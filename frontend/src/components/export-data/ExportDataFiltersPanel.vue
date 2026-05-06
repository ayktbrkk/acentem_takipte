<template>
  <SectionPanel :title="t('step2Title')" panel-class="surface-card rounded-2xl p-5">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="form-field">
        <label class="form-label">{{ t("startDateLabel") }}</label>
        <input v-model="form.startDate" class="input" type="date" />
      </div>

      <div class="form-field">
        <label class="form-label">{{ t("endDateLabel") }}</label>
        <input v-model="form.endDate" class="input" type="date" />
      </div>

      <div class="form-field">
        <label class="form-label">{{ t("statusLabel") }}</label>
        <select v-model="form.status" class="input">
          <option value="">{{ t("allStatuses") }}</option>
          <option value="Draft">{{ t("statusDraft") }}</option>
          <option value="Active">{{ t("statusActive") }}</option>
          <option value="Open">{{ t("statusOpen") }}</option>
          <option value="Closed">{{ t("statusClosed") }}</option>
        </select>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  form: {
    type: Object,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
