<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="goBack">
        {{ t("backToList") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="showUploadModal = true">
        <FeatherIcon name="upload-cloud" class="h-4 w-4" />
        {{ t("openUploader") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div class="grid gap-4 md:grid-cols-3">
        <SaaSMetricCard :label="t('metricFlow')" :value="t('metricFlowValue')" />
        <SaaSMetricCard :label="t('metricLimit')" :value="t('metricLimitValue')" />
        <SaaSMetricCard :label="t('metricLinks')" :value="t('metricLinksValue')" />
      </div>
    </template>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,8fr)_minmax(320px,4fr)]">
      <SectionPanel :title="t('flowTitle')">
        <div class="space-y-4 text-sm text-slate-600">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ t('flowEyebrow') }}</p>
            <p class="mt-2 text-sm font-semibold text-slate-900">{{ t('flowLead') }}</p>
            <p class="mt-2 leading-6">{{ t('flowBody') }}</p>
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <article
              v-for="step in steps"
              :key="step.key"
              class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ step.step }}</p>
              <h3 class="mt-2 text-sm font-semibold text-slate-900">{{ step.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{{ step.description }}</p>
            </article>
          </div>

          <div class="rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 p-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-normal uppercase tracking-wider text-brand-700">{{ t('contextEyebrow') }}</span>
              <span
                v-for="chip in contextChips"
                :key="chip"
                class="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700"
              >
                {{ chip }}
              </span>
            </div>
            <p class="mt-3 text-sm leading-6 text-slate-700">{{ contextDescription }}</p>
          </div>
        </div>
      </SectionPanel>

      <div class="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <SectionPanel :title="t('guideTitle')">
          <div class="space-y-3 text-sm text-slate-600">
            <p class="leading-6">{{ t('guideBody') }}</p>
            <div
              v-for="rule in rules"
              :key="rule.key"
              class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ rule.label }}</p>
              <p class="mt-1 text-sm font-medium text-slate-900">{{ rule.value }}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('statusTitle')">
          <div class="space-y-3 text-sm text-slate-600">
            <p>{{ showUploadModal ? t('statusOpen') : t('statusClosed') }}</p>
            <ActionButton variant="secondary" size="sm" class="w-full justify-center" @click="showUploadModal = true">
              {{ t('reopenUploader') }}
            </ActionButton>
          </div>
        </SectionPanel>
      </div>
    </div>

    <WorkbenchFileUploadModal
      :open="showUploadModal"
      :attached-to-doctype="linkedDoctype"
      :attached-to-name="linkedName"
      :t="t"
      @close="showUploadModal = false"
      @uploaded="handleUploaded"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { FeatherIcon } from "frappe-ui";
import { useRoute, useRouter } from "vue-router";
import ActionButton from "../components/app-shell/ActionButton.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import WorkbenchFileUploadModal from "../components/aux-workbench/WorkbenchFileUploadModal.vue";
import { useAuthStore } from "../stores/auth";
import { translateText } from "../utils/i18n";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const showUploadModal = ref(false);

const linkedDoctype = computed(() => String(route.query.reference_doctype || ""));
const linkedName = computed(() => String(route.query.reference_name || ""));

function t(key) {
  return translateText(key, authStore.locale);
}

const steps = computed(() => [
  { key: "select", step: "01", title: t("step1"), description: t("step1Desc") },
  { key: "classify", step: "02", title: t("step2"), description: t("step2Desc") },
  { key: "finish", step: "03", title: t("step3"), description: t("step3Desc") },
]);

const rules = computed(() => [
  { key: "privacy", label: t("rulePrivacy"), value: t("rulePrivacyValue") },
  { key: "naming", label: t("ruleNaming"), value: t("ruleNamingValue") },
  { key: "routing", label: t("ruleRouting"), value: t("ruleRoutingValue") },
]);

const contextChips = computed(() => {
  const chips = [];
  if (linkedDoctype.value) chips.push(linkedDoctype.value);
  if (linkedName.value) chips.push(linkedName.value);
  return chips;
});

const contextDescription = computed(() => (contextChips.value.length ? t("linkedContext") : t("genericContext")));

function goBack() {
  router.push({ name: "at-documents-list" });
}

function handleUploaded(payload) {
  const docname = String(payload?.at_document || "").trim();
  if (docname) {
    router.push({ name: "at-documents-detail", params: { name: docname } });
    return;
  }
  goBack();
}

onMounted(() => {
  showUploadModal.value = true;
});
</script>
