<template>
  <div class="mb-6">
    <SmartFilterBar
      v-model="filters.query"
      :placeholder="t('searchPlaceholder')"
      @open-advanced="showAdvanced = !showAdvanced"
    >
      <template #primary-filters>
        <select v-model="filters.direction" class="input h-9 py-1 text-sm min-w-[140px]" @change="$emit('apply')">
          <option value="">{{ t("allDirections") }}</option>
          <option value="Inbound">{{ t("inbound") }}</option>
          <option value="Outbound">{{ t("outbound") }}</option>
        </select>
        <select v-model="filters.sort" class="input h-9 py-1 text-sm min-w-[160px]" @change="$emit('apply')">
          <option v-for="option in paymentSortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <div class="h-4 w-px bg-slate-200 mx-1"></div>
        <FilterPresetMenu
          :model-value="presetModel"
          :label="t('presetLabel')"
          :options="presetOptions"
          :can-delete="canDeletePreset"
          :show-save="true"
          :show-delete="true"
          :save-label="t('savePreset')"
          :delete-label="t('deletePreset')"
          @update:model-value="presetModel = $event"
          @change="$emit('preset-change', $event)"
          @save="$emit('preset-save', $event)"
          @delete="$emit('preset-delete')"
        />
        <ActionButton variant="primary" size="sm" @click="$emit('apply')">
          {{ t('applyFilters') }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="$emit('reset')">
          <FeatherIcon name="x" class="h-4 w-4" />
        </ActionButton>
      </template>

      <template #advanced>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 pt-2">
          <label class="flex flex-col gap-1">
            <span class="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{{ t('customerFilter') }}</span>
            <input
              v-model.trim="filters.customerQuery"
              class="input"
              type="search"
              :placeholder="t('customerFilter')"
              @keyup.enter="$emit('apply')"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{{ t('policyFilter') }}</span>
            <input
              v-model.trim="filters.policyQuery"
              class="input"
              type="search"
              :placeholder="t('policyFilter')"
              @keyup.enter="$emit('apply')"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{{ t('purposeFilter') }}</span>
            <input
              v-model.trim="filters.purposeQuery"
              class="input"
              type="search"
              :placeholder="t('purposeFilter')"
              @keyup.enter="$emit('apply')"
            />
          </label>
        </div>
      </template>
    </SmartFilterBar>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import SmartFilterBar from "../app-shell/SmartFilterBar.vue";
import FilterPresetMenu from "../app-shell/FilterPresetMenu.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import { FeatherIcon } from "frappe-ui";

const props = defineProps({
  modelValue: {
    type: String,
    default: "default",
  },
  filters: {
    type: Object,
    required: true,
  },
  paymentSortOptions: {
    type: Array,
    required: true,
  },
  presetOptions: {
    type: Array,
    required: true,
  },
  canDeletePreset: {
    type: Boolean,
    default: false,
  },
  activeCount: {
    type: Number,
    default: 0,
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "preset-change", "preset-save", "preset-delete", "apply", "reset"]);

const showAdvanced = ref(false);

const presetModel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>
