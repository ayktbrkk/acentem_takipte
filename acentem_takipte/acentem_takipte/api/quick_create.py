from __future__ import annotations

# audit(facade): This module exists as a stable dotted-path facade for quick-create
# endpoints. The imported callables below are intentionally re-exported so legacy
# Frappe hooks/tests can keep importing `api.quick_create.<name>` without moving
# every caller in one pass.
from acentem_takipte.acentem_takipte.services.quick_create import (
    create_activity as create_activity_service,
    create_reminder as create_reminder_service,
)
from acentem_takipte.acentem_takipte.services.quick_create_auxiliary import (
    create_quick_call_note,
    create_quick_campaign,
    create_quick_customer_relation,
    create_quick_insured_asset,
    create_quick_ownership_assignment,
    create_quick_renewal_task,
    create_quick_segment,
)
from acentem_takipte.acentem_takipte.services.quick_create_customer_flow import (
    create_quick_claim,
    create_quick_customer,
    create_quick_lead,
    create_quick_payment,
)
from acentem_takipte.acentem_takipte.services.quick_create_helpers import (
    ALLOWED_AUX_EDIT_FIELDS,
    _assert_create_permission,
    _normalize_doctype_or_blank,
    _normalize_source_name,
)
from acentem_takipte.acentem_takipte.services.quick_create_policy_task import (
    create_quick_policy,
    create_quick_task,
)
from acentem_takipte.acentem_takipte.services.quick_create_reference import (
    create_quick_branch,
    create_quick_insurance_company,
    create_quick_sales_entity,
)
from acentem_takipte.acentem_takipte.services.quick_create_search import (
    search_quick_options,
)
from acentem_takipte.acentem_takipte.services.quick_create_special import (
    create_quick_accounting_entry,
    create_quick_notification_template,
    create_quick_reconciliation_item,
    delete_quick_aux_record,
    update_quick_aux_record,
)
from acentem_takipte.acentem_takipte.services.quick_create_workflow import (
    create_quick_activity,
    create_quick_reminder,
)

__all__ = [
    "ALLOWED_AUX_EDIT_FIELDS",
    "_assert_create_permission",
    "_normalize_doctype_or_blank",
    "_normalize_source_name",
    "create_activity_service",
    "create_quick_accounting_entry",
    "create_quick_activity",
    "create_quick_branch",
    "create_quick_call_note",
    "create_quick_campaign",
    "create_quick_claim",
    "create_quick_customer",
    "create_quick_customer_relation",
    "create_quick_insurance_company",
    "create_quick_insured_asset",
    "create_quick_lead",
    "create_quick_notification_template",
    "create_quick_ownership_assignment",
    "create_quick_payment",
    "create_quick_policy",
    "create_quick_reconciliation_item",
    "create_quick_reminder",
    "create_quick_renewal_task",
    "create_quick_sales_entity",
    "create_quick_segment",
    "create_quick_task",
    "create_reminder_service",
    "delete_quick_aux_record",
    "search_quick_options",
    "update_quick_aux_record",
]
