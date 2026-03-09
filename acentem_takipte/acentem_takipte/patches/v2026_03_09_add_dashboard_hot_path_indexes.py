from __future__ import annotations

import frappe


INDEX_SPECS = [
    # Dashboard card/kpi filters
    ("AT Policy", "idx_at_policy_issue_office_branch", ("issue_date", "office_branch")),
    ("AT Policy", "idx_at_policy_status_issue_office", ("status", "issue_date", "office_branch")),
    ("AT Payment", "idx_at_payment_date_office_customer", ("payment_date", "office_branch", "customer")),
    ("AT Payment", "idx_at_payment_status_direction_date", ("status", "payment_direction", "payment_date")),
    ("AT Claim", "idx_at_claim_reported_office_customer", ("reported_date", "office_branch", "customer")),
    ("AT Claim", "idx_at_claim_status_reported", ("claim_status", "reported_date")),
    ("AT Renewal Task", "idx_at_renewal_status_renewal_office", ("status", "renewal_date", "office_branch")),
    ("AT Renewal Task", "idx_at_renewal_policy_due", ("policy", "due_date")),
    ("AT Lead", "idx_at_lead_status_office_customer", ("status", "office_branch", "customer")),
    ("AT Accounting Entry", "idx_at_accounting_policy_customer", ("policy", "customer")),
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
    if "duplicate key name" in message:
        return True
    if "already exists" in message and ("index" in message or "relation" in message):
        return True
    return False


def _create_index_if_missing(*, doctype: str, index_name: str, columns: tuple[str, ...], db_type: str) -> None:
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
