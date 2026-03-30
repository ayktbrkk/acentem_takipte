<template>
  <Dialog v-model="showModel" :options="{ title: props.reconciliationActionDialogTitle, size: 'lg' }">
    <template #body-content>
      <QuickCreateDialogShell
        :error="props.actionDialogError"
        :eyebrow="props.actionDialogEyebrow"
        :subtitle="props.reconciliationActionDialogSubtitle"
        :loading="props.actionDialogLoading"
        :show-save-and-open="false"
        :labels="props.actionDialogLabels"
        @cancel="$emit('close')"
        @save="$emit('save')"
      >
        <div class="space-y-3">
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p class="font-medium text-slate-700">
              {{ props.actionDialogRow?.source_doctype || "-" }} / {{ props.actionDialogRow?.source_name || "-" }}
            </p>
            <p class="mt-1">
              {{ props.t("difference") }}:
              {{ props.formatMoney(props.actionDialogRow?.difference_try) }}
            </p>
            <p v-if="props.actionDialogRow?.notes" class="mt-1">
              {{ props.t("currentNote") }}: {{ props.actionDialogRow.notes }}
            </p>
          </div>
          <label class="block text-xs font-medium uppercase tracking-wide text-slate-500">
            {{ props.t("noteLabel") }}
          </label>
          <textarea
            v-model="notesModel"
            class="input min-h-[120px]"
            :placeholder="props.t('notePlaceholder')"
            :disabled="props.actionDialogLoading"
          />
        </div>
      </QuickCreateDialogShell>
    </template>
  </Dialog>
</template>

<script setup>
import { Dialog } from "frappe-ui";

import QuickCreateDialogShell from "../app-shell/QuickCreateDialogShell.vue";

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
