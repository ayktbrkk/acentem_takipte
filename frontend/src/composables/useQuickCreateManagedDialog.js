import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { getQuickCreateEyebrow, getQuickCreateLabels } from "../utils/quickCreateCopy";
import { translateText } from "../utils/i18n";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";

export function useQuickCreateManagedDialog(props, emit) {
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
    ...getQuickCreateLabels("manage", props.locale),
    ...props.labels,
  }));

  const uiTitle = computed(() => getLocalizedText(props.titleOverride || config.value?.title, props.locale));
  const resolvedEyebrow = computed(() => props.eyebrow || getQuickCreateEyebrow("managed", props.locale));
  const uiSubtitle = computed(() => getLocalizedText(props.subtitleOverride || config.value?.subtitle, props.locale));
  const dialogShellClass = computed(() => {
    const size = String(props.dialogSize || "").toLowerCase();
    if (size === "sm") return "dialog-shell dialog-sm qc-managed-dialog-shell";
    if (size === "md") return "dialog-shell dialog-md qc-managed-dialog-shell";
    if (size === "lg") return "dialog-shell dialog-lg qc-managed-dialog-shell";
    return "dialog-shell dialog-xl qc-managed-dialog-shell";
  });
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

  async function tryLoadExistingData() {
    const id = String(props.itemId || "").trim();
    if (!id || typeof props.loadExistingData !== "function") return;
    const loaded = await props.loadExistingData(id, { form, resetForm });
    if (loaded && typeof loaded === "object") {
      Object.assign(form, loaded);
    }
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
      errorText.value = translateText("Please fill required fields.", props.locale);
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

    if (props.configKey === "policy" || props.configKey === "offer") {
      const net = Number(form.net_premium) || 0;
      const comm = Number(form.commission_amount) || 0;
      const tax = Number(form.tax_amount) || 0;
      const gross = Number(form.gross_premium) || 0;
      const calcGross = Number((net + comm + tax).toFixed(2));
      if (gross > 0 && Math.abs(gross - calcGross) > 0.01) {
        errorText.value = translateText("Gross Premium must equal Net Premium + Commission + Tax.", props.locale);
        return;
      }
    }

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
        translateText("Create failed.", props.locale);
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
        await tryLoadExistingData();
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

  onMounted(async () => {
    if (!props.modelValue) return;
    await tryLoadExistingData();
  });

  watch(
    () => [form.net_premium, form.commission_amount, form.tax_amount],
    ([net, comm, tax], [oldNet, oldComm, oldTax]) => {
      if (props.configKey !== "policy" && props.configKey !== "offer") return;
      if (net === oldNet && comm === oldComm && tax === oldTax) return;

      const n = Number(net) || 0;
      const c = Number(comm) || 0;
      const t = Number(tax) || 0;
      if (n > 0 || c > 0 || t > 0) {
        form.gross_premium = Number((n + c + t).toFixed(2));
      }
    }
  );

  return {
    config,
    fields,
    open,
    form,
    fieldErrors,
    loading,
    errorText,
    labelsResolved,
    uiTitle,
    resolvedEyebrow,
    uiSubtitle,
    dialogShellClass,
    saveDisabledComputed,
    submit,
    onCancel,
    createResourceHandle,
  };
}
