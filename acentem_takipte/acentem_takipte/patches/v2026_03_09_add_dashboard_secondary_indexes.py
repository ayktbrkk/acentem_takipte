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
    return (frappe.db.db_type or "").lower()


def _quote_ident(identifier: str) -> str:
    if _db_type() == "postgres":
        return f'"{identifier}"'
    return f"`{identifier}`"


def _table_name_for_doctype(doctype: str) -> str:
    table_name = frappe.db.get_table_name(doctype)
    if table_name:
        return table_name
    return f"tab{doctype}"


def _index_exists(table_name: str, index_name: str) -> bool:
    if _db_type() == "postgres":
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
            f"show index from {_quote_ident(table_name)} where Key_name = %s",
            (index_name,),
        )
    )


def _is_duplicate_index_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "duplicate" in message or "already exists" in message


def _create_index_if_missing(doctype: str, index_name: str, columns: tuple[str, ...]) -> None:
    table_name = _table_name_for_doctype(doctype)
    if _index_exists(table_name, index_name):
        return

    column_sql = ", ".join(_quote_ident(column) for column in columns)
    create_sql = (
        f"create index {_quote_ident(index_name)} "
        f"on {_quote_ident(table_name)} ({column_sql})"
    )
    try:
        frappe.db.sql(create_sql)
    except Exception as exc:
        if not _is_duplicate_index_error(exc):
            raise


def execute() -> None:
    for doctype, index_name, columns in INDEX_SPECS:
        _create_index_if_missing(doctype, index_name, columns)
