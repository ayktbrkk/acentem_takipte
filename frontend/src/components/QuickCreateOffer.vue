<template>
  <div v-if="modelValue" class="dialog-overlay" @click.self="close">
    <div class="dialog-shell dialog-md qc-managed-dialog-shell">
      <div class="qc-managed-dialog__header">
        <div class="qc-managed-dialog__headline">
          <p class="qc-managed-dialog__eyebrow">{{ resolvedEyebrow }}</p>
          <h3 class="qc-managed-dialog__title">{{ resolvedTitle }}</h3>
          <p v-if="resolvedSubtitle" class="qc-managed-dialog__subtitle">{{ resolvedSubtitle }}</p>
        </div>
        <button
          class="qc-managed-dialog__close"
          type="button"
          :aria-label="translateText('Close', locale)"
          :title="translateText('Close', locale)"
          @click="close"
        >
          <span aria-hidden="true">×</span>
          <span class="sr-only">{{ translateText('Close', locale) }}</span>
        </button>
      </div>

      <form class="qc-managed-dialog__body" @submit.prevent="submit(false)">
        <QuickCreateDialogShell
          :error="errorText"
          :show-eyebrow="false"
          :show-subtitle="false"
          :eyebrow="resolvedEyebrow"
          :subtitle="resolvedSubtitle"
          :loading="loading"
          :save-disabled="saveDisabledComputed"
          :show-save-and-open="true"
          :labels="resolvedLabels"
          @cancel="close"
          @save="submit(false)"
          @save-and-open="submit(true)"
        >
          <QuickCreateFormRenderer
            :fields="fields"
            :model="form"
            :field-errors="fieldErrors"
            :disabled="loading"
            :locale="locale"
            :options-map="optionsMap"
            @submit="submit(false)"
          />
        </QuickCreateDialogShell>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";
import QuickCreateFormRenderer from "./app-shell/QuickCreateFormRenderer.vue";
import QuickCreateDialogShell from "./app-shell/QuickCreateDialogShell.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreate";
import { getQuickCreateEyebrow, getQuickCreateLabels } from "../utils/quickCreateCopy";
import { translateText } from "../utils/i18n";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  locale: { type: String, default: "en" },
  optionsMap: { type: Object, default: () => ({}) },
  saveDisabled: { type: Boolean, default: false },
  titleOverride: { type: [String, Object], default: "" },
  subtitleOverride: { type: [String, Object], default: "" },
  labels: { type: Object, default: () => ({}) },
  returnTo: { type: String, default: "" },
  validate: { type: Function, default: null },
  buildPayload: { type: Function, default: null },
  beforeOpen: { type: Function, default: null },
  beforeSubmit: { type: Function, default: null },
  afterSubmit: { type: Function, default: null },
  successHandlers: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["update:modelValue", "created", "cancel", "error", "opened"]);

const router = useRouter();
const config = getQuickCreateConfig("offer");
const fields = computed(() => config?.fields || []);
const form = reactive({});
const fieldErrors = reactive({});
const loading = ref(false);
const errorText = ref("");

const createResourceHandle = createResource({
  url: config?.submitUrl || "",
  auto: false,
});

const resolvedTitle = computed(() => getLocalizedText(props.titleOverride || config?.title, props.locale));
const resolvedEyebrow = computed(() => getQuickCreateEyebrow("offer", props.locale));
const resolvedSubtitle = computed(() => getLocalizedText(props.subtitleOverride || config?.subtitle, props.locale));
const resolvedLabels = computed(() => ({ ...getQuickCreateLabels("create", props.locale), ...props.labels }));
const saveDisabledComputed = computed(() => props.saveDisabled || loading.value);

function resetFieldErrors() {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
}

function resetForm(overrides = {}) {
  const next = buildQuickCreateDraft(config, overrides);
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, next);
  resetFieldErrors();
  errorText.value = "";
}

function normalizeFieldValue(field, value) {
  if (value === "" || value == null) return null;
  if (field?.type === "number") {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  if (field?.type === "checkbox") return Boolean(value);
  return value;
}

function defaultPayload() {
  const payload = {};
  for (const field of fields.value) {
    payload[field.name] = normalizeFieldValue(field, form[field.name]);
  }
  return payload;
}

function validateRequired() {
  resetFieldErrors();
  errorText.value = "";
  let valid = true;
  for (const field of fields.value) {
    if (!field?.required) continue;
    const value = form[field.name];
    const empty = typeof value === "boolean" ? false : String(value ?? "").trim() === "";
    if (empty) {
      fieldErrors[field.name] = getLocalizedText(field.label, props.locale);
      valid = false;
    }
  }
  if (!valid) {
    errorText.value = translateText("Please fill required fields.", props.locale);
  }
  return valid;
}

async function submit(openAfter = false) {
  if (loading.value || !validateRequired()) return;

  const hasPolicyHolderField = fields.value.some((field) => field?.name === "policy_holder");
  if (hasPolicyHolderField && !String(form.policy_holder || "").trim()) {
    errorText.value = translateText("Policy holder is required.", props.locale);
    fieldErrors.policy_holder = translateText("Policy Holder", props.locale);
    return;
  }

  if (typeof props.validate === "function") {
    const result = await props.validate({ form, fieldErrors, setError: (text) => (errorText.value = text) });
    if (result === false) return;
  }

  loading.value = true;
  errorText.value = "";
  try {
    if (typeof props.beforeSubmit === "function") await props.beforeSubmit({ form, openAfter });
    const payload = typeof props.buildPayload === "function" ? await props.buildPayload({ form, openAfter }) : defaultPayload();
    const response = await createResourceHandle.submit(payload);
    const resultKey = config?.resultKey || "name";
    const recordName = response?.[resultKey] || createResourceHandle.data?.[resultKey] || null;
    await runQuickCreateSuccessTargets(config?.successRefreshTargets, props.successHandlers);
    if (typeof props.afterSubmit === "function") await props.afterSubmit({ response, recordName, openAfter, form });
    emit("created", { response, recordName, openAfter, configKey: "offer" });
    emit("update:modelValue", false);
    resetForm();
    if (openAfter && recordName && config?.openRouteName) {
      await router.push({ name: config.openRouteName, params: { name: recordName } });
      return;
    }
    if (!openAfter && props.returnTo) await router.push(props.returnTo).catch(() => {});
  } catch (error) {
    errorText.value = error?.messages?.join(" ") || error?.message || translateText("Create failed.", props.locale);
    emit("error", error);
  } finally {
    loading.value = false;
  }
}

function close() {
  emit("update:modelValue", false);
  emit("cancel");
  resetFieldErrors();
  errorText.value = "";
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      resetForm();
      if (typeof props.beforeOpen === "function") await props.beforeOpen({ form, resetForm });
      emit("opened");
      return;
    }
    resetFieldErrors();
    errorText.value = "";
  },
  { immediate: true }
);
</script>
