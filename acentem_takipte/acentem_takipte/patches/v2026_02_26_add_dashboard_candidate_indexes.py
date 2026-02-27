from __future__ import annotations

import frappe


INDEX_SPECS = [
    # AT Policy (dashboard KPI/tab aggregates, branch/customer/date filtering)
    ("AT Policy", "idx_at_policy_issue_branch_cust", ("issue_date", "branch", "customer")),
    ("AT Policy", "idx_at_policy_status_issue", ("status", "issue_date")),
    ("AT Policy", "idx_at_policy_company_issue", ("insurance_company", "issue_date")),
    ("AT Policy", "idx_at_policy_customer_end", ("customer", "end_date")),
    # AT Renewal Task (renewal buckets / preview queries)
    ("AT Renewal Task", "idx_at_renewal_status_due", ("status", "due_date")),
    ("AT Renewal Task", "idx_at_renewal_policy_status", ("policy", "status")),
    ("AT Renewal Task", "idx_at_renewal_customer_status_due", ("customer", "status", "due_date")),
    # AT Lead (lead workbench list/sort/filter patterns)
    ("AT Lead", "idx_at_lead_status_modified", ("status", "modified")),
    ("AT Lead", "idx_at_lead_branch_modified", ("branch", "modified")),
    ("AT Lead", "idx_at_lead_customer_modified", ("customer", "modified")),
    ("AT Lead", "idx_at_lead_company_modified", ("insurance_company", "modified")),
    # AT Reconciliation Item (workbench list filters)
    ("AT Reconciliation Item", "idx_at_reco_status_modified", ("status", "modified")),
    ("AT Reconciliation Item", "idx_at_reco_status_mismatch_mod", ("status", "mismatch_type", "modified")),
    ("AT Reconciliation Item", "idx_at_reco_entry_status", ("accounting_entry", "status")),
    # AT Notification Outbox (communication center snapshot/preview queries)
    ("AT Notification Outbox", "idx_at_outbox_status_channel_mod", ("status", "channel", "modified")),
    ("AT Notification Outbox", "idx_at_outbox_customer_mod", ("customer", "modified")),
    ("AT Notification Outbox", "idx_at_outbox_ref_doctype_name_mod", ("reference_doctype", "reference_name", "modified")),
]


def _db_type() -> str:
    raw = (getattr(frappe.db, "db_type", None) or getattr(frappe.conf, "db_type", None) or "").lower()
    if "postgres" in raw:
        return "postgres"
    return "mariadb"


def _quote_ident(name: str, *, db_type: str) -> str:
    if db_type == "postgres":
        return '"' + str(name).replace('"', '""') + '"'
    return "`" + str(name).replace("`", "``") + "`"


def _table_name_for_doctype(doctype: str) -> str:
    return f"tab{doctype}"


def _index_exists(*, index_name: str, table_name: str, db_type: str) -> bool:
    if db_type == "postgres":
        rows = frappe.db.sql(
            """
            select 1
            from pg_indexes
            where schemaname = current_schema()
              and tablename = %s
              and indexname = %s
            limit 1
            """,
            (table_name, index_name),
        )
        return bool(rows)

    table_sql = _quote_ident(table_name, db_type=db_type)
    rows = frappe.db.sql(f"show index from {table_sql} where Key_name = %s", (index_name,))
    return bool(rows)


def _is_duplicate_index_error(exc: Exception) -> bool:
    message = str(exc or "").lower()
    duplicate_markers = [
        "duplicate key name",
        "already exists",
        "relation",
        "index",
    ]
    # Require "already exists" or duplicate phrase to avoid masking unrelated SQL issues.
    if "duplicate key name" in message:
        return True
    if "already exists" in message and ("index" in message or "relation" in message):
        return True
    return False


def _create_index_if_missing(*, doctype: str, index_name: str, columns: tuple[str, ...], db_type: str):
    table_name = _table_name_for_doctype(doctype)
    if _index_exists(index_name=index_name, table_name=table_name, db_type=db_type):
        return

    table_sql = _quote_ident(table_name, db_type=db_type)
    index_sql = _quote_ident(index_name, db_type=db_type)
    columns_sql = ", ".join(_quote_ident(col, db_type=db_type) for col in columns)

    ddl = f"create index {index_sql} on {table_sql} ({columns_sql})"
    try:
        frappe.db.sql(ddl)
    except Exception as exc:
        # Patch reruns or parallel deploys may race; ignore only duplicate-index outcomes.
        if _is_duplicate_index_error(exc):
            return
        raise


def execute():
    db_type = _db_type()
    for doctype, index_name, columns in INDEX_SPECS:
        _create_index_if_missing(
            doctype=doctype,
            index_name=index_name,
            columns=tuple(columns),
            db_type=db_type,
        )

