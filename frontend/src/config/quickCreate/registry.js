function i18nLabel(en, tr) {
  return { en, tr };
}

function option(value, en, tr) {
  return { value, label: i18nLabel(en, tr) };
}

function hasValue(value) {
  return String(value ?? "").trim() !== "";
}

function isCorporateCustomer(model, fieldName = "customer_type") {
  return String(model?.[fieldName] || "Individual") === "Corporate";
}

export const quickCreateRegistry = {
  offer: {
    key: "offer",
    title: i18nLabel("Detailed Quick Offer", "Detaylı Hızlı Teklif"),
    subtitle: i18nLabel("Create a draft offer with customer, product and financial fields", "Müşteri, ürün ve finans alanlarıyla taslak teklif oluştur"),
    submitUrl: "acentem_takipte.doctype.at_offer.at_offer.create_quick_offer",
    resultKey: "offer",
    openRouteName: "offer-detail",
    successRefreshTargets: ["offer_list", "offer_board"],
    defaults: {
      customer_type: "Individual",
      tax_id: "",
      phone: "",
      email: "",
      branch: "",
      insurance_company: "",
      sales_entity: "",
      offer_date: "",
      valid_until: "",
      currency: "TRY",
      status: "Draft",
      gross_premium: "",
      net_premium: "",
      tax_amount: "0",
      commission_amount: "0",
      notes: "",
    },
    fields: [
      { name: "sales_entity", type: "select", label: i18nLabel("Sales Entity", "Satış Birimi"), optionsSource: "salesEntities", fullWidth: false },
      { name: "insurance_company", type: "select", label: i18nLabel("Insurance Company", "Sigorta Şirketi"), optionsSource: "insuranceCompanies", fullWidth: false },
      { name: "branch", type: "select", label: i18nLabel("Insurance Branch", "Sigorta Branşı"), optionsSource: "branches", fullWidth: false },
      {
        name: "customer_type",
        type: "select",
        label: i18nLabel("Customer Type", "Müşteri Tipi"),
        required: ({ model }) => !hasValue(model?.customerOption?.value) && hasValue(model?.queryText),
        disabled: ({ model }) => hasValue(model?.customerOption?.value),
        options: [
          option("Individual", "Individual", "Bireysel"),
          option("Corporate", "Corporate", "Kurumsal"),
        ],
        fullWidth: false,
      },
      {
        name: "tax_id",
        type: "text",
        required: ({ model }) => !hasValue(model?.customerOption?.value) && hasValue(model?.queryText),
        disabled: ({ model }) => hasValue(model?.customerOption?.value),
        label: ({ model, locale }) =>
          isCorporateCustomer(model)
            ? locale === "tr"
              ? "Vergi No"
              : "Tax Number"
            : locale === "tr"
              ? "TC Kimlik No"
              : "National ID Number",
        help: ({ model, locale }) =>
          isCorporateCustomer(model)
            ? locale === "tr"
              ? "10 haneli vergi numarası girin."
              : "Enter a 10-digit tax number."
            : locale === "tr"
              ? "11 haneli T.C. kimlik numarası girin."
              : "Enter an 11-digit Turkish national ID number.",
        fullWidth: false,
      },
      { name: "phone", type: "text", label: i18nLabel("Phone", "Telefon"), disabled: ({ model }) => hasValue(model?.customerOption?.value), fullWidth: false },
      { name: "email", type: "email", label: i18nLabel("Email", "E-posta"), disabled: ({ model }) => hasValue(model?.customerOption?.value), fullWidth: false },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Draft", "Draft", "Taslak"),
        option("Sent", "Sent", "Müşteriye Gönderildi"),
        option("Accepted", "Accepted", "Kabul Edildi"),
        option("Rejected", "Rejected", "Reddedildi"),
      ], fullWidth: false },
      { name: "offer_date", type: "date", label: i18nLabel("Offer Date", "Teklif Tarihi"), fullWidth: false },
      { name: "valid_until", type: "date", label: i18nLabel("Valid Until", "Geçerlilik Tarihi"), fullWidth: false },
      { name: "currency", type: "select", label: i18nLabel("Currency", "Döviz"), options: [option("TRY", "TRY", "TRY"), option("USD", "USD", "USD"), option("EUR", "EUR", "EUR")], fullWidth: false },
      { name: "gross_premium", type: "number", label: i18nLabel("Gross Premium", "Brüt Prim"), min: 0, step: "0.01", fullWidth: false },
      { name: "net_premium", type: "number", label: i18nLabel("Net Premium", "Net Prim"), min: 0, step: "0.01", fullWidth: false },
      { name: "tax_amount", type: "number", label: i18nLabel("Tax Amount", "Vergi Tutarı"), min: 0, step: "0.01", fullWidth: false },
      { name: "commission_amount", type: "number", label: i18nLabel("Commission Amount", "Komisyon Tutarı"), min: 0, step: "0.01", fullWidth: false },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Açıklama / Not"), rows: 3, fullWidth: true },
    ],
  },
  policy: {
    key: "policy",
    title: i18nLabel("Quick Policy Entry", "Hızlı Poliçe Kaydı"),
    subtitle: i18nLabel("Create a policy with an auto-generated record number and an optional carrier policy number", "Sistem kayıt numarası otomatik üretilir, şirket poliçe numarası opsiyoneldir"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_policy",
    resultKey: "policy",
    openRouteName: "policy-detail",
    successRefreshTargets: ["policy_list"],
    defaults: {
      customer: "",
      customer_full_name: "",
      customer_type: "Individual",
      customer_tax_id: "",
      customer_phone: "",
      customer_email: "",
      customer_birth_date: "",
      sales_entity: "",
      insurance_company: "",
      branch: "",
      policy_no: "",
      source_offer: "",
      status: "Active",
      issue_date: "",
      start_date: "",
      end_date: "",
      currency: "TRY",
      gross_premium: "",
      net_premium: "",
      tax_amount: "0",
      commission_amount: "0",
      notes: "",
    },
    fields: [
      {
        name: "customer",
        type: "select",
        label: i18nLabel("Customer", "Müşteri"),
        optionsSource: "customers",
        disabled: ({ model }) => hasValue(model?.source_offer),
      },
      {
        name: "customer_full_name",
        type: "text",
        label: i18nLabel("New Customer Name", "Yeni Müşteri Adı"),
        required: ({ model }) => !hasValue(model?.customer) && !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.customer) || hasValue(model?.source_offer),
      },
      {
        name: "customer_type",
        type: "select",
        label: i18nLabel("Customer Type", "Müşteri Tipi"),
        required: ({ model }) => !hasValue(model?.customer) && !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.customer) || hasValue(model?.source_offer),
        options: [
          option("Individual", "Individual", "Bireysel"),
          option("Corporate", "Corporate", "Kurumsal"),
        ],
      },
      {
        name: "customer_tax_id",
        type: "text",
        required: ({ model }) => !hasValue(model?.customer) && !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.customer) || hasValue(model?.source_offer),
        label: ({ model, locale }) =>
          isCorporateCustomer(model)
            ? locale === "tr"
              ? "Vergi No"
              : "Tax Number"
            : locale === "tr"
              ? "TC Kimlik No"
              : "National ID Number",
        help: ({ model, locale }) =>
          isCorporateCustomer(model)
            ? locale === "tr"
              ? "10 haneli vergi numarası girin."
              : "Enter a 10-digit tax number."
            : locale === "tr"
              ? "11 haneli T.C. kimlik numarası girin."
              : "Enter an 11-digit Turkish national ID number.",
      },
      {
        name: "customer_phone",
        type: "text",
        label: i18nLabel("Phone", "Telefon"),
        disabled: ({ model }) => hasValue(model?.customer) || hasValue(model?.source_offer),
      },
      {
        name: "customer_email",
        type: "email",
        label: i18nLabel("Email", "E-posta"),
        disabled: ({ model }) => hasValue(model?.customer) || hasValue(model?.source_offer),
      },
      {
        name: "sales_entity",
        type: "select",
        label: i18nLabel("Sales Entity", "Satış Birimi"),
        optionsSource: "salesEntities",
        required: ({ model }) => !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.source_offer),
      },
      {
        name: "insurance_company",
        type: "select",
        label: i18nLabel("Insurance Company", "Sigorta Şirketi"),
        optionsSource: "insuranceCompanies",
        required: ({ model }) => !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.source_offer),
      },
      {
        name: "branch",
        type: "select",
        label: i18nLabel("Insurance Branch", "Sigorta Branşı"),
        optionsSource: "branches",
        required: ({ model }) => !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.source_offer),
      },
      { name: "policy_no", type: "text", label: i18nLabel("Carrier Policy Number", "Sigorta Şirketi Poliçe No") },
      { name: "source_offer", type: "select", label: i18nLabel("Source Offer", "Kaynak Teklif"), optionsSource: "offers" },
      {
        name: "status",
        type: "select",
        label: i18nLabel("Status", "Durum"),
        required: ({ model }) => !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.source_offer),
        options: [
          option("Active", "Active", "Aktif"),
          option("KYT", "KYT", "KYT"),
          option("IPT", "IPT", "IPT"),
        ],
      },
      {
        name: "issue_date",
        type: "date",
        label: i18nLabel("Issue Date", "Tanzim Tarihi"),
        required: ({ model }) => !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.source_offer),
      },
      {
        name: "start_date",
        type: "date",
        label: i18nLabel("Start Date", "Başlangıç"),
        required: ({ model }) => !hasValue(model?.source_offer),
      },
      {
        name: "end_date",
        type: "date",
        label: i18nLabel("End Date", "Bitiş"),
        required: ({ model }) => !hasValue(model?.source_offer),
      },
      {
        name: "currency",
        type: "select",
        label: i18nLabel("Currency", "Döviz"),
        required: ({ model }) => !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.source_offer),
        options: [option("TRY", "TRY", "TRY"), option("USD", "USD", "USD"), option("EUR", "EUR", "EUR")],
      },
      {
        name: "gross_premium",
        type: "number",
        label: i18nLabel("Gross Premium", "Brüt Prim"),
        required: ({ model }) => !hasValue(model?.source_offer),
        disabled: ({ model }) => hasValue(model?.source_offer),
        min: 0,
        step: "0.01",
      },
      { name: "net_premium", type: "number", label: i18nLabel("Net Premium", "Net Prim"), min: 0, step: "0.01" },
      { name: "tax_amount", type: "number", label: i18nLabel("Tax Amount", "Vergi Tutarı"), min: 0, step: "0.01" },
      { name: "commission_amount", type: "number", label: i18nLabel("Commission Amount", "Komisyon Tutarı"), min: 0, step: "0.01" },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  lead: {
    key: "lead",
    title: i18nLabel("Quick Lead", "Hızlı Lead Oluştur"),
    subtitle: i18nLabel("Create a lead with sales and potential details", "Temel satış ve potansiyel bilgileriyle fırsat oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_lead",
    resultKey: "lead",
    openRouteName: "lead-detail",
    successRefreshTargets: ["lead_list"],
    defaults: {
      first_name: "",
      last_name: "",
      customer_type: "Individual",
      phone: "",
      tax_id: "",
      email: "",
      status: "Open",
      customer: "",
      sales_entity: "",
      insurance_company: "",
      branch: "",
      estimated_gross_premium: "",
      notes: "",
    },
    fields: [
      { name: "first_name", type: "text", label: i18nLabel("First Name", "Ad"), required: true },
      { name: "last_name", type: "text", label: i18nLabel("Last Name", "Soyad") },
      {
        name: "customer_type",
        type: "select",
        label: i18nLabel("Customer Type", "Müşteri Tipi"),
        options: [
          option("Individual", "Individual", "Bireysel"),
          option("Corporate", "Corporate", "Kurumsal"),
        ],
      },
      { name: "phone", type: "text", label: i18nLabel("Phone", "Telefon") },
      {
        name: "tax_id",
        type: "text",
        label: ({ model, locale }) =>
          isCorporateCustomer(model)
            ? locale === "tr"
              ? "Vergi No"
              : "Tax Number"
            : locale === "tr"
              ? "TC Kimlik No"
              : "National ID Number",
        help: ({ model, locale }) =>
          isCorporateCustomer(model)
            ? locale === "tr"
              ? "10 haneli vergi numarası girin."
              : "Enter a 10-digit tax number."
            : locale === "tr"
              ? "11 haneli T.C. kimlik numarası girin."
              : "Enter an 11-digit Turkish national ID number.",
      },
      { name: "email", type: "email", label: i18nLabel("Email", "E-posta") },
      { name: "status", type: "select", label: i18nLabel("Lead Status", "Lead Durumu"), options: [
        option("Draft", "Draft", "Taslak"),
        option("Open", "Open", "Açık"),
      ] },
      { name: "customer", type: "select", label: i18nLabel("Customer (Optional)", "Müşteri (Opsiyonel)"), optionsSource: "customers" },
      { name: "sales_entity", type: "select", label: i18nLabel("Sales Entity", "Satış Birimi"), optionsSource: "salesEntities" },
      { name: "insurance_company", type: "select", label: i18nLabel("Insurance Company", "Sigorta Şirketi"), optionsSource: "insuranceCompanies" },
      { name: "branch", type: "select", label: i18nLabel("Branch", "Branş"), optionsSource: "branches" },
      { name: "estimated_gross_premium", type: "number", label: i18nLabel("Estimated Gross Premium", "Tahmini Brüt Prim"), min: 0, step: "0.01" },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  customer: {
    key: "customer",
    title: i18nLabel("Quick Customer", "Hızlı Müşteri Oluştur"),
    subtitle: i18nLabel("Create a customer with insured profile fields", "Sigortalı bilgileriyle müşteri kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_customer",
    resultKey: "customer",
    openRouteName: "customer-detail",
    successRefreshTargets: ["customer_list"],
    defaults: {
      full_name: "",
      tax_id: "",
      phone: "",
      email: "",
      address: "",
      birth_date: "",
      gender: "Unknown",
      marital_status: "Unknown",
      occupation: "",
      consent_status: "Unknown",
      assigned_agent: "",
    },
    fields: [
      { name: "full_name", type: "text", label: i18nLabel("Full Name", "Ad Soyad"), required: true, fullWidth: true },
      { name: "tax_id", type: "text", label: i18nLabel("Tax ID", "TC/VKN"), required: true },
      { name: "birth_date", type: "date", label: i18nLabel("Birth Date", "Doğum Tarihi") },
      { name: "phone", type: "text", label: i18nLabel("Phone", "Telefon") },
      { name: "email", type: "email", label: i18nLabel("Email", "E-posta") },
      { name: "gender", type: "select", label: i18nLabel("Gender", "Cinsiyet"), options: [
        option("Unknown", "Unknown", "Bilinmiyor"),
        option("Male", "Male", "Erkek"),
        option("Female", "Female", "Kadın"),
        option("Other", "Other", "Diğer"),
      ] },
      { name: "marital_status", type: "select", label: i18nLabel("Marital Status", "Medeni Durumu"), options: [
        option("Unknown", "Unknown", "Bilinmiyor"),
        option("Single", "Single", "Bekar"),
        option("Married", "Married", "Evli"),
        option("Divorced", "Divorced", "Boşanmış"),
        option("Widowed", "Widowed", "Dul"),
      ] },
      { name: "consent_status", type: "select", label: i18nLabel("Consent Status", "İzin Durumu"), options: [
        option("Unknown", "Unknown", "Bilinmiyor"),
        option("Granted", "Granted", "Onaylı"),
        option("Revoked", "Revoked", "İptal"),
      ] },
      { name: "assigned_agent", type: "text", label: i18nLabel("Assigned Agent (User)", "Temsilci (User)") },
      { name: "occupation", type: "text", label: i18nLabel("Occupation", "Meslek"), fullWidth: true },
      { name: "address", type: "textarea", label: i18nLabel("Address", "Adres"), rows: 3, fullWidth: true },
    ],
  },
  claim: {
    key: "claim",
    title: i18nLabel("Quick Claim", "Hızlı Hasar Aç"),
    subtitle: i18nLabel("Create a claim linked to a policy", "Poliçeye bağlı hasar kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_claim",
    resultKey: "claim",
    successRefreshTargets: ["claim_list"],
    defaults: {
      policy: "",
      customer: "",
      claim_no: "",
      claim_type: "Damage",
      claim_status: "Open",
      incident_date: "",
      reported_date: "",
      currency: "TRY",
      estimated_amount: "",
      approved_amount: "",
      notes: "",
    },
    fields: [
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies", required: true },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers", required: true },
      { name: "claim_no", type: "text", label: i18nLabel("Claim Number", "Hasar No") },
      { name: "claim_type", type: "select", label: i18nLabel("Claim Type", "Hasar Türü"), options: [
        option("Damage", "Damage", "Hasar"),
        option("Health", "Health", "Sağlık"),
        option("Theft", "Theft", "Hirsizlik"),
        option("Liability", "Liability", "Sorumluluk"),
        option("Other", "Other", "Diğer"),
      ] },
      { name: "claim_status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Draft", "Draft", "Taslak"),
        option("Open", "Open", "Açık"),
        option("Under Review", "Under Review", "İnceleme"),
        option("Approved", "Approved", "Onaylandı"),
        option("Rejected", "Rejected", "Reddedildi"),
      ] },
      { name: "incident_date", type: "date", label: i18nLabel("Incident Date", "Hasar Tarihi"), required: true },
      { name: "reported_date", type: "date", label: i18nLabel("Reported Date", "Bildirim Tarihi"), required: true },
      { name: "currency", type: "select", label: i18nLabel("Currency", "Döviz"), options: [option("TRY", "TRY", "TRY"), option("USD", "USD", "USD"), option("EUR", "EUR", "EUR")] },
      { name: "estimated_amount", type: "number", label: i18nLabel("Estimated Amount", "Talep Tutarı"), min: 0, step: "0.01" },
      { name: "approved_amount", type: "number", label: i18nLabel("Approved Amount", "Onaylanan Tutar"), min: 0, step: "0.01" },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Açıklama"), rows: 3, fullWidth: true },
    ],
  },
  payment: {
    key: "payment",
    title: i18nLabel("Quick Payment", "Hızlı Ödeme/Tahsilat"),
    subtitle: i18nLabel("Create an inbound or outbound payment record", "Tahsilat veya ödeme hareketi oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_payment",
    resultKey: "payment",
    successRefreshTargets: ["payment_list"],
    defaults: {
      customer: "",
      policy: "",
      claim: "",
      sales_entity: "",
      payment_direction: "Inbound",
      payment_purpose: "Premium Collection",
      status: "Draft",
      payment_date: "",
      due_date: "",
      installment_count: "1",
      installment_interval_days: "30",
      currency: "TRY",
      amount: "",
      reference_no: "",
      notes: "",
    },
    fields: [
      { name: "payment_direction", type: "select", label: i18nLabel("Direction", "Yön"), options: [
        option("Inbound", "Inbound", "Tahsilat"),
        option("Outbound", "Outbound", "Ödeme"),
      ] },
      { name: "payment_purpose", type: "select", label: i18nLabel("Purpose", "Amaç"), options: [
        option("Premium Collection", "Premium Collection", "Prim Tahsilatı"),
        option("Commission Payout", "Commission Payout", "Komisyon Ödemesi"),
        option("Claim Payout", "Claim Payout", "Hasar Ödemesi"),
        option("Other", "Other", "Diğer"),
      ] },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers", required: true },
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies" },
      { name: "claim", type: "select", label: i18nLabel("Claim", "Hasar"), optionsSource: "claims" },
      { name: "sales_entity", type: "select", label: i18nLabel("Sales Entity", "Satış Birimi"), optionsSource: "salesEntities" },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Draft", "Draft", "Taslak"),
        option("Paid", "Paid", "Ödendi"),
        option("Cancelled", "Cancelled", "İptal"),
      ] },
      { name: "payment_date", type: "date", label: i18nLabel("Payment Date", "Tarih"), required: true },
      { name: "due_date", type: "date", label: i18nLabel("Due Date", "Vade") },
      { name: "installment_count", type: "number", label: i18nLabel("Installment Count", "Taksit Sayısı"), min: 1, step: "1" },
      { name: "installment_interval_days", type: "number", label: i18nLabel("Installment Interval (Days)", "Taksit Aralığı (Gün)"), min: 1, step: "1" },
      { name: "currency", type: "select", label: i18nLabel("Currency", "Döviz"), options: [option("TRY", "TRY", "TRY"), option("USD", "USD", "USD"), option("EUR", "EUR", "EUR")] },
      { name: "amount", type: "number", label: i18nLabel("Amount", "Tutar"), required: true, min: 0.01, step: "0.01" },
      { name: "reference_no", type: "text", label: i18nLabel("External Reference", "Dış Referans") },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Açıklama"), rows: 3, fullWidth: true },
    ],
  },
  renewal_task: {
    key: "renewal_task",
    title: i18nLabel("Quick Renewal Task", "Hızlı Yenileme Görevi"),
    subtitle: i18nLabel("Create a policy renewal follow-up task", "Poliçeye bağlı yenileme takip görevi oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_renewal_task",
    resultKey: "renewal_task",
    openRouteName: "tasks-detail",
    successRefreshTargets: ["renewal_list"],
    defaults: {
      policy: "",
      customer: "",
      renewal_date: "",
      due_date: "",
      status: "Open",
      lost_reason_code: "",
      competitor_name: "",
      assigned_to: "",
      notes: "",
      auto_created: false,
    },
    fields: [
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies", required: true },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers", required: true },
      { name: "renewal_date", type: "date", label: i18nLabel("Renewal Date", "Yenileme Tarihi"), required: true },
      { name: "due_date", type: "date", label: i18nLabel("Due Date", "Son Tarih"), required: true },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Open", "Open", "Açık"),
        option("In Progress", "In Progress", "Devam Ediyor"),
        option("Done", "Done", "Tamamlandı"),
        option("Cancelled", "Cancelled", "İptal"),
      ] },
      { name: "lost_reason_code", type: "select", label: i18nLabel("Lost Reason", "Kayıp Sebebi"), options: [
        option("", "Blank", "Boş Bırak"),
        option("Price", "Price", "Fiyat"),
        option("Competitor", "Competitor", "Rakip"),
        option("Service", "Service", "Hizmet"),
        option("Customer Declined", "Customer Declined", "Müşteri Vazgeçti"),
        option("Coverage Mismatch", "Coverage Mismatch", "Teminat Uyumsuzluğu"),
        option("Other", "Other", "Diğer"),
      ] },
      { name: "competitor_name", type: "text", label: i18nLabel("Competitor Name", "Rakip Adı"), fullWidth: true },
      { name: "assigned_to", type: "text", label: i18nLabel("Assigned To (User)", "Atanan Kişi (User)") },
      { name: "auto_created", type: "checkbox", label: i18nLabel("Auto Created", "Otomatik Oluşturuldu") },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  customer_relation: {
    key: "customer_relation",
    title: i18nLabel("Quick Customer Relation", "Hızlı Müşteri İlişkisi"),
    subtitle: i18nLabel("Create a relationship between customers", "Müşteriler arası ilişki kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_customer_relation",
    resultKey: "customer_relation",
    openRouteName: "customer-relations-detail",
    successRefreshTargets: ["customer-relations-list"],
    defaults: {
      customer: "",
      related_customer: "",
      relation_type: "Other",
      is_household: false,
      notes: "",
    },
    fields: [
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers", required: true },
      { name: "related_customer", type: "select", label: i18nLabel("Related Customer", "İlişkili Müşteri"), optionsSource: "customers", required: true },
      { name: "relation_type", type: "select", label: i18nLabel("Relation Type", "İlişki Turu"), options: [
        option("Spouse", "Spouse", "Es"),
        option("Child", "Child", "Cocuk"),
        option("Parent", "Parent", "Ebeveyn"),
        option("Sibling", "Sibling", "Kardes"),
        option("Partner", "Partner", "Partner"),
        option("Household", "Household", "Hane"),
        option("Other", "Other", "Diğer"),
      ] },
      { name: "is_household", type: "checkbox", label: i18nLabel("Same Household", "Aynı Hane") },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  insured_asset: {
    key: "insured_asset",
    title: i18nLabel("Quick Insured Asset", "Hızlı Sigortalanan Varlık"),
    subtitle: i18nLabel("Create an insured asset linked to a customer", "Müşteriye bağlı sigortalanan varlık kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_insured_asset",
    resultKey: "insured_asset",
    openRouteName: "insured-assets-detail",
    successRefreshTargets: ["insured-assets-list"],
    defaults: {
      customer: "",
      policy: "",
      asset_type: "Other",
      asset_label: "",
      asset_identifier: "",
      notes: "",
    },
    fields: [
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers", required: true },
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies" },
      { name: "asset_type", type: "select", label: i18nLabel("Asset Type", "Varlık Turu"), options: [
        option("Vehicle", "Vehicle", "Araç"),
        option("Home", "Home", "Konut"),
        option("Health Person", "Health Person", "Sağlık Kişisi"),
        option("Workplace", "Workplace", "İşyeri"),
        option("Travel", "Travel", "Seyahat"),
        option("Boat", "Boat", "Tekne"),
        option("Farm", "Farm", "Tarım"),
        option("Other", "Other", "Diğer"),
      ] },
      { name: "asset_label", type: "text", label: i18nLabel("Asset Label", "Varlık Başlığı"), required: true, fullWidth: true },
      { name: "asset_identifier", type: "text", label: i18nLabel("Asset Identifier", "Varlık Kimliği"), fullWidth: true },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  call_note: {
    key: "call_note",
    title: i18nLabel("Quick Call Note", "Hızlı Arama Notu"),
    subtitle: i18nLabel("Create a phone interaction record", "Müşteriyle yapılan arama kaydını oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_call_note",
    resultKey: "call_note",
    openRouteName: "call-notes-detail",
    successRefreshTargets: ["call-notes-list"],
    defaults: {
      customer: "",
      policy: "",
      claim: "",
      channel: "Phone Call",
      direction: "Outbound",
      call_status: "Completed",
      call_outcome: "",
      note_at: "",
      next_follow_up_on: "",
      notes: "",
    },
    fields: [
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers", required: true },
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies" },
      { name: "claim", type: "select", label: i18nLabel("Claim", "Hasar"), optionsSource: "claims" },
      { name: "channel", type: "select", label: i18nLabel("Channel", "Kanal"), options: [
        option("Phone Call", "Phone Call", "Telefon"),
        option("WhatsApp Call", "WhatsApp Call", "WhatsApp Arama"),
        option("Video Call", "Video Call", "Görüntülü Arama"),
        option("Other", "Other", "Diğer"),
      ] },
      { name: "direction", type: "select", label: i18nLabel("Direction", "Yön"), options: [
        option("Inbound", "Inbound", "Gelen"),
        option("Outbound", "Outbound", "Giden"),
      ] },
      { name: "call_status", type: "select", label: i18nLabel("Call Status", "Arama Durumu"), options: [
        option("Planned", "Planned", "Planlandı"),
        option("Completed", "Completed", "Tamamlandı"),
        option("Missed", "Missed", "Kaçırıldı"),
        option("No Answer", "No Answer", "Ulaşılamadı"),
        option("Cancelled", "Cancelled", "İptal"),
      ] },
      { name: "call_outcome", type: "text", label: i18nLabel("Call Outcome", "Arama Sonucu"), fullWidth: true },
      { name: "note_at", type: "datetime", label: i18nLabel("Note At", "Not Zamanı"), required: true },
      { name: "next_follow_up_on", type: "date", label: i18nLabel("Next Follow Up", "Sonraki Takip") },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  segment: {
    key: "segment",
    title: i18nLabel("Quick Segment", "Hızlı Segment"),
    subtitle: i18nLabel("Create a campaign target segment", "Kampanya hedef segmenti oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_segment",
    resultKey: "segment",
    openRouteName: "segments-detail",
    successRefreshTargets: ["segments-list"],
    defaults: {
      segment_name: "",
      segment_type: "Static",
      channel_focus: "WHATSAPP",
      status: "Draft",
      criteria_json: "",
      notes: "",
    },
    fields: [
      { name: "segment_name", type: "text", label: i18nLabel("Segment Name", "Segment Adı"), required: true, fullWidth: true },
      { name: "segment_type", type: "select", label: i18nLabel("Segment Type", "Segment Türü"), options: [
        option("Static", "Static", "Statik"),
        option("Dynamic", "Dynamic", "Dinamik"),
        option("Operational", "Operational", "Operasyonel"),
      ] },
      { name: "channel_focus", type: "select", label: i18nLabel("Channel Focus", "Kanal Odağı"), options: [
        option("WHATSAPP", "WhatsApp", "WhatsApp"),
        option("SMS", "SMS", "SMS"),
        option("Email", "Email", "E-posta"),
        option("Phone Call", "Phone Call", "Telefon"),
      ] },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Draft", "Draft", "Taslak"),
        option("Active", "Active", "Aktif"),
        option("Archived", "Archived", "Arşiv"),
      ] },
      { name: "criteria_json", type: "textarea", label: i18nLabel("Criteria JSON", "Kriter JSON"), rows: 4, fullWidth: true },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  campaign: {
    key: "campaign",
    title: i18nLabel("Quick Campaign", "Hızlı Kampanya"),
    subtitle: i18nLabel("Create a segment-based campaign", "Segmente bağlı kampanya oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_campaign",
    resultKey: "campaign",
    openRouteName: "campaigns-detail",
    successRefreshTargets: ["campaigns-list"],
    defaults: {
      campaign_name: "",
      segment: "",
      template: "",
      channel: "WHATSAPP",
      status: "Draft",
      scheduled_for: "",
      notes: "",
    },
    fields: [
      { name: "campaign_name", type: "text", label: i18nLabel("Campaign Name", "Kampanya Adı"), required: true, fullWidth: true },
      { name: "segment", type: "select", label: i18nLabel("Segment", "Segment"), optionsSource: "segments", required: true },
      { name: "template", type: "select", label: i18nLabel("Template", "Şablon"), optionsSource: "notificationTemplates" },
      { name: "channel", type: "select", label: i18nLabel("Channel", "Kanal"), options: [
        option("WHATSAPP", "WhatsApp", "WhatsApp"),
        option("SMS", "SMS", "SMS"),
        option("Email", "Email", "E-posta"),
        option("Phone Call", "Phone Call", "Telefon"),
      ] },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Draft", "Draft", "Taslak"),
        option("Planned", "Planned", "Planlandı"),
        option("Running", "Running", "Çalışıyor"),
        option("Completed", "Completed", "Tamamlandı"),
        option("Cancelled", "Cancelled", "İptal"),
      ] },
      { name: "scheduled_for", type: "datetime", label: i18nLabel("Scheduled For", "Planlanan Zaman") },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  notification_draft: {
    key: "notification_draft",
    title: i18nLabel("Quick Notification Draft", "Hızlı Bildirim Taslağı"),
    subtitle: i18nLabel("Create a template-based notification draft", "Şablon tabanlı bildirim taslağı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.communication.create_quick_notification_draft",
    resultKey: "draft",
    openRouteName: "notification-drafts-detail",
    successRefreshTargets: ["notification_draft_list", "aux_list", "communication_snapshot"],
    defaults: {
      template: "",
      channel: "",
      language: "tr",
      customer: "",
      recipient: "",
      reference_doctype: "",
      reference_name: "",
      subject: "",
      body: "",
      status: "Draft",
    },
    fields: [
      { name: "template", type: "select", label: i18nLabel("Template", "Şablon"), optionsSource: "notificationTemplates", required: true },
      {
        name: "channel",
        type: "select",
        label: i18nLabel("Channel", "Kanal"),
        options: [option("", "Template Channel", "Template Kanal"), option("SMS", "SMS", "SMS"), option("Email", "Email", "E-posta"), option("WHATSAPP", "WhatsApp", "WhatsApp")],
      },
      { name: "language", type: "select", label: i18nLabel("Language", "Dil"), options: [option("tr", "Turkish", "Türkçe"), option("en", "English", "İngilizce")] },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers" },
      { name: "recipient", type: "text", label: i18nLabel("Recipient", "Alıcı"), required: true },
      {
        name: "reference_doctype",
        type: "select",
        label: i18nLabel("Reference Type", "Referans Tipi"),
        options: [
          option("", "None", "Yok"),
          option("AT Lead", "Lead", "Lead"),
          option("AT Offer", "Offer", "Teklif"),
          option("AT Policy", "Policy", "Poliçe"),
          option("AT Customer", "Customer", "Müşteri"),
          option("AT Claim", "Claim", "Hasar"),
          option("AT Payment", "Payment", "Ödeme"),
          option("AT Renewal Task", "Renewal Task", "Yenileme Görevi"),
        ],
      },
      { name: "reference_name", type: "text", label: i18nLabel("Reference Record", "Referans Kayıt") },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Draft", "Draft", "Taslak"),
        option("Queued", "Queued", "Kuyrukta"),
      ] },
      { name: "subject", type: "text", label: i18nLabel("Subject", "Konu"), fullWidth: true },
      { name: "body", type: "textarea", label: i18nLabel("Message", "Mesaj"), rows: 4, fullWidth: true },
    ],
  },
  communication_message: {
    key: "communication_message",
    title: i18nLabel("Quick Communication", "Hızlı İletişim"),
    subtitle: i18nLabel("Save as draft or send immediately", "Taslak kaydet veya hemen gönder"),
    submitUrl: "acentem_takipte.acentem_takipte.api.communication.create_quick_notification_draft",
    resultKey: "draft",
    successRefreshTargets: ["communication_snapshot", "notification_draft_list"],
    defaults: {
      template: "",
      channel: "",
      language: "tr",
      customer: "",
      recipient: "",
      reference_doctype: "",
      reference_name: "",
      subject: "",
      body: "",
    },
    fields: [
      { name: "template", type: "select", label: i18nLabel("Template", "Şablon"), optionsSource: "notificationTemplates", required: true },
      {
        name: "channel",
        type: "select",
        label: i18nLabel("Channel", "Kanal"),
        options: [option("", "Template Channel", "Template Kanal"), option("SMS", "SMS", "SMS"), option("Email", "Email", "E-posta"), option("WHATSAPP", "WhatsApp", "WhatsApp")],
      },
      { name: "language", type: "select", label: i18nLabel("Language", "Dil"), options: [option("tr", "Turkish", "Türkçe"), option("en", "English", "İngilizce")] },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers" },
      { name: "recipient", type: "text", label: i18nLabel("Recipient", "Alıcı"), required: true },
      {
        name: "reference_doctype",
        type: "select",
        label: i18nLabel("Reference Type", "Referans Tipi"),
        options: [
          option("", "None", "Yok"),
          option("AT Lead", "Lead", "Lead"),
          option("AT Offer", "Offer", "Teklif"),
          option("AT Policy", "Policy", "Poliçe"),
          option("AT Customer", "Customer", "Müşteri"),
          option("AT Claim", "Claim", "Hasar"),
          option("AT Payment", "Payment", "Ödeme"),
          option("AT Renewal Task", "Renewal Task", "Yenileme Görevi"),
        ],
      },
      { name: "reference_name", type: "text", label: i18nLabel("Reference Record", "Referans Kayıt") },
      { name: "subject", type: "text", label: i18nLabel("Subject (Email)", "Konu (E-posta)"), fullWidth: true },
      { name: "body", type: "textarea", label: i18nLabel("Message", "Mesaj"), rows: 4, fullWidth: true },
    ],
  },
  insurance_company: {
    key: "insurance_company",
    title: i18nLabel("Quick Insurance Company", "Hızlı Sigorta Şirketi"),
    subtitle: i18nLabel("Create an insurance company master record", "Ana veri şirket kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_insurance_company",
    resultKey: "company",
    openRouteName: "companies-detail",
    successRefreshTargets: ["aux_list"],
    defaults: { company_name: "", company_code: "", is_active: true },
    fields: [
      { name: "company_name", type: "text", label: i18nLabel("Company Name", "Şirket Adı"), required: true, fullWidth: true },
      { name: "company_code", type: "text", label: i18nLabel("Company Code", "Şirket Kodu") },
      { name: "is_active", type: "checkbox", label: i18nLabel("Active", "Aktif"), checkboxLabel: i18nLabel("Active company", "Aktif şirket") },
    ],
  },
  branch_master: {
    key: "branch_master",
    title: i18nLabel("Quick Branch", "Hızlı Branş"),
    subtitle: i18nLabel("Create a branch and company mapping", "Branş ve şirket eşleşmesi oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_branch",
    resultKey: "branch",
    openRouteName: "branches-detail",
    successRefreshTargets: ["aux_list"],
    defaults: { branch_name: "", branch_code: "", insurance_company: "", is_active: true },
    fields: [
      { name: "branch_name", type: "text", label: i18nLabel("Branch Name", "Branş Adı"), required: true, fullWidth: true },
      { name: "branch_code", type: "text", label: i18nLabel("Branch Code", "Branş Kodu") },
      { name: "insurance_company", type: "select", label: i18nLabel("Insurance Company", "Sigorta Şirketi"), optionsSource: "insuranceCompanies" },
      { name: "is_active", type: "checkbox", label: i18nLabel("Active", "Aktif"), checkboxLabel: i18nLabel("Active branch", "Aktif branş") },
    ],
  },
  sales_entity_master: {
    key: "sales_entity_master",
    title: i18nLabel("Quick Sales Entity", "Hızlı Satış Birimi"),
    subtitle: i18nLabel("Create a sales organization record", "Satış örgütü kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_sales_entity",
    resultKey: "sales_entity",
    openRouteName: "sales-entities-detail",
    successRefreshTargets: ["aux_list"],
    defaults: { entity_type: "Agency", full_name: "", office_branch: "", parent_entity: "" },
    fields: [
      { name: "entity_type", type: "select", label: i18nLabel("Entity Type", "Tip"), required: true, options: [
        option("Agency", "Agency", "Acente"),
        option("Sub-Account", "Sub-Account", "Alt Hesap"),
        option("Representative", "Representative", "Temsilci"),
      ] },
      { name: "full_name", type: "text", label: i18nLabel("Full Name", "Tam Ad"), required: true, fullWidth: true },
      { name: "office_branch", type: "select", label: i18nLabel("Office Branch", "Ofis Şube"), required: true, optionsSource: "officeBranches" },
      { name: "parent_entity", type: "select", label: i18nLabel("Parent Entity", "Bağlı Birim"), optionsSource: "salesEntities" },
    ],
  },
  notification_template_master: {
    key: "notification_template_master",
    title: i18nLabel("Quick Notification Template", "Hızlı Bildirim Şablonu"),
    subtitle: i18nLabel("Create a channel and language template", "Kanal ve dil bazlı şablon oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_notification_template",
    resultKey: "template",
    openRouteName: "templates-detail",
    successRefreshTargets: ["aux_list"],
    defaults: {
      template_key: "",
      event_key: "",
      channel: "WHATSAPP",
      language: "tr",
      content_mode: "template",
      provider_template_name: "",
      provider_template_category: "",
      variables_schema_json: "",
      subject: "",
      body_template: "",
      sms_body_template: "",
      email_body_template: "",
      whatsapp_body_template: "",
      is_active: true,
    },
    fields: [
      { name: "template_key", type: "text", label: i18nLabel("Template Key", "Şablon Anahtarı"), required: true },
      { name: "event_key", type: "text", label: i18nLabel("Event Key", "Olay Anahtarı"), required: true },
      { name: "channel", type: "select", label: i18nLabel("Channel", "Kanal"), required: true, options: [option("SMS", "SMS", "SMS"), option("Email", "Email", "E-posta"), option("WHATSAPP", "WhatsApp", "WhatsApp"), option("Both", "Both", "Her İkisi")] },
      { name: "language", type: "select", label: i18nLabel("Language", "Dil"), required: true, options: [option("tr", "Turkish", "Türkçe"), option("en", "English", "İngilizce")] },
      { name: "content_mode", type: "select", label: i18nLabel("Content Mode", "İçerik Modu"), required: true, options: [option("freeform", "Freeform", "Serbest Metin"), option("template", "Provider Template", "Sağlayıcı Şablonu")] },
      { name: "provider_template_name", type: "text", label: i18nLabel("Provider Template Name", "Sağlayıcı Şablon Adı"), fullWidth: true },
      { name: "provider_template_category", type: "text", label: i18nLabel("Provider Category", "Sağlayıcı Kategori") },
      { name: "variables_schema_json", type: "textarea", label: i18nLabel("Variables Schema JSON", "Değişken Şeması JSON"), rows: 3, fullWidth: true },
      { name: "subject", type: "text", label: i18nLabel("Subject", "Konu"), fullWidth: true },
      { name: "body_template", type: "textarea", label: i18nLabel("Body Template", "Şablon Gövdesi"), required: true, rows: 5, fullWidth: true },
      { name: "sms_body_template", type: "textarea", label: i18nLabel("SMS Body", "SMS Gövdesi"), rows: 3, fullWidth: true },
      { name: "email_body_template", type: "textarea", label: i18nLabel("Email Body", "E-posta Gövdesi"), rows: 3, fullWidth: true },
      { name: "whatsapp_body_template", type: "textarea", label: i18nLabel("WhatsApp Body", "WhatsApp Gövdesi"), rows: 3, fullWidth: true },
      { name: "is_active", type: "checkbox", label: i18nLabel("Active", "Aktif"), checkboxLabel: i18nLabel("Active template", "Aktif şablon") },
    ],
  },
  accounting_entry: {
    key: "accounting_entry",
    title: i18nLabel("Quick Accounting Entry", "Hızlı Muhasebe Kaydı"),
    subtitle: i18nLabel("Create an accounting entry for reconciliation workflows", "Mutabakat odaklı muhasebe kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_accounting_entry",
    resultKey: "accounting_entry",
    openRouteName: "accounting-entries-detail",
    successRefreshTargets: ["aux_list"],
    defaults: {
      entry_type: "Policy",
      status: "Draft",
      policy: "",
      customer: "",
      insurance_company: "",
      currency: "TRY",
      local_amount: "",
      local_amount_try: "",
      external_amount: "",
      external_amount_try: "",
      external_ref: "",
    },
    fields: [
      { name: "entry_type", type: "select", label: i18nLabel("Entry Type", "Kayıt Türü"), required: true, options: [
        option("Policy", "Policy", "Poliçe"),
        option("Payment", "Payment", "Ödeme"),
        option("Claim", "Claim", "Hasar"),
      ]},
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), required: true, options: [
        option("Draft", "Draft", "Taslak"),
        option("Synced", "Synced", "Senkron"),
        option("Failed", "Failed", "Başarısız"),
      ]},
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies" },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers" },
      { name: "insurance_company", type: "select", label: i18nLabel("Insurance Company", "Sigorta Şirketi"), optionsSource: "insuranceCompanies" },
      { name: "currency", type: "select", label: i18nLabel("Currency", "Döviz"), options: [option("TRY", "TRY", "TRY"), option("USD", "USD", "USD"), option("EUR", "EUR", "EUR")] },
      { name: "local_amount", type: "number", label: i18nLabel("Local Amount", "Yerel Tutar"), step: "0.01" },
      { name: "local_amount_try", type: "number", label: i18nLabel("Local Amount TRY", "Yerel Tutar TRY"), step: "0.01" },
      { name: "external_amount", type: "number", label: i18nLabel("External Amount", "Dış Tutar"), step: "0.01" },
      { name: "external_amount_try", type: "number", label: i18nLabel("External Amount TRY", "Dış Tutar TRY"), step: "0.01" },
      { name: "external_ref", type: "text", label: i18nLabel("External Ref", "Dış Referans"), fullWidth: true },
    ],
  },
  reconciliation_item: {
    key: "reconciliation_item",
    title: i18nLabel("Quick Reconciliation Item", "Hızlı Mutabakat Kalemi"),
    subtitle: i18nLabel("Create a reconciliation mismatch record", "Mutabakat fark kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_reconciliation_item",
    resultKey: "reconciliation_item",
    openRouteName: "reconciliation-items-detail",
    successRefreshTargets: ["aux_list"],
    defaults: {
      accounting_entry: "",
      status: "Open",
      mismatch_type: "Amount",
      local_amount_try: "",
      external_amount_try: "",
      resolution_action: "",
      notes: "",
    },
    fields: [
      { name: "accounting_entry", type: "select", label: i18nLabel("Accounting Entry", "Muhasebe Kaydı"), optionsSource: "accountingEntries", required: true, fullWidth: true },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), required: true, options: [
        option("Open", "Open", "Açık"),
        option("Resolved", "Resolved", "Çözüldü"),
        option("Ignored", "Ignored", "Yoksayıldı"),
      ]},
      { name: "mismatch_type", type: "select", label: i18nLabel("Mismatch Type", "Uyumsuzluk Tipi"), required: true, options: [
        option("Amount", "Amount", "Tutar"),
        option("Currency", "Currency", "Döviz"),
        option("Missing External", "Missing External", "Dış Kayıt Eksik"),
        option("Missing Local", "Missing Local", "Yerel Kayıt Eksik"),
        option("Status", "Status", "Durum"),
        option("Other", "Other", "Diğer"),
      ]},
      { name: "local_amount_try", type: "number", label: i18nLabel("Local TRY", "Yerel TRY"), step: "0.01" },
      { name: "external_amount_try", type: "number", label: i18nLabel("External TRY", "Dış TRY"), step: "0.01" },
      { name: "resolution_action", type: "select", label: i18nLabel("Resolution Action", "Çözüm Aksiyonu"), options: [
        option("", "Select", "Seçiniz"),
        option("Matched", "Matched", "Eşleşti"),
        option("Adjusted", "Adjusted", "Düzeltildi"),
        option("Manual Override", "Manual Override", "Manuel Override"),
        option("Ignored", "Ignored", "Yoksayıldı"),
      ]},
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  ownership_assignment: {
    key: "ownership_assignment",
    title: i18nLabel("Quick Assignment", "Hızlı Atama"),
    subtitle: i18nLabel("Create a record ownership and operational assignment", "Kayıt sahipliği ve operasyon ataması oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_ownership_assignment",
    resultKey: "ownership_assignment",
    openRouteName: "ownership-assignments-detail",
    successRefreshTargets: ["ownership-assignments-list"],
    defaults: {
      source_doctype: "AT Customer",
      source_name: "",
      customer: "",
      policy: "",
      assigned_to: "",
      assignment_role: "Owner",
      status: "Open",
      priority: "Normal",
      due_date: "",
      notes: "",
    },
    fields: [
      { name: "source_doctype", type: "select", label: i18nLabel("Source Type", "Kaynak Tipi"), options: [
        option("AT Customer", "Customer", "Müşteri"),
        option("AT Policy", "Policy", "Poliçe"),
        option("AT Claim", "Claim", "Hasar"),
        option("AT Renewal Task", "Renewal Task", "Yenileme Görevi"),
        option("AT Campaign", "Campaign", "Kampanya"),
      ] },
      { name: "source_name", type: "text", label: i18nLabel("Source Record", "Kaynak Kayıt"), required: true },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers" },
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies" },
      { name: "assigned_to", type: "text", label: i18nLabel("Assigned User", "Atanan Kullanıcı"), required: true },
      { name: "assignment_role", type: "select", label: i18nLabel("Assignment Role", "Atama Rolü"), options: [
        option("Owner", "Owner", "Sahip"),
        option("Assignee", "Assignee", "Sorumlu"),
        option("Reviewer", "Reviewer", "Gözden Geçiren"),
        option("Follower", "Follower", "Takipçi"),
      ] },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Open", "Open", "Açık"),
        option("In Progress", "In Progress", "Devam Ediyor"),
        option("Blocked", "Blocked", "Bloke"),
        option("Done", "Done", "Tamamlandı"),
        option("Cancelled", "Cancelled", "İptal"),
      ] },
      { name: "priority", type: "select", label: i18nLabel("Priority", "Öncelik"), options: [
        option("Low", "Low", "Düşük"),
        option("Normal", "Normal", "Normal"),
        option("High", "High", "Yüksek"),
        option("Critical", "Critical", "Kritik"),
      ] },
      { name: "due_date", type: "date", label: i18nLabel("Due Date", "Termin") },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  task: {
    key: "task",
    title: i18nLabel("Quick Task", "Hızlı Görev"),
    subtitle: i18nLabel("Create a task and follow-up item", "Görev ve takip kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_task",
    resultKey: "task",
    openRouteName: "tasks-detail",
    successRefreshTargets: ["tasks-list"],
    defaults: {
      task_title: "",
      task_type: "Follow-up",
      source_doctype: "AT Customer",
      source_name: "",
      customer: "",
      policy: "",
      claim: "",
      assigned_to: "",
      status: "Open",
      priority: "Normal",
      due_date: "",
      reminder_at: "",
      notes: "",
    },
    fields: [
      { name: "task_title", type: "text", label: i18nLabel("Task Title", "Görev Başlığı"), required: true },
      { name: "task_type", type: "select", label: i18nLabel("Task Type", "Görev Tipi"), options: [
        option("Follow-up", "Follow-up", "Takip"),
        option("Visit", "Visit", "Ziyaret"),
        option("Call", "Call", "Arama"),
        option("Collection", "Collection", "Tahsilat"),
        option("Claim", "Claim", "Hasar"),
        option("Renewal", "Renewal", "Yenileme"),
        option("Review", "Review", "İnceleme"),
        option("Other", "Other", "Diğer"),
      ] },
      { name: "source_doctype", type: "select", label: i18nLabel("Source Type", "Kaynak Tipi"), options: [
        option("AT Customer", "Customer", "Müşteri"),
        option("AT Policy", "Policy", "Poliçe"),
        option("AT Claim", "Claim", "Hasar"),
        option("AT Renewal Task", "Renewal Task", "Yenileme Görevi"),
        option("AT Campaign", "Campaign", "Kampanya"),
        option("AT Ownership Assignment", "Assignment", "Atama"),
        option("AT Call Note", "Call Note", "Arama Notu"),
      ] },
      { name: "source_name", type: "text", label: i18nLabel("Source Record", "Kaynak Kayıt") },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers" },
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies" },
      { name: "claim", type: "text", label: i18nLabel("Claim", "Hasar") },
      { name: "assigned_to", type: "text", label: i18nLabel("Assigned User", "Atanan Kullanıcı"), required: true },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Open", "Open", "Açık"),
        option("In Progress", "In Progress", "Devam Ediyor"),
        option("Blocked", "Blocked", "Bloke"),
        option("Done", "Done", "Tamamlandı"),
        option("Cancelled", "Cancelled", "İptal"),
      ] },
      { name: "priority", type: "select", label: i18nLabel("Priority", "Öncelik"), options: [
        option("Low", "Low", "Düşük"),
        option("Normal", "Normal", "Normal"),
        option("High", "High", "Yüksek"),
        option("Critical", "Critical", "Kritik"),
      ] },
      { name: "due_date", type: "date", label: i18nLabel("Due Date", "Termin") },
      { name: "reminder_at", type: "datetime-local", label: i18nLabel("Reminder At", "Hatırlatma") },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  activity: {
    key: "activity",
    title: i18nLabel("Quick Activity", "Hızlı Aktivite"),
    subtitle: i18nLabel("Log a completed operational step", "Gerçekleşen operasyon adımını kaydet"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_activity",
    resultKey: "activity",
    openRouteName: "activities-detail",
    successRefreshTargets: ["activities-list"],
    defaults: {
      activity_title: "",
      activity_type: "Note",
      source_doctype: "AT Customer",
      source_name: "",
      customer: "",
      policy: "",
      claim: "",
      assigned_to: "",
      activity_at: "",
      status: "Logged",
      notes: "",
    },
    fields: [
      { name: "activity_title", type: "text", label: i18nLabel("Activity Title", "Aktivite Başlığı"), required: true },
      { name: "activity_type", type: "select", label: i18nLabel("Activity Type", "Aktivite Tipi"), options: [
        option("Call", "Call", "Arama"),
        option("Visit", "Visit", "Ziyaret"),
        option("Note", "Note", "Not"),
        option("Claim Update", "Claim Update", "Hasar Güncelleme"),
        option("Renewal Update", "Renewal Update", "Yenileme Güncelleme"),
        option("Collection", "Collection", "Tahsilat"),
        option("Campaign", "Campaign", "Kampanya"),
        option("Review", "Review", "İnceleme"),
        option("Other", "Other", "Diğer"),
      ] },
      { name: "source_doctype", type: "select", label: i18nLabel("Source Type", "Kaynak Tipi"), options: [
        option("AT Customer", "Customer", "Müşteri"),
        option("AT Policy", "Policy", "Poliçe"),
        option("AT Claim", "Claim", "Hasar"),
        option("AT Task", "Task", "Görev"),
        option("AT Campaign", "Campaign", "Kampanya"),
      ] },
      { name: "source_name", type: "text", label: i18nLabel("Source Record", "Kaynak Kayıt") },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers" },
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies" },
      { name: "claim", type: "text", label: i18nLabel("Claim", "Hasar") },
      { name: "assigned_to", type: "text", label: i18nLabel("Assigned User", "Atanan Kullanıcı") },
      { name: "activity_at", type: "datetime-local", label: i18nLabel("Activity Time", "Aktivite Zamanı") },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Logged", "Logged", "Kaydedildi"),
        option("Shared", "Shared", "Paylaşıldı"),
        option("Archived", "Archived", "Arşivlendi"),
      ] },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
  reminder: {
    key: "reminder",
    title: i18nLabel("Quick Reminder", "Hızlı Hatırlatıcı"),
    subtitle: i18nLabel("Create a time-based follow-up record", "Zaman bazlı takip kaydı oluştur"),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_reminder",
    resultKey: "reminder",
    openRouteName: "reminders-detail",
    successRefreshTargets: ["reminders-list"],
    defaults: {
      reminder_title: "",
      source_doctype: "AT Customer",
      source_name: "",
      customer: "",
      policy: "",
      claim: "",
      assigned_to: "",
      status: "Open",
      priority: "Normal",
      remind_at: "",
      notes: "",
    },
    fields: [
      { name: "reminder_title", type: "text", label: i18nLabel("Reminder Title", "Hatırlatıcı Başlığı"), required: true },
      { name: "source_doctype", type: "select", label: i18nLabel("Source Type", "Kaynak Tipi"), options: [
        option("AT Customer", "Customer", "Müşteri"),
        option("AT Policy", "Policy", "Poliçe"),
        option("AT Claim", "Claim", "Hasar"),
        option("AT Renewal Task", "Renewal Task", "Yenileme Görevi"),
        option("AT Campaign", "Campaign", "Kampanya"),
        option("AT Ownership Assignment", "Assignment", "Atama"),
        option("AT Call Note", "Call Note", "Arama Notu"),
        option("AT Task", "Task", "Görev"),
      ] },
      { name: "source_name", type: "text", label: i18nLabel("Source Record", "Kaynak Kayıt") },
      { name: "customer", type: "select", label: i18nLabel("Customer", "Müşteri"), optionsSource: "customers" },
      { name: "policy", type: "select", label: i18nLabel("Policy", "Poliçe"), optionsSource: "policies" },
      { name: "claim", type: "text", label: i18nLabel("Claim", "Hasar") },
      { name: "assigned_to", type: "text", label: i18nLabel("Assigned User", "Atanan Kullanıcı"), required: true },
      { name: "status", type: "select", label: i18nLabel("Status", "Durum"), options: [
        option("Open", "Open", "Açık"),
        option("Done", "Done", "Tamamlandı"),
        option("Cancelled", "Cancelled", "İptal"),
      ] },
      { name: "priority", type: "select", label: i18nLabel("Priority", "Öncelik"), options: [
        option("Low", "Low", "Düşük"),
        option("Normal", "Normal", "Normal"),
        option("High", "High", "Yüksek"),
        option("Critical", "Critical", "Kritik"),
      ] },
      { name: "remind_at", type: "datetime-local", label: i18nLabel("Reminder Time", "Hatırlatma Zamanı"), required: true },
      { name: "notes", type: "textarea", label: i18nLabel("Notes", "Not"), rows: 3, fullWidth: true },
    ],
  },
};

function addQuickEditVariant(baseKey, editKey, trTitle, enTitle, trSubtitle, enSubtitle) {
  const base = quickCreateRegistry[baseKey];
  if (!base) return;
  quickCreateRegistry[editKey] = {
    ...base,
    key: editKey,
    title: i18nLabel(enTitle, trTitle),
    subtitle: i18nLabel(enSubtitle, trSubtitle),
    submitUrl: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
    resultKey: "record",
    openRouteName: "",
    successRefreshTargets: ["aux_detail"],
  };
}

addQuickEditVariant(
  "customer_relation",
  "customer_relation_edit",
  "Müşteri İlişkisini Düzenle",
  "Edit Customer Relation",
  "İlişki alanlarını güncelle",
  "Update relation fields"
);
addQuickEditVariant(
  "insured_asset",
  "insured_asset_edit",
  "Sigortalanan Varlığı Düzenle",
  "Edit Insured Asset",
  "Varlık alanlarını güncelle",
  "Update insured asset fields"
);
addQuickEditVariant(
  "insurance_company",
  "insurance_company_edit",
  "Sigorta Şirketini Düzenle",
  "Edit Insurance Company",
  "Ana veri şirket kaydını güncelle",
  "Update the insurance company master record"
);
addQuickEditVariant(
  "branch_master",
  "branch_master_edit",
  "Branşı Düzenle",
  "Edit Branch",
  "Branş ve şirket eşleşmesini güncelle",
  "Update branch and company mapping"
);
addQuickEditVariant(
  "sales_entity_master",
  "sales_entity_master_edit",
  "Satış Birimini Düzenle",
  "Edit Sales Entity",
  "Satış örgütü kaydını güncelle",
  "Update sales organization record"
);
addQuickEditVariant(
  "call_note",
  "call_note_edit",
  "Arama Notunu Düzenle",
  "Edit Call Note",
  "Arama notu alanlarını güncelle",
  "Update call note fields"
);
addQuickEditVariant(
  "segment",
  "segment_edit",
  "Segmenti Düzenle",
  "Edit Segment",
  "Segment alanlarını güncelle",
  "Update segment fields"
);
addQuickEditVariant(
  "campaign",
  "campaign_edit",
  "Kampanyayı Düzenle",
  "Edit Campaign",
  "Kampanya alanlarını güncelle",
  "Update campaign fields"
);
addQuickEditVariant(
  "ownership_assignment",
  "ownership_assignment_edit",
  "Atamayı Düzenle",
  "Edit Assignment",
  "Atama alanlarını güncelle",
  "Update assignment fields"
);
addQuickEditVariant(
  "task",
  "task_edit",
  "Görevi Düzenle",
  "Edit Task",
  "Görev alanlarını güncelle",
  "Update task fields"
);
addQuickEditVariant(
  "activity",
  "activity_edit",
  "Aktiviteyi Düzenle",
  "Edit Activity",
  "Aktivite alanlarını güncelle",
  "Update activity fields"
);
addQuickEditVariant(
  "reminder",
  "reminder_edit",
  "Hatırlatıcıyı Düzenle",
  "Edit Reminder",
  "Hatırlatıcı alanlarını güncelle",
  "Update reminder fields"
);
addQuickEditVariant(
  "notification_template_master",
  "notification_template_master_edit",
  "Bildirim Şablonunu Düzenle",
  "Edit Notification Template",
  "Şablon alanlarını güncelle",
  "Update notification template fields"
);
addQuickEditVariant(
  "accounting_entry",
  "accounting_entry_edit",
  "Muhasebe Kaydını Düzenle",
  "Edit Accounting Entry",
  "Muhasebe ve mutabakat alanlarını güncelle",
  "Update accounting and reconciliation fields"
);
addQuickEditVariant(
  "reconciliation_item",
  "reconciliation_item_edit",
  "Mutabakat Kalemini Düzenle",
  "Edit Reconciliation Item",
  "Mutabakat fark kaydını güncelle",
  "Update reconciliation mismatch record"
);

const customerQuickCreateConfig = quickCreateRegistry.customer;
if (customerQuickCreateConfig) {
  customerQuickCreateConfig.defaults = {
    ...(customerQuickCreateConfig.defaults || {}),
    customer_type: "Individual",
    tax_id: "",
    birth_date: "",
    gender: "Unknown",
    marital_status: "Unknown",
    occupation: "",
  };
  customerQuickCreateConfig.fields = [
    { name: "full_name", type: "text", label: i18nLabel("Full Name", "Ad Soyad"), required: true, fullWidth: true },
    {
      name: "customer_type",
      type: "select",
      label: i18nLabel("Customer Type", "Müşteri Tipi"),
      required: true,
      options: [
        option("Individual", "Individual", "Bireysel"),
        option("Corporate", "Corporate", "Kurumsal"),
      ],
    },
    {
      name: "tax_id",
      type: "text",
      required: true,
      label: ({ model, locale }) =>
        String(model?.customer_type || "Individual") === "Corporate"
          ? locale === "tr"
            ? "Vergi No"
            : "Tax Number"
          : locale === "tr"
            ? "TC Kimlik No"
            : "National ID Number",
      help: ({ model, locale }) =>
        String(model?.customer_type || "Individual") === "Corporate"
          ? locale === "tr"
            ? "10 haneli vergi numarası girin."
            : "Enter a 10-digit tax number."
          : locale === "tr"
            ? "11 haneli T.C. kimlik numarası girin."
            : "Enter an 11-digit Turkish national ID number.",
    },
    {
      name: "birth_date",
      type: "date",
      label: i18nLabel("Birth Date", "Doğum Tarihi"),
      disabled: ({ model }) => String(model?.customer_type || "Individual") === "Corporate",
      help: ({ model, locale }) =>
        String(model?.customer_type || "Individual") === "Corporate"
          ? locale === "tr"
            ? "Kurumsal müşteriler için devre dışıdır."
            : "Disabled for corporate customers."
          : "",
    },
    { name: "phone", type: "text", label: i18nLabel("Phone", "Telefon") },
    { name: "email", type: "email", label: i18nLabel("Email", "E-posta") },
    {
      name: "gender",
      type: "select",
      label: i18nLabel("Gender", "Cinsiyet"),
      disabled: ({ model }) => String(model?.customer_type || "Individual") === "Corporate",
      options: [
        option("Unknown", "Unknown", "Bilinmiyor"),
        option("Male", "Male", "Erkek"),
        option("Female", "Female", "Kadın"),
        option("Other", "Other", "Diğer"),
      ],
    },
    {
      name: "marital_status",
      type: "select",
      label: i18nLabel("Marital Status", "Medeni Durum"),
      disabled: ({ model }) => String(model?.customer_type || "Individual") === "Corporate",
      options: [
        option("Unknown", "Unknown", "Bilinmiyor"),
        option("Single", "Single", "Bekar"),
        option("Married", "Married", "Evli"),
        option("Divorced", "Divorced", "Boşanmış"),
        option("Widowed", "Widowed", "Dul"),
      ],
    },
    {
      name: "consent_status",
      type: "select",
      label: i18nLabel("Consent Status", "İzin Durumu"),
      options: [
        option("Unknown", "Unknown", "Bilinmiyor"),
        option("Granted", "Granted", "Onaylı"),
        option("Revoked", "Revoked", "İptal"),
      ],
    },
    { name: "assigned_agent", type: "text", label: i18nLabel("Assigned Agent (User)", "Temsilci (User)") },
    {
      name: "occupation",
      type: "text",
      label: i18nLabel("Occupation", "Meslek"),
      fullWidth: true,
      disabled: ({ model }) => String(model?.customer_type || "Individual") === "Corporate",
    },
    { name: "address", type: "textarea", label: i18nLabel("Address", "Adres"), rows: 3, fullWidth: true },
  ];
}

export function getQuickCreateConfig(key) {
  return quickCreateRegistry[key] || null;
}

export function buildQuickCreateDraft(config, overrides = {}) {
  if (!config) return {};
  return { ...(config.defaults || {}), ...overrides };
}

export function getLocalizedText(value, locale = "tr") {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value[locale] || value.tr || value.en || "";
  return String(value);
}

