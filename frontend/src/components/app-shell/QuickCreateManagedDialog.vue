<template>
  <Dialog v-model="open" :options="dialogOptions">
    <template #body-content>
      <QuickCreateDialogShell
        :error="errorText"
        :subtitle="uiSubtitle"
        :loading="loading"
        :save-disabled="saveDisabledComputed"
        :show-save-and-open="showSaveAndOpen"
        :labels="labelsResolved"
        @cancel="onCancel"
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
    </template>
  </Dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../../config/quickCreateRegistry";
import QuickCreateDialogShell from "./QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "./QuickCreateFormRenderer.vue";
import { runQuickCreateSuccessTargets } from "../../utils/quickCreateSuccess";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  configKey: { type: String, required: true },
  locale: { type: String, default: "tr" },
  optionsMap: { type: Object, default: () => ({}) },
  saveDisabled: { type: Boolean, default: false },
  showSaveAndOpen: { type: Boolean, default: true },
  dialogSize: { type: String, default: "xl" },
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

const emit = defineEmits([
  "update:modelValue",
  "created",
  "cancel",
  "error",
  "opened",
]);

const router = useRouter();
const config = computed(() => getQuickCreateConfig(props.configKey));
const fields = computed(() => config.value?.fields || []);

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const form = reactive({});
const fieldErrors = reactive({});
const loading = ref(false);
const errorText = ref("");

const createResourceHandle = createResource({
  url: computed(() => config.value?.submitUrl || "").value,
  auto: false,
});

const labelsResolved = computed(() => ({
  cancel: props.labels.cancel || (props.locale === "tr" ? "Vazgec" : "Cancel"),
  save: props.labels.save || (props.locale === "tr" ? "Kaydet" : "Save"),
  saveAndOpen: props.labels.saveAndOpen || (props.locale === "tr" ? "Kaydet ve Ac" : "Save & Open"),
}));

const uiTitle = computed(() => getLocalizedText(props.titleOverride || config.value?.title, props.locale));
const uiSubtitle = computed(() => getLocalizedText(props.subtitleOverride || config.value?.subtitle, props.locale));
const dialogOptions = computed(() => ({ title: uiTitle.value, size: props.dialogSize }));
const saveDisabledComputed = computed(() => props.saveDisabled || loading.value);

function resetFieldErrors() {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
}

function resetForm(overrides = {}) {
  const next = buildQuickCreateDraft(config.value, overrides);
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, next);
  resetFieldErrors();
  errorText.value = "";
}

function validateRequiredFields() {
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
    errorText.value = props.locale === "tr" ? "Lutfen gerekli alanlari doldurun." : "Please fill required fields.";
  }
  return valid;
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

async function submit(openAfter = false) {
  if (loading.value || !config.value) return;
  const baseValid = validateRequiredFields();
  if (!baseValid) return;
  if (typeof props.validate === "function") {
    const result = await props.validate({ form, fieldErrors, setError: (text) => (errorText.value = text) });
    if (result === false) return;
  }
  loading.value = true;
  errorText.value = "";
  try {
    if (typeof props.beforeSubmit === "function") {
      await props.beforeSubmit({ form, openAfter });
    }
    const payload =
      typeof props.buildPayload === "function"
        ? await props.buildPayload({ form, openAfter })
        : defaultPayload();
    const response = await createResourceHandle.submit(payload);
    const resultKey = config.value?.resultKey || "name";
    const recordName = response?.[resultKey] || createResourceHandle.data?.[resultKey] || null;
    await runQuickCreateSuccessTargets(config.value?.successRefreshTargets, props.successHandlers);
    if (typeof props.afterSubmit === "function") {
      await props.afterSubmit({ response, recordName, openAfter, form });
    }
    emit("created", { response, recordName, openAfter, configKey: props.configKey });
    open.value = false;
    resetForm();
    if (openAfter && recordName && config.value?.openRouteName) {
      await router.push({ name: config.value.openRouteName, params: { name: recordName } });
      return;
    }
    if (!openAfter && props.returnTo) {
      await router.push(props.returnTo).catch(() => {});
    }
  } catch (error) {
    errorText.value =
      error?.messages?.join(" ") ||
      error?.message ||
      (props.locale === "tr" ? "Kayit olusturma basarisiz oldu." : "Create failed.");
    emit("error", error);
  } finally {
    loading.value = false;
  }
}

function onCancel() {
  open.value = false;
  emit("cancel");
  resetFieldErrors();
  errorText.value = "";
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (!config.value) return;
    if (isOpen) {
      resetForm();
      if (typeof props.beforeOpen === "function") {
        await props.beforeOpen({ form, resetForm });
      }
      emit("opened");
      return;
    }
    resetFieldErrors();
    errorText.value = "";
  },
  { immediate: true }
);
</script>
