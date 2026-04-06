import { computed } from "vue";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeIdentityNumber(value) {
  return String(value || "").replace(/\D+/g, "");
}

function normalizeCustomerType(value, identityNumber = "") {
  const normalized = String(value || "").trim();
  if (normalized === "Individual" || normalized === "Corporate") return normalized;
  return normalizeIdentityNumber(identityNumber).length === 10 ? "Corporate" : "Individual";
}

function normalizeGender(value, labelFn) {
  const normalized = String(value || "Unknown");
  if (normalized === "Male") return labelFn("genderMale");
  if (normalized === "Female") return labelFn("genderFemale");
  if (normalized === "Other") return labelFn("genderOther");
  return labelFn("genderUnknown");
}

function normalizeMaritalStatus(value, labelFn) {
  const normalized = String(value || "Unknown");
  if (normalized === "Single") return labelFn("maritalSingle");
  if (normalized === "Married") return labelFn("maritalMarried");
  if (normalized === "Divorced") return labelFn("maritalDivorced");
  if (normalized === "Widowed") return labelFn("maritalWidowed");
  return labelFn("maritalUnknown");
}

function normalizeConsentStatus(value, labelFn) {
  const normalized = String(value || "Unknown");
  if (normalized === "Granted") return labelFn("consentGranted");
  if (normalized === "Revoked") return labelFn("consentRevoked");
  return labelFn("consentUnknown");
}

function timelineTypeLabel(type, t) {
  if (type === "comment") return t("typeNote");
  if (type === "lead") return t("typeLead");
  return t("typeCommunication");
}

export function useCustomerDetailViewData({
  t,
  customer,
  customer360Payload,
  customer360Summary,
  customer360Insights,
  customer360Communication,
  customer360CrossSell,
  customerDocumentProfile,
  policies,
  offers,
  payments,
  paymentInstallments,
  claims,
  renewals,
  formatDate,
  formatDateTime,
  formatCurrency,
  stripHtml,
  describeValueBand,
  describeInsightSignal,
  assignedAgentOptions,
}) {
  const activePolicies = computed(() =>
    asArray(policies.value).filter((policy) => String(policy.status || "").toUpperCase() !== "IPT")
  );
  const openOffers = computed(() =>
    asArray(offers.value).filter((offer) => !["Rejected", "Converted"].includes(String(offer.status || "")))
  );
  const paymentPreviewRows = computed(() => asArray(payments.value).slice(0, 6));
  const paymentOverdueInstallmentCount = computed(() => Number(customer360Summary.value.overdue_installment_count || 0));
  const paymentOverdueInstallmentAmount = computed(() => Number(customer360Summary.value.overdue_installment_amount || 0));
  const paymentInstallmentsByPayment = computed(() => {
    const map = new Map();
    for (const row of asArray(paymentInstallments.value)) {
      const paymentName = String(row?.payment || "").trim();
      if (!paymentName) continue;
      const existing = map.get(paymentName) || [];
      existing.push(row);
      map.set(paymentName, existing);
    }
    return map;
  });
  const claimPreviewRows = computed(() => asArray(claims.value).slice(0, 6));
  const renewalPreviewRows = computed(() => asArray(renewals.value).slice(0, 6));
  const communicationChannelRows = computed(() => asArray(customer360Communication.value.channel_summary || []));
  const insuredAssetRows = computed(() => asArray(customer360CrossSell.value.insured_assets || []));
  const crossSellOpportunityRows = computed(() => asArray(customer360CrossSell.value.opportunity_branches || []));
  const relatedCustomerRows = computed(() => asArray(customer360CrossSell.value.related_customers || []));
  const ownershipAssignmentRows = computed(() => asArray(customer360Payload.value.operations?.assignments || []));
  const valueBandLabel = computed(() => describeValueBand(customer360Insights.value.value_band));
  const insightStrengthRows = computed(() =>
    asArray(customer360Insights.value.strengths).map((item) => describeInsightSignal(item)).filter(Boolean)
  );
  const insightRiskRows = computed(() =>
    asArray(customer360Insights.value.risks).map((item) => describeInsightSignal(item)).filter(Boolean)
  );
  const totalRiskLimit = computed(() => Number(customer360Summary.value.total_premium || 0));
  const customerHeaderSubtitle = computed(() =>
    [customer.value.email || null, customer.value.phone || customer.value.masked_phone || null].filter(Boolean).join(" / ")
  );
  const riskSummaryItems = computed(() => [
    {
      key: "activePolicyCount",
      label: t("activePolicyCount"),
      value: String(customer360Summary.value.active_policy_count || activePolicies.value.length || 0),
    },
    {
      key: "openOfferCount",
      label: t("openOfferCount"),
      value: String(customer360Summary.value.open_offer_count || openOffers.value.length || 0),
    },
    {
      key: "segment",
      label: t("segment"),
      value: customer360Insights.value.segment || "-",
    },
    {
      key: "totalRiskLimit",
      label: t("totalRiskLimit"),
      value: formatCurrency(totalRiskLimit.value, "TRY"),
    },
  ]);
  const customerHeaderSummaryItems = computed(() => [
    {
      key: "customerType",
      label: t("customerType"),
      value: customerTypeLabel.value,
    },
    ...riskSummaryItems.value,
  ]);
  const overviewSummaryCards = computed(() => {
    const firstPolicy = activePolicies.value[0];
    const firstPayment = paymentPreviewRows.value[0];
    const firstActivity = activityRows.value[0];
    const firstRelation = relatedCustomerRows.value[0];
    const firstAsset = insuredAssetRows.value[0];
    const firstAssignment = ownershipAssignmentRows.value[0];
    const totalOperations =
      relatedCustomerRows.value.length +
      insuredAssetRows.value.length +
      ownershipAssignmentRows.value.length +
      Number(customerDocumentProfile.value.total_files || 0);

    return [
      {
        key: "portfolio",
        tab: "portfolio",
        title: t("portfolioOverviewTitle"),
        subtitle: firstPolicy
          ? [firstPolicy.policy_no || firstPolicy.name, firstPolicy.branch].filter(Boolean).join(" / ")
          : t("noActivePolicy"),
        count: String(activePolicies.value.length || 0),
        facts: [
          { key: "activePolicyCount", label: t("portfolioOverviewActiveLabel"), value: String(activePolicies.value.length || 0) },
          { key: "openOfferCount", label: t("portfolioOverviewOfferLabel"), value: String(openOffers.value.length || 0) },
          { key: "renewals", label: t("portfolioOverviewRenewalLabel"), value: String(renewals.value.length || 0) },
          { key: "claims", label: t("portfolioOverviewClaimLabel"), value: String(claims.value.length || 0) },
        ],
      },
      {
        key: "payment",
        tab: "portfolio",
        title: t("paymentOverviewTitle"),
        subtitle: firstPayment
          ? [formatDate(firstPayment.payment_date), formatCurrency(firstPayment.amount_try, "TRY")].filter(Boolean).join(" / ")
          : t("noPaymentHistory"),
        count: String(payments.value.length || 0),
        facts: [
          { key: "paymentRows", label: t("paymentOverviewCountLabel"), value: String(payments.value.length || 0) },
          {
            key: "overdueInstallments",
            label: t("paymentOverviewOverdueLabel"),
            value: String(paymentOverdueInstallmentCount.value),
          },
          {
            key: "overdueAmount",
            label: t("paymentOverviewOverdueAmountLabel"),
            value: formatCurrency(paymentOverdueInstallmentAmount.value, "TRY"),
          },
        ],
      },
      {
        key: "activity",
        tab: "activity",
        title: t("activityOverviewTitle"),
        subtitle: firstActivity
          ? [firstActivity.activity_title || firstActivity.activity_type || firstActivity.name, formatDateTime(firstActivity.activity_at)].filter(Boolean).join(" / ")
          : t("noActivity"),
        count: String(
          asArray(customer360Payload.value?.operations?.activities || []).length +
            asArray(customer360Payload.value?.operations?.reminders || []).length
        ),
        facts: [
          { key: "activities", label: t("activityOverviewCountLabel"), value: String(activityRows.value.length || 0) },
          { key: "reminders", label: t("activityOverviewReminderLabel"), value: String(reminderRows.value.length || 0) },
          { key: "channels", label: t("activityOverviewChannelLabel"), value: String(communicationChannelRows.value.length || 0) },
        ],
      },
      {
        key: "operations",
        tab: "operations",
        title: t("operationsOverviewTitle"),
        subtitle: firstRelation
          ? [firstRelation.customer_name || firstRelation.related_customer || firstRelation.name, firstAsset?.asset_identifier || firstAssignment?.assigned_to].filter(Boolean).join(" / ")
          : t("noRelatedCustomer"),
        count: String(totalOperations),
        facts: [
          { key: "relations", label: t("operationsOverviewRelationLabel"), value: String(relatedCustomerRows.value.length || 0) },
          { key: "assets", label: t("operationsOverviewAssetLabel"), value: String(insuredAssetRows.value.length || 0) },
          { key: "assignments", label: t("operationsOverviewAssignmentLabel"), value: String(ownershipAssignmentRows.value.length || 0) },
          { key: "documents", label: t("operationsOverviewDocumentLabel"), value: String(customerDocumentProfile.value.total_files || 0) },
        ],
      },
    ];
  });
  const insightSummaryFields = computed(() => [
    {
      key: "segment",
      label: t("segmentScore"),
      value: customer360Insights.value.segment || "-",
      variant: "default",
    },
    {
      key: "score",
      label: t("score"),
      value: String(customer360Insights.value.score ?? "-"),
      variant: "lg",
    },
    {
      key: "claimRisk",
      label: t("claimRisk"),
      value: customer360Insights.value.claim_risk || "-",
      variant: "default",
    },
    {
      key: "valueBand",
      label: t("valueBand"),
      value: valueBandLabel.value || "-",
      variant: "accent",
    },
  ]);
  const insightContextFields = computed(() => [
    {
      key: "strengths",
      label: t("portfolioStrengths"),
      variant: "badges",
      badges: insightStrengthRows.value.length
        ? insightStrengthRows.value.map((label) => ({ label, color: "green" }))
        : [{ label: t("noStrengthSignal"), color: "gray" }],
    },
    {
      key: "risks",
      label: t("portfolioRisks"),
      variant: "badges",
      badges: insightRiskRows.value.length
        ? insightRiskRows.value.map((label) => ({ label, color: "red" }))
        : [{ label: t("noRiskSignal"), color: "gray" }],
    },
    {
      key: "snapshotDate",
      label: t("snapshotDate"),
      value: formatDate(customer360Insights.value.snapshot_date),
      variant: "default",
    },
    {
      key: "sourceVersion",
      label: t("sourceVersion"),
      value: customer360Insights.value.source_version || "-",
      variant: "default",
    },
  ]);
  const crossSellSummaryFields = computed(() => [
    {
      key: "opportunityCount",
      label: t("crossSellOpportunityCount"),
      value: String(crossSellOpportunityRows.value.length || 0),
      variant: "lg",
    },
    {
      key: "portfolioBranches",
      label: t("crossSellOpportunityBranches"),
      variant: "badges",
      badges: crossSellOpportunityRows.value.length
        ? crossSellOpportunityRows.value.map((item) => ({
            label: String(item.label || item.branch || "-"),
            color: "blue",
          }))
        : [{ label: t("noCrossSellOpportunity"), color: "gray" }],
    },
  ]);
  const crossSellOpportunityFields = computed(() =>
    crossSellOpportunityRows.value.map((item, index) => ({
      key: `${item.branch || item.label || "branch"}:${index}`,
      label: String(item.label || item.branch || "-"),
      value: t("crossSellOpportunityMeta"),
      variant: "default",
    }))
  );
  const documentSummaryFields = computed(() => [
    {
      key: "totalDocuments",
      label: t("totalDocuments"),
      value: String(customerDocumentProfile.value.total_files || 0),
      variant: "lg",
    },
    {
      key: "pdfDocuments",
      label: t("pdfDocuments"),
      value: String(customerDocumentProfile.value.pdf_count || 0),
      variant: "default",
    },
    {
      key: "imageDocuments",
      label: t("imageDocuments"),
      value: String(customerDocumentProfile.value.image_count || 0),
      variant: "default",
    },
    {
      key: "spreadsheetDocuments",
      label: t("spreadsheetDocuments"),
      value: String(customerDocumentProfile.value.spreadsheet_count || 0),
      variant: "default",
    },
    {
      key: "otherDocuments",
      label: t("otherDocuments"),
      value: String(customerDocumentProfile.value.other_count || 0),
      variant: "default",
    },
    {
      key: "lastUpload",
      label: t("lastUpload"),
      value: formatDate(customerDocumentProfile.value.last_uploaded_on),
      variant: "default",
    },
  ]);
  const customerTypeValue = computed(() => normalizeCustomerType(customer.value.customer_type, customer.value.tax_id));
  const isCorporateCustomer = computed(() => customerTypeValue.value === "Corporate");
  const customerTypeLabel = computed(() =>
    isCorporateCustomer.value ? t("customerTypeCorporate") : t("customerTypeIndividual")
  );
  const customerTaxIdLabel = computed(() => (isCorporateCustomer.value ? t("taxNumber") : t("nationalId")));
  const customerTaxIdDisplay = computed(() => customer.value.tax_id || customer.value.masked_tax_id || "-");
  const customerPhoneDisplay = computed(() => customer.value.phone || customer.value.masked_phone || "-");
  const genderLabel = computed(() => normalizeGender(customer.value.gender, t));
  const maritalStatusLabel = computed(() => normalizeMaritalStatus(customer.value.marital_status, t));
  const consentStatusLabel = computed(() => normalizeConsentStatus(customer.value.consent_status, t));
  const genderOptions = computed(() => [
    { value: "Unknown", label: t("genderUnknown") },
    { value: "Male", label: t("genderMale") },
    { value: "Female", label: t("genderFemale") },
    { value: "Other", label: t("genderOther") },
  ]);
  const maritalStatusOptions = computed(() => [
    { value: "Unknown", label: t("maritalUnknown") },
    { value: "Single", label: t("maritalSingle") },
    { value: "Married", label: t("maritalMarried") },
    { value: "Divorced", label: t("maritalDivorced") },
    { value: "Widowed", label: t("maritalWidowed") },
  ]);
  const consentStatusOptions = computed(() => [
    { value: "Unknown", label: t("consentUnknown") },
    { value: "Granted", label: t("consentGranted") },
    { value: "Revoked", label: t("consentRevoked") },
  ]);
  const assignedAgentLabelMap = computed(() => {
    const map = new Map();
    for (const option of asArray(assignedAgentOptions?.value || [])) {
      const key = String(option?.value || "").trim();
      if (!key) continue;
      map.set(key, String(option?.label || key));
    }
    return map;
  });
  const assignedAgentDisplay = computed(() => {
    const key = String(customer.value.assigned_agent || "").trim();
    if (!key) return "-";
    return assignedAgentLabelMap.value.get(key) || key;
  });
  const profileViewFields = computed(() => [
    { key: "full_name", label: t("fullName"), value: customer.value.full_name || "-", variant: "lg", span: 2 },
    { key: "birth_date", label: t("birthDate"), value: isCorporateCustomer.value ? "-" : formatDate(customer.value.birth_date), variant: "default" },
    { key: "gender", label: t("gender"), value: isCorporateCustomer.value ? "-" : genderLabel.value, variant: "default" },
    { key: "marital_status", label: t("maritalStatus"), value: isCorporateCustomer.value ? "-" : maritalStatusLabel.value, variant: "default" },
    { key: "address", label: t("address"), value: customer.value.address || "-", variant: "muted", span: 2 },
    { key: "mobile_phone", label: t("mobilePhone"), value: customerPhoneDisplay.value, variant: "default" },
    { key: "email", label: t("email"), value: customer.value.email || "-", variant: "default" },
    { key: "occupation", label: t("occupation"), value: isCorporateCustomer.value ? "-" : customer.value.occupation || "-", variant: "default" },
    { key: "assigned_agent", label: t("assignedAgent"), value: assignedAgentDisplay.value, variant: "default" },
    { key: "consent_status", label: t("consentStatus"), value: consentStatusLabel.value, variant: "default" },
    { key: "customer_folder", label: t("customerFolder"), value: customer.value.customer_folder || "-", variant: "default" },
  ]);
  const profileEditFields = computed(() => [
    { key: "full_name", label: t("fullName"), model: "full_name", type: "text", span: 2 },
    { key: "birth_date", label: t("birthDate"), model: "birth_date", type: "date", disabled: isCorporateCustomer.value },
    { key: "gender", label: t("gender"), model: "gender", type: "select", options: genderOptions.value, disabled: isCorporateCustomer.value },
    { key: "marital_status", label: t("maritalStatus"), model: "marital_status", type: "select", options: maritalStatusOptions.value, disabled: isCorporateCustomer.value },
    { key: "address", label: t("address"), model: "address", type: "textarea", span: 2, rows: 3 },
    { key: "mobile_phone", label: t("mobilePhone"), model: "phone", type: "text" },
    { key: "email", label: t("email"), model: "email", type: "email" },
    { key: "occupation", label: t("occupation"), model: "occupation", type: "text", disabled: isCorporateCustomer.value },
    {
      key: "assigned_agent",
      label: t("assignedAgent"),
      model: "assigned_agent",
      type: "select",
      options: asArray(assignedAgentOptions?.value || []),
    },
    { key: "consent_status", label: t("consentStatus"), model: "consent_status", type: "select", options: consentStatusOptions.value },
    { key: "customer_folder", label: t("customerFolder"), type: "static", value: customer.value.customer_folder || "-" },
  ]);
  const timelineRows = computed(() =>
    asArray(customer360Communication.value.timeline || [])
      .map((item, index) => ({
        key: `${item.type || "timeline"}:${item.payload?.name || index}`,
        date: item.timestamp,
        title: timelineTypeLabel(item.type, t),
        body: stripHtml(item.meta) || stripHtml(item.title) || "-",
        actor: item.payload?.comment_by || item.payload?.sender || "-",
        dotClass: item.type === "comment" ? "bg-amber-500" : "bg-sky-500",
      }))
      .filter((item) => Boolean(item.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  );
  const activityRows = computed(() => asArray(customer360Payload.value?.operations?.activities || []).slice(0, 6));
  const reminderRows = computed(() => asArray(customer360Payload.value?.operations?.reminders || []).slice(0, 6));

  return {
    activePolicies,
    openOffers,
    paymentPreviewRows,
    paymentOverdueInstallmentCount,
    paymentOverdueInstallmentAmount,
    paymentInstallmentsByPayment,
    claimPreviewRows,
    renewalPreviewRows,
    communicationChannelRows,
    insuredAssetRows,
    crossSellOpportunityRows,
    relatedCustomerRows,
    ownershipAssignmentRows,
    valueBandLabel,
    totalRiskLimit,
    insightStrengthRows,
    insightRiskRows,
    customerHeaderSubtitle,
    riskSummaryItems,
    customerHeaderSummaryItems,
    overviewSummaryCards,
    insightSummaryFields,
    insightContextFields,
    crossSellSummaryFields,
    crossSellOpportunityFields,
    documentSummaryFields,
    customerTypeValue,
    isCorporateCustomer,
    customerTypeLabel,
    customerTaxIdLabel,
    customerTaxIdDisplay,
    customerPhoneDisplay,
    genderLabel,
    maritalStatusLabel,
    consentStatusLabel,
    genderOptions,
    maritalStatusOptions,
    consentStatusOptions,
    profileViewFields,
    profileEditFields,
    timelineRows,
    activityRows,
    reminderRows,
  };
}
