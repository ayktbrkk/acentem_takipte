<template>
  <div class="form-shell">
    <div class="form-header">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">{{ titleText }}</h2>
        <p class="text-sm text-gray-500">{{ subtitleText }}</p>
      </div>
      <button class="btn btn-outline btn-sm" type="button" @click="$emit('cancel')">X</button>
    </div>

    <div class="px-6 pt-4">
      <StepBar :steps="formSteps" />
    </div>

    <div v-if="error" class="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <form class="space-y-6" @submit.prevent="onSubmit">
      <div v-if="currentStep === 1" class="form-section">
        <h3 class="form-section-title">Müşteri Bilgileri</h3>
        <div class="form-grid">
          <div v-if="!hasSourceOffer" class="form-field">
            <label class="form-label">Müşteri</label>
            <select v-model="model.customer" class="form-input" :disabled="disabled">
              <option value="">Seçin...</option>
              <option v-for="row in customerOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
            <p v-if="fieldErrors.customer" class="text-xs text-red-600">{{ fieldErrors.customer }}</p>
          </div>

          <div v-if="!hasSourceOffer" class="form-field">
            <label class="form-label">Yeni Müşteri Adı</label>
            <input v-model="model.queryText" class="form-input" type="text" :disabled="disabled" />
          </div>

          <div v-if="!hasSourceOffer" class="form-field md:col-span-2">
            <label class="inline-flex items-center gap-2 text-sm text-gray-700">
              <input v-model="model.createCustomerMode" type="checkbox" :disabled="disabled" />
              Yeni müşteri oluştur
            </label>
          </div>

          <div v-if="!hasSourceOffer" class="form-field">
            <label class="form-label required">Kimlik / Vergi No</label>
            <input v-model="model.customer_tax_id" class="form-input" type="text" :disabled="disabled" />
            <p v-if="fieldErrors.customer_tax_id" class="text-xs text-red-600">{{ fieldErrors.customer_tax_id }}</p>
          </div>

          <div v-if="!hasSourceOffer" class="form-field">
            <label class="form-label">Telefon</label>
            <input v-model="model.customer_phone" class="form-input" type="text" :disabled="disabled" />
          </div>

          <div v-if="!hasSourceOffer" class="form-field md:col-span-2">
            <label class="form-label">E-posta</label>
            <input v-model="model.customer_email" class="form-input" type="email" :disabled="disabled" />
          </div>

          <div class="form-field md:col-span-2">
            <label class="form-label">Kaynak Teklif</label>
            <select v-model="model.source_offer" class="form-input" :disabled="disabled">
              <option value="">Seçin...</option>
              <option v-for="row in offerOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 2" class="form-section">
        <h3 class="form-section-title">Poliçe Detayları</h3>
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label required">Sigorta Şirketi</label>
            <select v-model="model.insurance_company" class="form-input" :disabled="disabled || hasSourceOffer">
              <option value="">Seçin...</option>
              <option v-for="row in companyOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
            <p v-if="fieldErrors.insurance_company" class="text-xs text-red-600">{{ fieldErrors.insurance_company }}</p>
          </div>

          <div class="form-field">
            <label class="form-label required">Branş</label>
            <select v-model="model.branch" class="form-input" :disabled="disabled || hasSourceOffer">
              <option value="">Seçin...</option>
              <option v-for="row in branchOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
            <p v-if="fieldErrors.branch" class="text-xs text-red-600">{{ fieldErrors.branch }}</p>
          </div>

          <div class="form-field">
            <label class="form-label">Satış Temsilcisi</label>
            <select v-model="model.sales_entity" class="form-input" :disabled="disabled || hasSourceOffer">
              <option value="">Seçin...</option>
              <option v-for="row in salesEntityOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
          </div>

          <div class="form-field">
            <label class="form-label">Poliçe No</label>
            <input v-model="model.policy_no" class="form-input" type="text" :disabled="disabled" />
          </div>

          <div class="form-field">
            <label class="form-label">Durum</label>
            <select v-model="model.status" class="form-input" :disabled="disabled || hasSourceOffer">
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="KYT">KYT</option>
              <option value="IPT">IPT</option>
            </select>
          </div>

          <div class="form-field">
            <label class="form-label required">Para Birimi</label>
            <input v-model="model.currency" class="form-input" type="text" :disabled="disabled" />
          </div>
        </div>
      </div>

      <div v-if="currentStep === 3" class="form-section">
        <h3 class="form-section-title">Teminat ve Primler</h3>
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">Başlangıç Tarihi</label>
            <input v-model="model.start_date" class="form-input" type="date" :disabled="disabled" />
          </div>
          <div class="form-field">
            <label class="form-label">Bitiş Tarihi</label>
            <input v-model="model.end_date" class="form-input" type="date" :disabled="disabled" />
          </div>
          <div class="form-field">
            <label class="form-label">Tanzim Tarihi</label>
            <input v-model="model.issue_date" class="form-input" type="date" :disabled="disabled || hasSourceOffer" />
          </div>

          <div class="form-field">
            <label class="form-label required">Brüt Prim</label>
            <input v-model="model.gross_premium" class="form-input" type="number" min="0" step="0.01" :disabled="disabled || hasSourceOffer" />
            <p v-if="fieldErrors.gross_premium" class="text-xs text-red-600">{{ fieldErrors.gross_premium }}</p>
          </div>
          <div class="form-field">
            <label class="form-label">Net Prim</label>
            <input v-model="model.net_premium" class="form-input" type="number" min="0" step="0.01" :disabled="disabled" />
          </div>
          <div class="form-field">
            <label class="form-label">Vergi Tutarı</label>
            <input v-model="model.tax_amount" class="form-input" type="number" min="0" step="0.01" :disabled="disabled" />
          </div>
          <div class="form-field">
            <label class="form-label">Komisyon</label>
            <input v-model="model.commission_amount" class="form-input" type="number" min="0" step="0.01" :disabled="disabled" />
          </div>
        </div>
      </div>

      <div v-if="currentStep === 4" class="form-section">
        <h3 class="form-section-title">Önizleme ve Notlar</h3>
        <div class="form-field">
          <label class="form-label">Notlar</label>
          <textarea v-model="model.notes" class="form-input" rows="4" :disabled="disabled" />
        </div>
        <div class="mt-4 grid grid-cols-1 gap-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          <p><strong>Müşteri:</strong> {{ model.customer || model.queryText || '-' }}</p>
          <p><strong>Poliçe:</strong> {{ model.policy_no || '-' }}</p>
          <p><strong>Branş:</strong> {{ model.branch || '-' }}</p>
          <p><strong>Brüt Prim:</strong> {{ model.gross_premium || '-' }}</p>
        </div>
      </div>

      <div class="form-footer">
        <button v-if="currentStep > 1" class="btn btn-outline" type="button" :disabled="disabled" @click="currentStep -= 1">Geri</button>
        <button v-if="currentStep < totalSteps" class="btn btn-primary" type="button" :disabled="disabled" @click="currentStep += 1">Ileri</button>
        <button v-if="currentStep === totalSteps" class="btn btn-primary" type="submit" :disabled="disabled || loading">Kaydet</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import StepBar from '@/components/ui/StepBar.vue';

const props = defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  hasSourceOffer: { type: Boolean, default: false },
  error: { type: String, default: '' },
  title: { type: String, default: 'Yeni Poliçe' },
  subtitle: { type: String, default: '' },
});

const emit = defineEmits(['cancel', 'submit']);

const currentStep = ref(1);
const totalSteps = 4;

const titleText = computed(() => props.title || 'Yeni Poliçe');
const subtitleText = computed(() => props.subtitle || 'Çok adımlı hızlı poliçe formu');

const formSteps = computed(() => [
  { label: 'Müşteri', state: currentStep.value > 1 ? 'done' : 'current' },
  { label: 'Poliçe', state: currentStep.value > 2 ? 'done' : currentStep.value === 2 ? 'current' : 'pending' },
  { label: 'Teminat', state: currentStep.value > 3 ? 'done' : currentStep.value === 3 ? 'current' : 'pending' },
  { label: 'Ödeme', state: currentStep.value === 4 ? 'current' : 'pending' },
]);

const customerOptions = computed(() => props.optionsMap?.customers || []);
const companyOptions = computed(() => props.optionsMap?.insuranceCompanies || []);
const branchOptions = computed(() => props.optionsMap?.branches || []);
const salesEntityOptions = computed(() => props.optionsMap?.salesEntities || []);
const offerOptions = computed(() => props.optionsMap?.offers || []);

function onSubmit() {
  if (currentStep.value < totalSteps) {
    currentStep.value += 1;
    return;
  }
  emit('submit');
}
</script>
