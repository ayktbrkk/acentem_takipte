<template>
  <SectionPanel :title="title" :panel-class="panelClass" class="group">
    <template #trailing>
      <div class="flex items-center gap-2">
        <slot name="header-actions" />
        <button
          v-if="isEditable && !isEditing"
          class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          :aria-label="t('edit')"
          @click="startEditing"
        >
          <FeatherIcon name="edit-2" class="h-4 w-4" />
        </button>
      </div>
    </template>

    <div class="relative transition-all duration-300">
      <form v-if="isEditing" class="space-y-6" @submit.prevent="handleSave" @keydown.esc="handleCancel">
        <div class="grid gap-x-4 gap-y-5" :class="cols === 1 ? 'grid-cols-1' : 'grid-cols-2'">
          <div v-for="field in fields" :key="field.key" class="space-y-1.5" :class="{ 'opacity-60 cursor-not-allowed': field.disabled }">
            <label :for="field.key" class="field-label flex items-center justify-between">
              <span>{{ field.label }}</span>
              <span v-if="field.required" class="text-rose-500">*</span>
            </label>

            <!-- Text / Phone / TCKN Input -->
            <div v-if="['text', 'phone', 'tckn', 'email'].includes(field.type || 'text')" class="relative">
              <input
                :id="field.key"
                v-model="editData[field.key]"
                :type="field.type === 'email' ? 'email' : 'text'"
                class="at-input w-full"
                :class="{ 'border-rose-500 focus:ring-rose-500/20': errors[field.key], 'bg-slate-50 cursor-not-allowed': field.disabled }"
                :placeholder="field.placeholder || field.label"
                :disabled="field.disabled"
                @input="clearError(field.key)"
              />
              <p v-if="errors[field.key]" class="mt-1 text-xs font-medium text-rose-500">
                {{ errors[field.key] }}
              </p>
            </div>

            <!-- Select Input -->
            <div v-else-if="field.type === 'select'">
              <select
                :id="field.key"
                v-model="editData[field.key]"
                class="at-input w-full py-2"
                :class="{ 'border-rose-500 focus:ring-rose-500/20': errors[field.key], 'bg-slate-50 cursor-not-allowed': field.disabled }"
                :disabled="field.disabled"
                @change="clearError(field.key)"
              >
                <option value="" disabled>{{ field.placeholder || t('select_option') }}</option>
                <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Date Input -->
            <div v-else-if="field.type === 'date'">
              <input
                :id="field.key"
                v-model="editData[field.key]"
                type="date"
                class="at-input w-full"
                :class="{ 'border-rose-500 focus:ring-rose-500/20': errors[field.key], 'bg-slate-50 cursor-not-allowed': field.disabled }"
                :disabled="field.disabled"
                @change="clearError(field.key)"
              />
            </div>

            <!-- Toggle Input -->
            <div v-else-if="field.type === 'toggle'" class="flex h-10 items-center">
              <button
                type="button"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
                :class="[editData[field.key] ? 'bg-brand-600' : 'bg-slate-200', field.disabled ? 'opacity-50 cursor-not-allowed' : '']"
                :disabled="field.disabled"
                @click="editData[field.key] = !editData[field.key]"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="editData[field.key] ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
              <span class="ml-3 text-sm font-medium text-slate-600">{{ editData[field.key] ? t('active') : t('passive') }}</span>
            </div>
          </div>
        </div>

        <div class="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            class="btn btn-sm btn-ghost font-semibold text-slate-500 hover:text-slate-700"
            :disabled="saving"
            @click="handleCancel"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="submit"
            class="btn btn-sm btn-primary min-w-[100px] font-bold shadow-lg shadow-brand-500/20"
            :disabled="saving"
          >
            <FeatherIcon v-if="saving" name="loader" class="mr-2 h-3.5 w-3.5 animate-spin" />
            {{ saving ? t('saving') : t('save') }}
          </button>
        </div>
      </form>

      <div v-else class="animate-in fade-in slide-in-from-top-1 duration-300">
        <FieldGroup :fields="displayFields" :cols="cols" />
      </div>

      <!-- Saving Overlay -->
      <div v-if="saving" class="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl transition-opacity">
        <div class="flex flex-col items-center gap-3">
          <div class="relative h-10 w-10">
            <div class="absolute inset-0 rounded-full border-4 border-brand-100"></div>
            <div class="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin"></div>
          </div>
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-700">{{ t('updating') }}...</span>
        </div>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue';
import { FeatherIcon } from 'frappe-ui';
import SectionPanel from './SectionPanel.vue';
import FieldGroup from '../ui/FieldGroup.vue';

const props = defineProps({
  title: { type: String, required: true },
  fields: { type: Array, required: true }, // Array of { key, label, value, type, options, required, placeholder, displayValue }
  isEditable: { type: Boolean, default: true },
  cols: { type: Number, default: 1 },
  saving: { type: Boolean, default: false },
  panelClass: { type: String, default: 'surface-card rounded-xl p-5 transition-all duration-300' },
  t: { type: Function, required: true }
});

const emit = defineEmits(['save', 'cancel']);

const isEditing = ref(false);
const editData = reactive({});
const errors = reactive({});

const displayFields = computed(() => {
  return props.fields.map(f => ({
    label: f.label,
    value: f.displayValue !== undefined ? f.displayValue : (f.value || '—'),
    variant: f.value ? 'default' : 'muted'
  }));
});

function startEditing() {
  // Reset edit data with current values
  props.fields.forEach(f => {
    editData[f.key] = f.value;
    errors[f.key] = '';
  });
  isEditing.value = true;
}

function handleCancel() {
  isEditing.value = false;
  emit('cancel');
}

function clearError(key) {
  errors[key] = '';
}

function validate() {
  let isValid = true;
  props.fields.forEach(f => {
    if (f.required && !editData[f.key] && editData[f.key] !== 0 && editData[f.key] !== false) {
      errors[f.key] = props.t('field_required');
      isValid = false;
    }
    
    if (f.type === 'email' && editData[f.key]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editData[f.key])) {
        errors[f.key] = props.t('invalid_email');
        isValid = false;
      }
    }
  });
  return isValid;
}

async function handleSave() {
  if (!validate()) return;
  
  emit('save', { ...editData }, () => {
    // Callback to call when save is successful
    isEditing.value = false;
  });
}

// If saving becomes false (likely due to success/error externally), we might want to close edit mode
watch(() => props.saving, (newVal, oldVal) => {
  if (oldVal && !newVal && !props.error) {
    // If it was saving and now it's not, and there's no error, we can stop editing
    // isEditing.value = false; // Actually better to let the parent control this via handleSave callback
  }
});
</script>

<style scoped>
/* Scoped styles removed in favor of global .at-input and .field-label in style.css */
</style>
