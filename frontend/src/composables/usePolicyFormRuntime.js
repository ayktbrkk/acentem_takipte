import { computed, reactive, ref, unref } from "vue";

import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";

export function usePolicyFormRuntime({ props, authStore, emit }) {
  const copy = {
    tr: {
      quickPolicyTag: "Hızlı Poliçe",
      title: "Yeni Poliçe",
      subtitle: "Çok adımlı hızlı poliçe formu",
      customerSection: "Müşteri Bilgileri",
      policySection: "Poliçe Detayları",
      coverageSection: "Teminat ve Primler",
      previewSection: "Önizleme ve Onay",
      customerStepHint: "Müşteriyi tek çubuktan arayın. Arama sonucu yoksa aynı yerden yeni müşteri oluşturun.",
      selectedCustomerTitle: "Seçili Müşteri",
      selectedCustomerHint: "Mevcut müşteri seçildiğinde bilgiler otomatik gelir ve bu bölüm kilitlenir.",
      selectedCustomerLocked: "Kilitli",
      cancel: "İptal",
      summaryCustomerSection: "Müşteri Özeti",
      summaryPolicySection: "Poliçe Özeti",
      summaryCoverageSection: "Prim ve Tarih",
      summaryNotesSection: "Notlar",
      customerLabel: "Müşteri",
      newCustomerLabel: "Yeni Müşteri Adı",
      createCustomer: "Yeni müşteri oluştur",
      taxIdLabel: "Kimlik / Vergi No",
      phoneLabel: "Telefon",
      emailLabel: "E-posta",
      sourceOfferLabel: "Kaynak Teklif",
      insuranceCompanyLabel: "Sigorta Şirketi",
      branchLabel: "Branş",
      salesEntityLabel: "Satış Temsilcisi",
      policyNoLabel: "Poliçe No",
      statusLabel: "Durum",
      currencyLabel: "Para Birimi",
      startDateLabel: "Başlangıç Tarihi",
      endDateLabel: "Bitiş Tarihi",
      issueDateLabel: "Tanzim Tarihi",
      grossPremiumLabel: "Brüt Prim",
      netPremiumLabel: "Net Prim",
      taxAmountLabel: "Vergi Tutarı",
      commissionLabel: "Komisyon",
      notesLabel: "Notlar",
      selectOption: "Seçin...",
      statusActive: "Aktif",
      statusDraft: "Taslak",
      statusKyt: "KYT",
      statusIpt: "IPT",
      summaryCustomer: "Müşteri",
      summarySourceOffer: "Kaynak Teklif",
      summaryPolicy: "Poliçe",
      summaryBranch: "Branş",
      summaryGrossPremium: "Brüt Prim",
      summaryCustomerType: "Müşteri Tipi",
      summaryTaxId: "Kimlik / Vergi No",
      summaryBirthDate: "Doğum Tarihi",
      summaryPhone: "Telefon",
      summaryEmail: "E-posta",
      summaryCompany: "Sigorta Şirketi",
      summarySalesEntity: "Satış Temsilcisi",
      summaryStatus: "Durum",
      summaryCurrency: "Para Birimi",
      summaryIssueDate: "Tanzim Tarihi",
      summaryStartDate: "Başlangıç Tarihi",
      summaryEndDate: "Bitiş Tarihi",
      summaryNetPremium: "Net Prim",
      summaryTaxAmount: "Vergi Tutarı",
      summaryCommission: "Komisyon",
      corporateLabel: "Kurumsal",
      individualLabel: "Bireysel",
      back: "Geri",
      next: "İleri",
      save: "Kaydet",
      saving: "Kaydediliyor...",
      stepCustomer: "Müşteri",
      stepPolicy: "Poliçe",
      stepCoverage: "Teminat",
      stepReview: "Onay",
      sourceOfferHint: "Kaynak teklif seçildiğinde şirket, branş, durum ve prim alanları tekliften devralınır.",
      sourceOfferRequired: "Lütfen kaynak teklif seçin.",
      customerSelectionRequired: "Bir müşteri seçin veya yeni müşteri oluşturun.",
      customerNameRequired: "Yeni müşteri adı gerekli.",
      customerIdentityRequired: "TC/VKN gerekli.",
      customerCorporateLength: "Kurumsal müşteri için 10 haneli vergi numarası girin.",
      customerIndividualLength: "Bireysel müşteri için 11 haneli TC kimlik numarası girin.",
      customerIndividualInvalid: "Geçerli bir TC kimlik numarası girin.",
      sales_entityRequired: "Satış birimi gerekli.",
      insurance_companyRequired: "Sigorta şirketi gerekli.",
      branchRequired: "Branş gerekli.",
      currencyRequired: "Para birimi gerekli.",
      statusRequired: "Durum gerekli.",
      issue_dateRequired: "Tanzim tarihi gerekli.",
      start_dateRequired: "Başlangıç tarihi gerekli.",
      end_dateRequired: "Bitiş tarihi gerekli.",
      gross_premiumRequired: "Brüt prim gerekli.",
      grossPremiumRequired: "Brüt prim 0'dan büyük olmalıdır.",
      issueDateAfterStartDate: "Tanzim tarihi başlangıç tarihinden sonra olamaz.",
      startDateAfterEndDate: "Başlangıç tarihi bitiş tarihinden sonra olamaz.",
      defaultError: "Lütfen gerekli alanları doldurun.",
    },
    en: {
      quickPolicyTag: "Quick Policy",
      title: "New Policy",
      subtitle: "Multi-step quick policy form",
      customerSection: "Customer Details",
      policySection: "Policy Details",
      coverageSection: "Coverage and Premiums",
      previewSection: "Preview and Review",
      customerStepHint: "Search customers from one bar. If no result appears, create a new customer from the same place.",
      selectedCustomerTitle: "Selected Customer",
      selectedCustomerHint: "When an existing customer is selected, details are auto-filled and this section is locked.",
      selectedCustomerLocked: "Locked",
      cancel: "Cancel",
      summaryCustomerSection: "Customer Summary",
      summaryPolicySection: "Policy Summary",
      summaryCoverageSection: "Premiums and Dates",
      summaryNotesSection: "Notes",
      customerLabel: "Customer",
      newCustomerLabel: "New Customer Name",
      createCustomer: "Create new customer",
      taxIdLabel: "ID / Tax No",
      phoneLabel: "Phone",
      emailLabel: "Email",
      sourceOfferLabel: "Source Offer",
      insuranceCompanyLabel: "Insurance Company",
      branchLabel: "Branch",
      salesEntityLabel: "Sales Entity",
      policyNoLabel: "Policy No",
      statusLabel: "Status",
      currencyLabel: "Currency",
      startDateLabel: "Start Date",
      endDateLabel: "End Date",
      issueDateLabel: "Issue Date",
      grossPremiumLabel: "Gross Premium",
      netPremiumLabel: "Net Premium",
      taxAmountLabel: "Tax Amount",
      commissionLabel: "Commission",
      notesLabel: "Notes",
      selectOption: "Select...",
      statusActive: "Active",
      statusDraft: "Draft",
      statusKyt: "KYT",
      statusIpt: "IPT",
      summaryCustomer: "Customer",
      summarySourceOffer: "Source Offer",
      summaryPolicy: "Policy",
      summaryBranch: "Branch",
      summaryGrossPremium: "Gross Premium",
      summaryCustomerType: "Customer Type",
      summaryTaxId: "ID / Tax No",
      summaryBirthDate: "Birth Date",
      summaryPhone: "Phone",
      summaryEmail: "Email",
      summaryCompany: "Insurance Company",
      summarySalesEntity: "Sales Entity",
      summaryStatus: "Status",
      summaryCurrency: "Currency",
      summaryIssueDate: "Issue Date",
      summaryStartDate: "Start Date",
      summaryEndDate: "End Date",
      summaryNetPremium: "Net Premium",
      summaryTaxAmount: "Tax Amount",
      summaryCommission: "Commission",
      corporateLabel: "Corporate",
      individualLabel: "Individual",
      back: "Back",
      next: "Next",
      save: "Save",
      saving: "Saving...",
      stepCustomer: "Customer",
      stepPolicy: "Policy",
      stepCoverage: "Coverage",
      stepReview: "Review",
      sourceOfferHint: "When a source offer is selected, company, branch, status, and premium fields are inherited from the offer.",
      sourceOfferRequired: "Please select a source offer.",
      customerSelectionRequired: "Select a customer or create a new one.",
      customerNameRequired: "New customer name is required.",
      customerIdentityRequired: "Customer ID / tax number is required.",
      customerCorporateLength: "Enter a 10-digit tax number for corporate customers.",
      customerIndividualLength: "Enter an 11-digit national ID number for individual customers.",
      customerIndividualInvalid: "Enter a valid national ID number.",
      sales_entityRequired: "Sales entity is required.",
      insurance_companyRequired: "Insurance company is required.",
      branchRequired: "Branch is required.",
      currencyRequired: "Currency is required.",
      statusRequired: "Status is required.",
      issue_dateRequired: "Issue date is required.",
      start_dateRequired: "Start date is required.",
      end_dateRequired: "End date is required.",
      gross_premiumRequired: "Gross premium is required.",
      grossPremiumRequired: "Gross premium must be greater than zero.",
      issueDateAfterStartDate: "Issue date cannot be later than start date.",
      startDateAfterEndDate: "Start date cannot be later than end date.",
      defaultError: "Please fill required fields.",
    },
  };

  const activeLocaleValue = computed(() => unref(authStore?.locale) || "tr");

  function t(key) {
    return copy[activeLocaleValue.value]?.[key] || copy.en[key] || key;
  }

  const customerPickerLabel = {
    tr: "Müşteri Ara / Yeni Müşteri",
    en: "Customer Search / New Customer",
  };
  const customerSearchPlaceholder = {
    tr: "Müşteri adı, ünvanı veya TC/VKN girin...",
    en: "Search by customer name, company name, or ID...",
  };
  const customerNoResultsText = {
    tr: "Aranan müşteri bulunamadı. Aynı çubuktan yeni müşteri ekleyebilirsiniz.",
    en: "No customer found. You can add a new customer from the same bar.",
  };
  const customerLockedMessage = {
    tr: "Kaynak teklif seçildiğinde müşteri bilgisi tekliften otomatik alınır.",
    en: "Customer information is inherited automatically when a source offer is selected.",
  };

  const currentStep = ref(1);
  const totalSteps = 4;
  const stepError = ref("");
  const actionsDisabled = computed(() => props.disabled || props.loading);
  const saveButtonText = computed(() => (props.loading ? t("saving") : t("save")));
  const eyebrowText = computed(() => props.eyebrow || t("quickPolicyTag"));
  const titleText = computed(() => props.title || t("title"));
  const subtitleText = computed(() => props.subtitle || t("subtitle"));

  const formSteps = computed(() => [
    { label: t("stepCustomer"), state: currentStep.value > 1 ? "done" : "current" },
    { label: t("stepPolicy"), state: currentStep.value > 2 ? "done" : currentStep.value === 2 ? "current" : "pending" },
    { label: t("stepCoverage"), state: currentStep.value > 3 ? "done" : currentStep.value === 3 ? "current" : "pending" },
    { label: t("stepReview"), state: currentStep.value === 4 ? "current" : "pending" },
  ]);

  const quickPolicyConfig = getQuickCreateConfig("policy");
  const policyQuickFields = computed(() => quickPolicyConfig?.fields || []);
  const policySourceOfferFields = computed(() =>
    policyQuickFields.value
      .filter((field) => field.name === "source_offer")
      .map((field) => ({ ...field, fullWidth: true }))
  );
  const policyStepFields = computed(() =>
    policyQuickFields.value.filter((field) =>
      ["sales_entity", "insurance_company", "branch", "policy_no", "status", "currency"].includes(field.name)
    )
  );
  const policyCoverageFields = computed(() => [
    { name: "start_date", type: "date", label: t("startDateLabel"), required: () => !props.hasSourceOffer },
    { name: "end_date", type: "date", label: t("endDateLabel"), required: () => !props.hasSourceOffer },
    {
      name: "issue_date",
      type: "date",
      label: t("issueDateLabel"),
      required: () => !props.hasSourceOffer,
      disabled: () => props.hasSourceOffer,
    },
    {
      name: "gross_premium",
      type: "number",
      label: t("grossPremiumLabel"),
      required: () => !props.hasSourceOffer,
      disabled: () => props.hasSourceOffer,
      min: 0,
      step: "0.01",
    },
    { name: "net_premium", type: "number", label: t("netPremiumLabel"), disabled: () => props.hasSourceOffer, min: 0, step: "0.01" },
    { name: "tax_amount", type: "number", label: t("taxAmountLabel"), disabled: () => props.hasSourceOffer, min: 0, step: "0.01" },
    {
      name: "commission_amount",
      type: "number",
      label: t("commissionLabel"),
      disabled: () => props.hasSourceOffer,
      min: 0,
      step: "0.01",
    },
  ]);
  const policyReviewFields = computed(() => [{ name: "notes", type: "textarea", label: t("notesLabel"), rows: 8, fullWidth: true }]);

  const customerOptions = computed(() => props.optionsMap?.customers || []);
  const selectedCustomerDetails = computed(() => {
    const customerName = String(props.model?.customer || "").trim();
    if (!customerName) return null;
    return (
      customerOptions.value.find((row) => String(row?.value || "").trim() === customerName) || {
        value: customerName,
        label: String(props.model?.customer_full_name || props.model?.queryText || customerName).trim() || customerName,
        customer_type: props.model?.customer_type || "",
        tax_id: props.model?.customer_tax_id || "",
        birth_date: props.model?.customer_birth_date || "",
        phone: props.model?.customer_phone || "",
        email: props.model?.customer_email || "",
      }
    );
  });
  const selectedCustomerName = computed(() =>
    String(selectedCustomerDetails.value?.label || props.model?.customer_full_name || props.model?.queryText || props.model?.customer || "").trim()
  );
  const selectedCustomerTypeLabel = computed(() => {
    const normalized = normalizeCustomerType(
      selectedCustomerDetails.value?.customer_type || props.model?.customer_type,
      selectedCustomerDetails.value?.tax_id || props.model?.customer_tax_id || ""
    );
    return normalized === "Corporate" ? t("corporateLabel") : t("individualLabel");
  });
  const selectedCustomerTaxId = computed(
    () => String(selectedCustomerDetails.value?.tax_id || props.model?.customer_tax_id || "-").trim() || "-"
  );
  const selectedCustomerBirthDate = computed(() => {
    const rawBirthDate = String(selectedCustomerDetails.value?.birth_date || props.model?.customer_birth_date || "").trim();
    if (!rawBirthDate) return "-";
    const normalizedType = normalizeCustomerType(
      selectedCustomerDetails.value?.customer_type || props.model?.customer_type,
      selectedCustomerDetails.value?.tax_id || props.model?.customer_tax_id || ""
    );
    return normalizedType === "Corporate" ? "-" : rawBirthDate;
  });
  const selectedCustomerPhone = computed(
    () => String(selectedCustomerDetails.value?.phone || props.model?.customer_phone || "-").trim() || "-"
  );
  const selectedCustomerEmail = computed(
    () => String(selectedCustomerDetails.value?.email || props.model?.customer_email || "-").trim() || "-"
  );
  const summaryCustomerName = computed(() => selectedCustomerName.value || "-");
  const summaryCustomerType = computed(() => selectedCustomerTypeLabel.value || "-");
  const summaryCustomerTaxId = computed(() => selectedCustomerTaxId.value || "-");
  const summaryCustomerBirthDate = computed(() => selectedCustomerBirthDate.value || "-");
  const summaryCustomerPhone = computed(() => selectedCustomerPhone.value || "-");
  const summaryCustomerEmail = computed(() => selectedCustomerEmail.value || "-");

  function customerIsSelected() {
    return Boolean(String(props.model?.customer || "").trim());
  }

  function customerNameForValidation() {
    return String(props.model?.customer_full_name || props.model?.queryText || "").trim();
  }

  function customerTypeForValidation() {
    return normalizeCustomerType(props.model?.customer_type, props.model?.customer_tax_id || "");
  }

  function customerTaxIdForValidation() {
    return normalizeIdentityNumber(props.model?.customer_tax_id);
  }

  function parseDateOnly(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return null;
    const date = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function validateCustomerStep() {
    if (props.hasSourceOffer) {
      return String(props.model?.source_offer || "").trim() ? "" : t("sourceOfferRequired");
    }
    if (customerIsSelected()) return "";
    if (!props.model?.createCustomerMode) return t("customerSelectionRequired");
    const customerName = customerNameForValidation();
    if (!customerName) return t("customerNameRequired");
    const customerType = customerTypeForValidation();
    const identityNumber = customerTaxIdForValidation();
    if (!identityNumber) return t("customerIdentityRequired");
    if (customerType === "Corporate") {
      if (identityNumber.length !== 10) return t("customerCorporateLength");
    } else {
      if (identityNumber.length !== 11) return t("customerIndividualLength");
      if (!isValidTckn(identityNumber)) return t("customerIndividualInvalid");
    }
    return "";
  }

  function validatePolicyStep() {
    if (props.hasSourceOffer) return "";
    const requiredFields = ["sales_entity", "insurance_company", "branch", "currency", "status"];
    for (const fieldName of requiredFields) {
      if (!String(props.model?.[fieldName] || "").trim()) {
        return t(`${fieldName}Required`);
      }
    }
    return "";
  }

  function validateCoverageStep() {
    if (props.hasSourceOffer) return "";
    const requiredFields = ["issue_date", "start_date", "end_date", "gross_premium"];
    for (const fieldName of requiredFields) {
      if (!String(props.model?.[fieldName] || "").trim()) {
        return t(`${fieldName}Required`);
      }
    }
    const issueDate = parseDateOnly(props.model?.issue_date);
    const startDate = parseDateOnly(props.model?.start_date);
    const endDate = parseDateOnly(props.model?.end_date);
    if (issueDate && startDate && issueDate > startDate) return t("issueDateAfterStartDate");
    if (startDate && endDate && startDate > endDate) return t("startDateAfterEndDate");
    const gross = Number(props.model?.gross_premium || 0);
    if (!Number.isFinite(gross) || gross <= 0) return t("grossPremiumRequired");
    return "";
  }

  function validateCurrentStep() {
    if (currentStep.value === 1) return validateCustomerStep();
    if (currentStep.value === 2) return validatePolicyStep();
    if (currentStep.value === 3) return validateCoverageStep();
    return "";
  }

  function onSubmit() {
    if (actionsDisabled.value) return;
    if (currentStep.value < totalSteps) {
      onNextStep();
      return;
    }
    emit?.("submit");
  }

  function onNextStep() {
    if (actionsDisabled.value) return;
    const validationError = validateCurrentStep();
    if (validationError) {
      stepError.value = validationError;
      return;
    }
    stepError.value = "";
    if (currentStep.value < totalSteps) currentStep.value += 1;
  }

  function onPreviousStep() {
    if (actionsDisabled.value) return;
    stepError.value = "";
    if (currentStep.value > 1) currentStep.value -= 1;
  }

  return {
    t,
    activeLocale: activeLocaleValue,
    customerPickerLabel,
    customerSearchPlaceholder,
    customerNoResultsText,
    customerLockedMessage,
    currentStep,
    totalSteps,
    stepError,
    actionsDisabled,
    saveButtonText,
    eyebrowText,
    titleText,
    subtitleText,
    formSteps,
    policySourceOfferFields,
    policyStepFields,
    policyCoverageFields,
    policyReviewFields,
    selectedCustomerDetails,
    selectedCustomerTypeLabel,
    selectedCustomerTaxId,
    selectedCustomerBirthDate,
    selectedCustomerPhone,
    selectedCustomerEmail,
    summaryCustomerName,
    summaryCustomerType,
    summaryCustomerTaxId,
    summaryCustomerBirthDate,
    summaryCustomerPhone,
    summaryCustomerEmail,
    onSubmit,
    onNextStep,
    onPreviousStep,
    validateCurrentStep,
  };
}
