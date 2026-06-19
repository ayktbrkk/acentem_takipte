from __future__ import annotations

PREVIEW_ROW_LIMIT = 200
IMPORT_ROW_LIMIT = 5000
MAX_FILE_BYTES = 10 * 1024 * 1024
BATCH_COMMIT_SIZE = 50

SUPPORTED_PREVIEW_DATASETS = frozenset({"customers", "offers", "policies"})
SUPPORTED_EXECUTE_DATASETS = frozenset({"customers", "offers", "policies"})

DATASET_TARGET_DOCTYPE = {
    "customers": "AT Customer",
    "offers": "AT Offer",
    "policies": "AT Policy",
}

FIELD_ALIASES = {
    "mobile_phone": "phone",
    "phone_number": "phone",
    "cep_telefonu": "phone",
    "ad_soyad": "full_name",
    "fullName": "full_name",
    "taxId": "tax_id",
    "tckn": "tax_id",
    "vergi_no": "tax_id",
    "customer_type": "customer_type",
    "musteri_tipi": "customer_type",
    "customer_tax_id": "customer",
    "musteri": "customer",
    "sigorta_sirketi": "insurance_company",
    "insuranceCompany": "insurance_company",
    "sales_entity": "sales_entity",
    "satis_kanali": "sales_entity",
    "branch_name": "branch",
    "brans": "branch",
    "policy_number": "policy_no",
    "policyNo": "policy_no",
    "offer_date": "offer_date",
    "teklif_tarihi": "offer_date",
    "issue_date": "issue_date",
    "start_date": "start_date",
    "end_date": "end_date",
    "baslangic_tarihi": "start_date",
    "bitis_tarihi": "end_date",
    "grossPremium": "gross_premium",
    "netPremium": "net_premium",
    "taxAmount": "tax_amount",
    "commissionAmount": "commission_amount",
}

CUSTOMER_REQUIRED_FIELDS = ("full_name", "tax_id")
OFFER_REQUIRED_FIELDS = (
    "customer",
    "sales_entity",
    "insurance_company",
    "branch",
    "offer_date",
    "gross_premium",
)
POLICY_REQUIRED_FIELDS = (
    "customer",
    "sales_entity",
    "insurance_company",
    "branch",
    "policy_no",
    "issue_date",
    "start_date",
    "end_date",
    "gross_premium",
)

DATASET_REQUIRED_FIELDS = {
    "customers": CUSTOMER_REQUIRED_FIELDS,
    "offers": OFFER_REQUIRED_FIELDS,
    "policies": POLICY_REQUIRED_FIELDS,
}


def normalize_field_key(value: str | None) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    return FIELD_ALIASES.get(raw, raw)


def get_required_fields(dataset: str) -> tuple[str, ...]:
    import frappe
    from frappe import _

    fields = DATASET_REQUIRED_FIELDS.get(dataset)
    if fields:
        return fields
    frappe.throw(_("Dataset is not supported yet: {0}").format(dataset))


def assert_dataset_supported(dataset: str, *, for_execute: bool = False) -> None:
    import frappe
    from frappe import _

    allowed = SUPPORTED_EXECUTE_DATASETS if for_execute else SUPPORTED_PREVIEW_DATASETS
    if dataset not in allowed:
        frappe.throw(_("Dataset is not supported yet: {0}").format(dataset))
