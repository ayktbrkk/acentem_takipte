from __future__ import annotations

import frappe
from acentem_takipte.acentem_takipte.doctype.at_access_log.at_access_log import (
    log_decision_event,
)


def _insert_doc(payload: dict, result_key: str) -> dict[str, str]:
    doc = frappe.get_doc(payload)
    doc.insert()
    frappe.db.commit()
    log_decision_event(
        doc.doctype,
        doc.name,
        action="Create",
        action_summary=f"{doc.doctype} created",
        decision_context=result_key,
    )
    return {result_key: doc.name}


def update_aux_record(doc) -> dict[str, str]:
    doc.save()
    frappe.db.commit()
    log_decision_event(
        doc.doctype,
        doc.name,
        action="Edit",
        action_summary=f"{doc.doctype} updated",
        decision_context="quick_aux_edit",
    )
    return {"record": doc.name}


def delete_aux_record(doc) -> dict[str, str | bool]:
    record_name = doc.name
    doctype = doc.doctype
    doc.delete()
    frappe.db.commit()
    log_decision_event(
        doctype,
        record_name,
        action="Delete",
        action_summary=f"{doctype} deleted",
        decision_context="quick_aux_delete",
    )
    return {"record": record_name, "doctype": doctype, "deleted": True}


from acentem_takipte.acentem_takipte.services.quick_create_core import (  # noqa: E402
    create_activity,
    create_call_note,
    create_campaign,
    create_claim,
    create_customer,
    create_customer_relation,
    create_insured_asset,
    create_lead,
    create_ownership_assignment,
    create_payment,
    create_policy,
    create_reminder,
    create_renewal_task,
    create_segment,
    create_task,
)

from acentem_takipte.acentem_takipte.services.quick_create_common import (  # noqa: E402
    _as_check,
    _assert_create_permission,
    _assert_delete_permission,
    _assert_write_permission,
    _digits_only,
    _normalize_date,
    _normalize_datetime,
    _normalize_doctype_or_blank,
    _normalize_link,
    _normalize_option,
    _normalize_source_name,
    _resolve_office_branch,
    _split_full_name,
)

from acentem_takipte.acentem_takipte.services.quick_create_customer_flow import (  # noqa: E402
    create_quick_customer,
    create_quick_claim,
    create_quick_lead,
    create_quick_payment,
)
from acentem_takipte.acentem_takipte.services.quick_create_policy_task import (  # noqa: E402
    create_quick_policy,
    create_quick_task,
)
from acentem_takipte.acentem_takipte.services.quick_create_auxiliary import (  # noqa: E402
    create_quick_call_note,
    create_quick_campaign,
    create_quick_customer_relation,
    create_quick_insured_asset,
    create_quick_ownership_assignment,
    create_quick_renewal_task,
    create_quick_segment,
)
from acentem_takipte.acentem_takipte.services.quick_create_reference import (  # noqa: E402
    create_quick_branch,
    create_quick_insurance_company,
    create_quick_sales_entity,
)
from acentem_takipte.acentem_takipte.services.quick_create_search import (  # noqa: E402
    search_quick_options,
)
from acentem_takipte.acentem_takipte.services.quick_create_special import (  # noqa: E402
    create_quick_accounting_entry,
    create_quick_notification_template,
    create_quick_reconciliation_item,
    delete_quick_aux_record,
    update_quick_aux_record,
)
from acentem_takipte.acentem_takipte.services.quick_create_workflow import (  # noqa: E402
    create_quick_activity,
    create_quick_reminder,
)
