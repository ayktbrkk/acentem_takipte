<template>
  <SectionPanel :title="title" :icon="icon" :panel-class="panelClass" class="group">
    <template #trailing>
      <div class="flex items-center gap-2">
        <slot name="header-actions" />
        <button
          v-if="isEditable && !isEditing"
          class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50/50 text-slate-400 opacity-60 transition-all hover:opacity-100 hover:bg-white hover:text-brand-600 hover:border-brand-200 shadow-sm active:scale-95"
          :title="t('edit')"
          @click="startEditing"
        >
          <FeatherIcon name="edit-2" class="h-3.5 w-3.5" />
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
            <div v-if="['text', 'phone', 'tckn', 'email', 'number', 'tel'].includes(field.type || 'text')" class="relative">
              <input
                :id="field.key"
                v-model="editData[field.key]"
                :type="field.type === 'email' ? 'email' : (field.type || 'text')"
                :step="field.step"
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

            <!-- Autocomplete / Searchable Select -->
            <div v-else-if="field.type === 'autocomplete'" class="relative">
              <div class="relative">
                <input
                  :id="field.key"
                  v-model="searchQueries[field.key]"
                  type="text"
                  class="at-input w-full pr-10"
                  :class="{ 'border-rose-500 focus:ring-rose-500/20': errors[field.key], 'bg-slate-50 cursor-not-allowed': field.disabled }"
                  :placeholder="field.placeholder || t('search_records')"
                  :disabled="field.disabled"
                  @focus="activeDropdown = field.key"
                  @input="handleAutocompleteInput(field.key)"
                  @keydown.down.prevent="moveHighlight(field.key, 1)"
                  @keydown.up.prevent="moveHighlight(field.key, -1)"
                  @keydown.enter.prevent="selectHighlighted(field.key)"
                />
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FeatherIcon name="search" class="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <!-- Dropdown -->
              <div 
                v-if="activeDropdown === field.key" 
                class="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div v-if="filteredOptions(field).length === 0" class="px-4 py-8 text-center">
                  <p class="text-xs font-medium text-slate-400">{{ t('no_records_found') }}</p>
                </div>
                <button
                  v-for="(opt, idx) in filteredOptions(field)"
                  :key="opt.value"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all"
                  :class="[
                    idx === highlightIndex ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-600 hover:bg-slate-50',
                    editData[field.key] === opt.value ? 'bg-brand-50/50' : ''
                  ]"
                  @click="selectOption(field.key, opt)"
                  @mouseenter="highlightIndex = idx"
                >
                  <div 
                    class="h-1.5 w-1.5 rounded-full" 
                    :class="editData[field.key] === opt.value ? 'bg-brand-500 shadow-[0_0_8px_rgba(var(--at-brand-500),0.5)]' : 'bg-transparent'"
                  ></div>
                  <span class="flex-1 truncate">{{ opt.label }}</span>
                  <FeatherIcon v-if="editData[field.key] === opt.value" name="check" class="h-3.5 w-3.5 text-brand-500" />
                </button>
              </div>
              
              <!-- Selected Value Hint -->
              <div v-if="editData[field.key] && !activeDropdown" class="mt-1.5 flex items-center gap-2 px-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-brand-600">{{ t('selected') }}:</span>
                <span class="text-[11px] font-semibold text-slate-900 truncate max-w-[200px]">{{ getOptionLabel(field) }}</span>
                <button type="button" @click="clearSelection(field.key)" class="text-slate-400 hover:text-rose-500 transition-colors">
                  <FeatherIcon name="x" class="h-3 w-3" />
                </button>
              </div>

              <p v-if="errors[field.key]" class="mt-1 text-xs font-medium text-rose-500">
                {{ errors[field.key] }}
              </p>
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
        <FieldGroup 
          :fields="displayFields" 
          :cols="cols" 
          :layout="layout" 
          @copy="handleCopy"
        />
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
  icon: { type: String, default: '' },
  fields: { type: Array, required: true }, // Array of { key, label, value, type, options, required, placeholder, displayValue }
  isEditable: { type: Boolean, default: true },
  cols: { type: Number, default: 1 },
  layout: { type: String, default: 'grid' },
  saving: { type: Boolean, default: false },
  panelClass: { type: String, default: 'surface-card rounded-xl p-5 transition-all duration-300' },
  t: { type: Function, required: true }
});

const emit = defineEmits(['save', 'cancel']);

const isEditing = ref(false);
const editData = reactive({});
const errors = reactive({});

// Autocomplete State
const searchQueries = reactive({});
const activeDropdown = ref(null);
const highlightIndex = ref(0);

const displayFields = computed(() => {
  return props.fields.map(f => {
    if (f.type === 'divider') {
      return {
        key: f.key,
        type: 'divider',
        label: f.label,
        span: f.span,
      };
    }

    const hasValue = f.value || f.value === 0 || f.value === false;

    return {
      key: f.key,
      type: f.type,
      label: f.label,
      value: f.displayValue !== undefined
        ? f.displayValue
        : (hasValue ? f.value : (f.unspecifiedLabel || props.t('unspecified'))),
      unspecifiedLabel: f.unspecifiedLabel,
      copyable: f.copyable,
      valueClass: f.valueClass,
      span: f.span,
      variant: hasValue ? 'default' : 'muted'
    };
  });
});

function startEditing() {
  // Reset edit data with current values
  props.fields.forEach(f => {
    editData[f.key] = f.value;
    errors[f.key] = '';
    
    // Initialize search query for autocomplete fields
    if (f.type === 'autocomplete') {
      const option = (f.options || []).find(o => o.value === f.value);
      searchQueries[f.key] = option ? option.label : '';
    }
  });
  isEditing.value = true;
}

function handleAutocompleteInput(key) {
  clearError(key);
  activeDropdown.value = key;
  highlightIndex.value = 0;
}

function filteredOptions(field) {
  const query = (searchQueries[field.key] || '').toLowerCase();
  const options = field.options || [];
  if (!query) return options.slice(0, 50);
  return options.filter(o => o.label.toLowerCase().includes(query)).slice(0, 50);
}

function getOptionLabel(field) {
  const option = (field.options || []).find(o => o.value === editData[field.key]);
  return option ? option.label : editData[field.key];
}

function selectOption(key, option) {
  editData[key] = option.value;
  searchQueries[key] = option.label;
  activeDropdown.value = null;
  clearError(key);
}

function clearSelection(key) {
  editData[key] = '';
  searchQueries[key] = '';
}

function moveHighlight(key, delta) {
  const field = props.fields.find(f => f.key === key);
  const options = filteredOptions(field);
  if (!options.length) return;
  highlightIndex.value = (highlightIndex.value + delta + options.length) % options.length;
}

function selectHighlighted(key) {
  const field = props.fields.find(f => f.key === key);
  const options = filteredOptions(field);
  if (options[highlightIndex.value]) {
    selectOption(key, options[highlightIndex.value]);
  }
}

// Close dropdown on click outside
if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
      activeDropdown.value = null;
    }
  });
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

function handleCopy(value) {
  if (!value) return;
  navigator.clipboard.writeText(String(value)).then(() => {
    // Optional: add a tiny toast or transient state here if needed
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
