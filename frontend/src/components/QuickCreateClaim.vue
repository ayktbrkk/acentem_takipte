<template>
  <div v-if="modelValue" class="dialog-overlay" @click.self="close">
    <div class="dialog-shell dialog-md">
      <div class="dialog-header">
        <h3 class="dialog-title">{{ resolvedTitle }}</h3>
        <button class="btn btn-outline btn-sm" type="button" @click="close">X</button>
      </div>

      <form class="dialog-body" @submit.prevent="submit(false)">
        <p v-if="resolvedSubtitle" class="mb-4 text-xs text-gray-500">{{ resolvedSubtitle }}</p>
        <QuickCreateFormRenderer
          :fields="fields"
          :model="form"
          :field-errors="fieldErrors"
          :disabled="loading"
          :locale="locale"
          :options-map="optionsMap"
          @submit="submit(false)"
        />
        <div v-if="errorText" class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ errorText }}
        </div>
      </form>

      <div class="dialog-footer">
        <button type="button" class="btn btn-outline" :disabled="loading" @click="close">{{ resolvedLabels.cancel }}</button>
        <button type="button" class="btn btn-primary" :disabled="loading || saveDisabledComputed" @click="submit(false)">{{ resolvedLabels.save }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";
import QuickCreateFormRenderer from "./app-shell/QuickCreateFormRenderer.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  locale: { type: String, default: "tr" },
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

const createResourceHandle = createResource({
  url: config?.submitUrl || "",
  auto: false,
});

const resolvedTitle = computed(() => getLocalizedText(props.titleOverride || config?.title, props.locale));
const resolvedSubtitle = computed(() => getLocalizedText(props.subtitleOverride || config?.subtitle, props.locale));
const resolvedLabels = computed(() => ({
  cancel: props.labels.cancel || (props.locale === "tr" ? "Iptal" : "Cancel"),
  save: props.labels.save || (props.locale === "tr" ? "Olustur" : "Create"),
}));
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
    errorText.value = props.locale === "tr" ? "Lutfen gerekli alanlari doldurun." : "Please fill required fields.";
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
    errorText.value = error?.messages?.join(" ") || error?.message || (props.locale === "tr" ? "Kayit olusturma basarisiz oldu." : "Create failed.");
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
