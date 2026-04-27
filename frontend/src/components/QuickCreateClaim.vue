<template>
  <Dialog v-model="showProxy" :options="{ title: resolvedTitle, size: 'xl' }">
    <template #body-content>
      <ClaimForm
        :model="form"
        :field-errors="fieldErrors"
        :options-map="optionsMap"
        :disabled="loading"
        :loading="loading"
        :error="errorText"
        :eyebrow="resolvedEyebrow"
        :subtitle="resolvedSubtitle"
        :locale="locale"
        :labels="resolvedLabels"
        :fields="fields"
        @cancel="close"
        @save="submit($event)"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource, Dialog } from "frappe-ui";
import ClaimForm from "./ClaimForm.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
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
const config = getQuickCreateConfig("claim");
const fields = computed(() => config?.fields || []);
const form = reactive({});
const fieldErrors = reactive({});
const loading = ref(false);
const errorText = ref("");

const showProxy = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const createResourceHandle = createResource({
  url: config?.submitUrl || "",
  auto: false,
});

const resolvedTitle = computed(() => getLocalizedText(props.titleOverride || config?.title, props.locale));
const resolvedEyebrow = computed(() => getQuickCreateEyebrow("claim", props.locale));
const resolvedSubtitle = computed(() => getLocalizedText(props.subtitleOverride || config?.subtitle, props.locale));
const resolvedLabels = computed(() => ({ ...getQuickCreateLabels("claim", props.locale), ...props.labels }));

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
    emit("created", { response, recordName, openAfter, configKey: "claim" });
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
