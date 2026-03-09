from __future__ import annotations

import frappe


INDEX_SPECS = (
    ("AT Policy", "idx_at_policy_insurance_company_issue", ("insurance_company", "issue_date")),
    ("AT Payment", "idx_at_payment_policy_status", ("policy", "status")),
    ("AT Claim", "idx_at_claim_policy_status", ("policy", "claim_status")),
    ("AT Reconciliation Item", "idx_at_reconciliation_status_modified", ("status", "modified")),
    ("AT Reconciliation Item", "idx_at_reconciliation_entry_status", ("accounting_entry", "status")),
)


def _db_type() -> str:
    raw = (getattr(frappe.db, "db_type", None) or getattr(frappe.conf, "db_type", None) or "").lower()
    if "postgres" in raw:
        return "postgres"
    return "mariadb"


def _quote_ident(identifier: str, *, db_type: str) -> str:
    if db_type == "postgres":
        return f'"{identifier}"'
    return f"`{identifier}`"


def _table_name_for_doctype(doctype: str) -> str:
    return f"tab{doctype}"


def _index_exists(*, table_name: str, index_name: str, db_type: str) -> bool:
    if db_type == "postgres":
        return bool(
            frappe.db.sql(
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
        )
    return bool(
        frappe.db.sql(
            f"show index from {_quote_ident(table_name, db_type=db_type)} where Key_name = %s",
            (index_name,),
        )
    )


def _is_duplicate_index_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "duplicate" in message or "already exists" in message


def _create_index_if_missing(doctype: str, index_name: str, columns: tuple[str, ...], *, db_type: str) -> None:
    table_name = _table_name_for_doctype(doctype)
    if _index_exists(table_name=table_name, index_name=index_name, db_type=db_type):
        return

    column_sql = ", ".join(_quote_ident(column, db_type=db_type) for column in columns)
    create_sql = (
        f"create index {_quote_ident(index_name, db_type=db_type)} "
        f"on {_quote_ident(table_name, db_type=db_type)} ({column_sql})"
    )
    try:
        frappe.db.sql(create_sql)
    except Exception as exc:
        if not _is_duplicate_index_error(exc):
            raise


def execute() -> None:
    db_type = _db_type()
    for doctype, index_name, columns in INDEX_SPECS:
        _create_index_if_missing(doctype, index_name, columns, db_type=db_type)
