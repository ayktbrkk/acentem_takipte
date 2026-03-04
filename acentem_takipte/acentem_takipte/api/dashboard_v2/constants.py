from __future__ import annotations

CUSTOMER_WORKBENCH_DERIVED_SORTS = {
    "active_policy_count desc",
    "active_policy_count asc",
    "open_offer_count desc",
    "open_offer_count asc",
    "active_policy_gross_premium desc",
    "active_policy_gross_premium asc",
}

CUSTOMER_WORKBENCH_ALLOWED_ORDER_BY = {
    "modified desc": "modified desc",
    "full_name asc": "full_name asc",
    "full_name desc": "full_name desc",
}

CUSTOMER_WORKBENCH_BASE_FIELDS = [
    "name",
    "full_name",
    "tax_id",
    "masked_tax_id",
    "phone",
    "masked_phone",
    "email",
    "birth_date",
    "gender",
    "marital_status",
    "occupation",
    "assigned_agent",
    "consent_status",
    "customer_folder",
    "modified",
]

CUSTOMER_WORKBENCH_DERIVED_SORT_SEED_FIELDS = [
    "name",
    "full_name",
    "modified",
]

CUSTOMER_WORKBENCH_QUERY_TEXT_OR_FILTER_FIELDS = [
    "name",
    "full_name",
    "tax_id",
    "masked_tax_id",
    "email",
    "phone",
    "masked_phone",
]

LEAD_WORKBENCH_DERIVED_SORTS = {
    "stale_state desc",
    "stale_state asc",
    "can_convert_to_offer desc",
    "can_convert_to_offer asc",
    "conversion_state desc",
    "conversion_state asc",
}

LEAD_WORKBENCH_STALE_STATES = {"Fresh", "FollowUp", "Stale"}

LEAD_WORKBENCH_ALLOWED_ORDER_BY = {
    "modified desc": "modified desc",
    "first_name asc": "first_name asc",
    "first_name desc": "first_name desc",
    "estimated_gross_premium desc": "estimated_gross_premium desc",
    "estimated_gross_premium asc": "estimated_gross_premium asc",
}

LEAD_WORKBENCH_BASE_FIELDS = [
    "name",
    "first_name",
    "last_name",
    "email",
    "status",
    "customer",
    "sales_entity",
    "insurance_company",
    "branch",
    "estimated_gross_premium",
    "converted_offer",
    "converted_policy",
    "modified",
]

LEAD_WORKBENCH_DERIVED_SORT_SEED_FIELDS = [
    "name",
    "first_name",
    "last_name",
    "status",
    "customer",
    "sales_entity",
    "insurance_company",
    "branch",
    "estimated_gross_premium",
    "converted_offer",
    "converted_policy",
    "modified",
]

LEAD_WORKBENCH_QUERY_TEXT_OR_FILTER_FIELDS = [
    "name",
    "first_name",
    "last_name",
    "email",
    "customer",
]
