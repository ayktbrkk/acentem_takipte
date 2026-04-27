<template>
  <Dialog 
    v-model="showProxy" 
    :options="{ 
      title: title, 
      size: 'xl'
    }"
  >
    <template #body-content>
      <div class="at-quick-entry-modal p-1">
        <!-- Subtitle Header (Premium Style) -->
        <header v-if="subtitle" class="mb-8 px-1 border-l-4 border-brand-500 pl-4 py-1">
          <div class="flex flex-col gap-1.5">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600/70">
              {{ eyebrow || title }}
            </p>
            <h2 class="text-xl font-extrabold text-slate-900 leading-tight">
              {{ subtitle }}
            </h2>
          </div>
        </header>

        <slot />

        <!-- Error Banner -->
        <transition name="fade">
          <div v-if="error" class="qc-error-banner mt-6 shadow-sm border-amber-100 bg-amber-50" role="alert">
            <div class="flex items-center gap-3">
              <div class="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
              <p class="text-sm font-semibold text-amber-900">{{ error }}</p>
            </div>
          </div>
        </transition>
      </div>
    </template>

    <template #actions>
      <div class="flex items-center justify-end gap-3 w-full py-1">
        <button 
          class="btn btn-outline min-w-[80px]" 
          type="button"
          :disabled="loading"
          @click="emit('cancel')"
        >
          {{ labels.cancel || translateText('cancel', locale) }}
        </button>
        
        <button 
          class="btn btn-primary min-w-[100px]" 
          type="button"
          :disabled="loading || disabled"
          @click="emit('save')"
        >
          <span v-if="loading" class="animate-spin mr-2">⏳</span>
          {{ labels.save || translateText('save', locale) }}
        </button>

        <button 
          v-if="showSaveAndOpen"
          class="btn btn-primary bg-slate-900 border-slate-900 min-w-[120px] shadow-lg shadow-slate-200" 
          type="button"
          :disabled="loading || disabled"
          @click="emit('save-and-open')"
        >
          {{ labels.saveAndOpen || translateText('save_and_open', locale) }}
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from "vue";
import { Dialog } from "frappe-ui";
import { translateText } from "../../utils/i18n";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  error: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  showSaveAndOpen: { type: Boolean, default: true },
  labels: { type: Object, default: () => ({}) },
  locale: { type: String, default: "tr" },
});

const emit = defineEmits(["update:modelValue", "cancel", "save", "save-and-open"]);

const showProxy = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});
</script>

<style scoped>
.at-quick-entry-modal {
  @apply min-h-[400px];
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
