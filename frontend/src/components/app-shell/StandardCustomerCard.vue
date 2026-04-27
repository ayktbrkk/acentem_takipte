<template>
  <SectionPanel :title="title" class="group relative overflow-hidden">
    <template #trailing>
        <button
          v-if="!isEditing"
          class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50/50 text-slate-400 opacity-60 transition-all hover:opacity-100 hover:bg-white hover:text-brand-600 hover:border-brand-200 shadow-sm active:scale-95"
          :title="t('edit')"
          @click="startEditing"
        >
          <FeatherIcon name="edit-2" class="h-3.5 w-3.5" />
        </button>
    </template>

    <div v-if="!isEditing" class="space-y-5">
      <!-- Profile Header -->
      <div class="flex items-center gap-3">
        <div 
          class="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 shadow-sm"
        >
          <FeatherIcon 
            :name="customer.customer_type === 'Corporate' ? 'briefcase' : 'user'" 
            class="h-5 w-5" 
          />
        </div>
        <div class="min-w-0">
          <h3 class="font-bold text-slate-900 truncate leading-tight group-hover:text-brand-600 transition-colors">
            {{ customer.full_name || '-' }}
          </h3>
          <p class="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
            {{ customer.customer_type === 'Corporate' ? t('corporate') : t('individual') }}
          </p>
        </div>
      </div>

      <!-- Quick Fields -->
      <div class="grid gap-3.5 border-t border-slate-50 pt-4">
        <div v-for="f in displayFields" :key="f.key" class="flex items-center justify-between">
          <p class="field-label !mb-0">{{ f.label }}</p>
          <p class="text-[13px] font-bold text-slate-900">{{ f.value || '—' }}</p>
        </div>
      </div>

      <div class="pt-1">
        <button 
          class="btn btn-full btn-outline btn-sm font-bold text-slate-500 hover:text-brand-600 group/btn !py-1.5"
          @click="$emit('view-full')"
        >
          {{ t('view_full_profile') }}
          <FeatherIcon name="arrow-right" class="h-3 w-3 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
        </button>
      </div>
    </div>

    <!-- Edit Mode -->
    <form v-else class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" @submit.prevent="handleSave">
      <div class="space-y-4">
        <!-- Customer Type Toggle -->
        <div class="space-y-1.5">
          <label class="field-label">{{ t('customer_type') }}</label>
          <div class="flex p-1 bg-slate-100 rounded-lg">
            <button
              v-for="type in ['Individual', 'Corporate']"
              :key="type"
              type="button"
              class="flex-1 py-1.5 text-xs font-bold rounded-md transition-all"
              :class="editData.customer_type === type ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              @click="editData.customer_type = type"
            >
              {{ t(type.toLowerCase()) }}
            </button>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="field-label">{{ t('full_name') }}</label>
          <input v-model="editData.full_name" type="text" class="at-input w-full" :placeholder="t('full_name')" required />
        </div>

        <div class="space-y-1.5">
          <label class="field-label">{{ t('tax_id') }}</label>
          <input v-model="editData.tax_id" type="text" class="at-input w-full" :placeholder="t('tax_id')" />
        </div>

        <!-- Conditional Fields for Individual -->
        <template v-if="editData.customer_type === 'Individual'">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="field-label">{{ t('birth_date') }}</label>
              <input v-model="editData.birth_date" type="date" class="at-input w-full" />
            </div>
            <div class="space-y-1.5">
              <label class="field-label">{{ t('gender') }}</label>
              <select v-model="editData.gender" class="at-input w-full py-2">
                <option v-for="opt in genderOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
          <div class="space-y-1.5">
            <label class="field-label">{{ t('occupation') }}</label>
            <input v-model="editData.occupation" type="text" class="at-input w-full" :placeholder="t('occupation')" />
          </div>
        </template>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="field-label">{{ t('phone') }}</label>
            <input v-model="editData.phone" type="text" class="at-input w-full" placeholder="(5xx) xxx xx xx" />
          </div>
          <div class="space-y-1.5">
            <label class="field-label">{{ t('email') }}</label>
            <input v-model="editData.email" type="email" class="at-input w-full" placeholder="email@example.com" />
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
        <button type="button" class="btn btn-sm btn-ghost px-4 font-semibold text-slate-500" @click="isEditing = false">
          {{ t('cancel') }}
        </button>
        <button type="submit" class="btn btn-sm btn-primary min-w-[80px] px-6 font-bold" :disabled="saving">
          <FeatherIcon v-if="saving" name="loader" class="mr-2 h-3.5 w-3.5 animate-spin" />
          {{ t('save') }}
        </button>
      </div>
    </form>

    <!-- Saving Overlay -->
    <div v-if="saving" class="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[2px] transition-opacity">
      <div class="flex flex-col items-center gap-2">
        <FeatherIcon name="loader" class="h-6 w-6 animate-spin text-brand-600" />
        <span class="text-[10px] font-black uppercase tracking-widest text-brand-700">{{ t('updating') }}...</span>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue';
import { FeatherIcon } from 'frappe-ui';
import SectionPanel from './SectionPanel.vue';

const props = defineProps({
  customer: { type: Object, required: true },
  title: { type: String, default: '' },
  saving: { type: Boolean, default: false },
  t: { type: Function, required: true }
});

const emit = defineEmits(['save', 'view-full']);

const isEditing = ref(false);
const editData = reactive({});

const genderOptions = computed(() => [
  { label: props.t('unknown'), value: 'Unknown' },
  { label: props.t('male'), value: 'Male' },
  { label: props.t('female'), value: 'Female' },
  { label: props.t('other'), value: 'Other' },
]);

const displayFields = computed(() => {
  const fields = [
    { key: 'tax_id', label: props.t('tax_id'), value: props.customer.tax_id },
    { key: 'phone', label: props.t('phone'), value: props.customer.phone },
    { key: 'email', label: props.t('email'), value: props.customer.email },
  ];
  
  if (props.customer.customer_type === 'Individual') {
    if (props.customer.birth_date) {
      fields.push({ key: 'birth_date', label: props.t('birth_date'), value: props.customer.birth_date });
    }
    if (props.customer.occupation) {
      fields.push({ key: 'occupation', label: props.t('occupation'), value: props.customer.occupation });
    }
  }
  
  return fields;
});

function startEditing() {
  Object.assign(editData, {
    customer_type: props.customer.customer_type || 'Individual',
    full_name: props.customer.full_name || '',
    tax_id: props.customer.tax_id || '',
    birth_date: props.customer.birth_date || '',
    gender: props.customer.gender || 'Unknown',
    occupation: props.customer.occupation || '',
    phone: props.customer.phone || '',
    email: props.customer.email || '',
  });
  isEditing.value = true;
}

async function handleSave() {
  emit('save', { ...editData }, () => {
    isEditing.value = false;
  });
}

// Ensure edit mode closes if saving prop changes externally (handled via callback mostly)
</script>

<style scoped>
/* Scoped styles removed in favor of global .at-input and .field-label in style.css */
</style>
