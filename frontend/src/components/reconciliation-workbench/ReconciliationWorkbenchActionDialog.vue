<template>
  <ATQuickEntryModal
    v-model="showModel"
    :title="props.reconciliationActionDialogTitle"
    :subtitle="props.reconciliationActionDialogSubtitle"
    :eyebrow="props.actionDialogEyebrow"
    :error="props.actionDialogError"
    :loading="props.actionDialogLoading"
    :show-save-and-open="false"
    :labels="props.actionDialogLabels"
    @cancel="$emit('close')"
    @save="$emit('save')"
  >
    <div class="space-y-6 py-2">
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ props.t("difference") }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>

        <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-6 text-sm text-slate-700">
          <p class="font-medium text-slate-900">
            {{ props.actionDialogRow?.source_doctype || "-" }} / {{ props.actionDialogRow?.source_name || "-" }}
          </p>
          <p class="mt-2 text-brand-700 font-semibold">
            {{ props.t("difference") }}:
            {{ props.formatMoney(props.actionDialogRow?.difference_try) }}
          </p>
          <p v-if="props.actionDialogRow?.notes" class="mt-2 text-slate-500 italic">
            {{ props.t("currentNote") }}: {{ props.actionDialogRow.notes }}
          </p>
        </div>
        
        <div class="at-input-group">
          <label class="at-label block">
            {{ props.t("noteLabel") }}
          </label>
          <textarea
            v-model="notesModel"
            class="at-control-premium min-h-[120px]"
            :placeholder="props.t('notePlaceholder')"
            :disabled="props.actionDialogLoading"
          />
        </div>
      </section>
    </div>
  </ATQuickEntryModal>
</template>

<script setup>
import ATQuickEntryModal from "../app-shell/ATQuickEntryModal.vue";

const showModel = defineModel("show", { type: Boolean, default: false });
const notesModel = defineModel("notes", { type: String, default: "" });

const props = defineProps({
  t: { type: Function, required: true },
  actionDialogEyebrow: { type: String, default: "" },
  actionDialogLabels: { type: Object, required: true },
  actionDialogRow: { type: Object, default: null },
  actionDialogLoading: { type: Boolean, default: false },
  actionDialogError: { type: String, default: "" },
  reconciliationActionDialogTitle: { type: String, required: true },
  reconciliationActionDialogSubtitle: { type: String, required: true },
  formatMoney: { type: Function, required: true },
});

defineEmits(["close", "save"]);
</script>
