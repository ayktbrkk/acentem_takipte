<template>
  <div v-if="loading" class="space-y-4">
    <div class="h-8 w-48 animate-pulse rounded bg-slate-100"></div>
    <div class="grid grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded bg-slate-50"></div>
    </div>
  </div>
  <div v-else-if="preview" class="space-y-6">
    <!-- Header Summary -->
    <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 class="text-sm font-bold text-slate-400 uppercase tracking-widest">{{ preview.subtitle }}</h3>
      <p class="text-2xl font-black text-slate-900 mt-1">{{ preview.title }}</p>
    </div>

    <!-- Metrics Grid -->
    <div v-if="preview.metrics?.length" class="grid grid-cols-2 gap-4">
      <div 
        v-for="metric in preview.metrics" 
        :key="metric.label"
        class="rounded-2xl bg-brand-50/50 p-4 border border-brand-100"
      >
        <p class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{{ metric.label }}</p>
        <p class="text-xl font-black text-blue-900 mt-1">
          {{ formatValue(metric.value, metric.currency) }}
        </p>
      </div>
    </div>

    <!-- Fields Section -->
    <SectionPanel :title="t('Details')" panel-class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div class="grid grid-cols-1 gap-4">
        <div v-for="field in preview.fields" :key="field.label" class="flex flex-col border-b border-slate-50 pb-2 last:border-0">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ field.label }}</span>
          <span class="text-sm font-semibold text-slate-700 mt-0.5">{{ field.value || '-' }}</span>
        </div>
      </div>
    </SectionPanel>

    <div class="flex justify-end gap-3 pt-4">
      <ActionButton variant="secondary" size="sm" @click="goToDetail">
        {{ t("Open Record Details") }}
      </ActionButton>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, unref } from "vue";
import { frappeRequest } from "frappe-ui";
import { useRouter } from "vue-router";
import SectionPanel from "../app-shell/SectionPanel.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import { getAppPinia } from "@/pinia";
import { useAuthStore } from "@/stores/auth";
import { translateText } from "@/utils/i18n";

const props = defineProps({
  doctype: { type: String, required: true },
  name: { type: String, required: true },
});

const router = useRouter();
const loading = ref(false);
const preview = ref(null);
const authStore = useAuthStore(getAppPinia());
const activeLocale = computed(() => unref(authStore.locale) || "en");

function t(source) {
  return translateText(source, activeLocale.value);
}

async function loadPreview() {
  if (!props.doctype || !props.name) return;
  loading.value = true;
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.record_preview.get_record_preview",
      method: "GET",
      params: { doctype: props.doctype, name: props.name },
    });
    preview.value = payload?.message || payload;
  } catch (err) {
    console.error("Preview load failed", err);
  } finally {
    loading.value = false;
  }
}

function formatValue(val, currency) {
  if (currency) {
    const numberLocale = String(activeLocale.value || "en").startsWith("tr") ? "tr-TR" : "en-US";
    return new Intl.NumberFormat(numberLocale, { style: "currency", currency }).format(val);
  }
  return val;
}

function goToDetail() {
  const dt = props.doctype;
  const name = props.name;
  
  if (dt === "AT Policy") router.push({ name: "policy-detail", params: { name } });
  else if (dt === "AT Customer") router.push({ name: "customer-detail", params: { name } });
  else if (dt === "AT Claim") router.push({ name: "claim-detail", params: { name } });
}

watch([() => props.doctype, () => props.name], () => loadPreview(), { immediate: true });
</script>
