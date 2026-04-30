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
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{{ t('flowEyebrow') }}</p>
            <p class="mt-2 text-sm font-semibold text-slate-900">{{ t('flowLead') }}</p>
            <p class="mt-2 leading-6">{{ t('flowBody') }}</p>
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <article
              v-for="step in steps"
              :key="step.key"
              class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{{ step.step }}</p>
              <h3 class="mt-2 text-sm font-semibold text-slate-900">{{ step.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{{ step.description }}</p>
            </article>
          </div>

          <div class="rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 p-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{{ t('contextEyebrow') }}</span>
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
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{{ rule.label }}</p>
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

const copy = {
  tr: {
    breadcrumb: "Doküman Merkezi → Hızlı Doküman Yükle",
    title: "Hızlı Doküman Yükle",
    subtitle: "Dosyayı seçin, belge sınıfını belirleyin ve gerekirse bağlı kaydı tek akışta tamamlayın.",
    backToList: "Doküman Kayıtlarına Dön",
    openUploader: "Yükleyiciyi Aç",
    metricFlow: "Akış",
    metricFlowValue: "3 adım",
    metricLimit: "Yükleme Limiti",
    metricLimitValue: "10 MB",
    metricLinks: "Bağlanabilir Kayıt",
    metricLinksValue: "3 tür",
    flowTitle: "Yükleme Akışı",
    flowEyebrow: "Operasyon Hızı",
    flowLead: "Bu yüzey, doküman kaydını tek seferde üretmek için tasarlandı.",
    flowBody: "Dosyayı seçin, gerekirse müşteri, poliçe veya hasar kaydına bağlayın; ardından sistem metadata kaydını ve bağlı dosya adlandırmasını otomatik tamamlasın.",
    step1: "Dosya Seç",
    step1Desc: "PDF, ofis dokümanı ya da görsel dosyayı seçin ve özel dosya alanında saklayın.",
    step2: "Sınıflandır",
    step2Desc: "Doküman türü, alt türü ve hassas veri işaretini belirleyin.",
    step3: "Bağla ve Bitir",
    step3Desc: "İsterseniz kaydı bir müşteri, poliçe veya hasar dosyasına bağlayın ve detay ekranına geçin.",
    contextEyebrow: "Bağlam",
    genericContext: "Bu yükleme kaydı bağımsız başlatıldı. İsterseniz yükleme sırasında bir müşteri, poliçe veya hasar kaydı seçebilirsiniz.",
    linkedContext: "Yükleme bağlamlı başlatıldı. Doküman, seçili kayıtla ilişkilendirilecek ve detaydan izlenebilecek.",
    guideTitle: "Yükleme Rehberi",
    guideBody: "Liste ekranındaki hızlı yükleme aksiyonu artık doğrudan bu sayfaya gelir. Böylece yükleme akışı, liste ve detay yüzeyleriyle aynı tasarım dilinde kalır.",
    rulePrivacy: "Saklama",
    rulePrivacyValue: "Bağlı dokümanlar özel dosya alanında tutulur.",
    ruleNaming: "Adlandırma",
    ruleNamingValue: "Metadata kaydı oluşturulunca sistem dosya adını standart formata çevirir.",
    ruleRouting: "Yönlendirme",
    ruleRoutingValue: "Başarılı yükleme sonrası yeni doküman detayına geçilir.",
    statusTitle: "Yükleyici",
    statusOpen: "Yükleyici açık. Dosyayı seçip akışı tamamlayabilirsiniz.",
    statusClosed: "Yükleyici kapandı. Aynı akışı yeniden başlatmak için aşağıdaki butonu kullanın.",
    reopenUploader: "Yükleyiciyi Yeniden Aç",
  },
  en: {
    breadcrumb: "Document Center → Quick Upload",
    title: "Quick Document Upload",
    subtitle: "Select the file, classify the document, and complete the linked record in a single flow.",
    backToList: "Back to Document Registry",
    openUploader: "Open Uploader",
    metricFlow: "Flow",
    metricFlowValue: "3 steps",
    metricLimit: "Upload Limit",
    metricLimitValue: "10 MB",
    metricLinks: "Linkable Records",
    metricLinksValue: "3 types",
    flowTitle: "Upload Flow",
    flowEyebrow: "Operational Speed",
    flowLead: "This surface is designed to create the document record in one pass.",
    flowBody: "Pick the file, optionally link it to a customer, policy, or claim, and let the system complete metadata creation and file naming automatically.",
    step1: "Select File",
    step1Desc: "Choose the PDF, office document, or image file and store it in the private area.",
    step2: "Classify",
    step2Desc: "Set the document kind, sub type, and sensitive data marker.",
    step3: "Link and Finish",
    step3Desc: "Optionally link the upload to a customer, policy, or claim, then continue to the detail screen.",
    contextEyebrow: "Context",
    genericContext: "This upload started without a linked record. You can select a customer, policy, or claim during upload.",
    linkedContext: "This upload started with context. The document will be linked to the selected record and tracked from detail surfaces.",
    guideTitle: "Upload Guide",
    guideBody: "The quick upload action on the list now routes here so the upload flow stays aligned with the same design language as the list and detail surfaces.",
    rulePrivacy: "Storage",
    rulePrivacyValue: "Linked documents are stored in the private files area.",
    ruleNaming: "Naming",
    ruleNamingValue: "Once metadata is created, the system renames the file into the standard format.",
    ruleRouting: "Routing",
    ruleRoutingValue: "After a successful upload, you are taken to the new document detail.",
    statusTitle: "Uploader",
    statusOpen: "The uploader is open. Select the file and finish the flow.",
    statusClosed: "The uploader is closed. Use the button below to start the same flow again.",
    reopenUploader: "Reopen Uploader",
  },
};

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const showUploadModal = ref(false);

const locale = computed(() => (String(authStore.locale || "en").toLowerCase().startsWith("tr") ? "tr" : "en"));
const linkedDoctype = computed(() => String(route.query.reference_doctype || ""));
const linkedName = computed(() => String(route.query.reference_name || ""));

function t(key) {
  return copy[locale.value]?.[key] || copy.en[key] || key;
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
