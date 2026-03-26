from __future__ import annotations

from collections import defaultdict

import frappe


TABLE_NAME = "tabAT Policy"
LEGACY_POLICY_NO_INDEX = "policy_no"
COMPANY_POLICY_NO_INDEX = "uniq_at_policy_company_policy_no"


def _db_type() -> str:
    raw = (
        getattr(frappe.db, "db_type", None)
        or getattr(frappe.conf, "db_type", None)
        or ""
    ).lower()
    if "postgres" in raw:
        return "postgres"
    return "mariadb"


def _quote_ident(identifier: str, *, db_type: str) -> str:
    if db_type == "postgres":
        return f'"{identifier}"'
    return f"`{identifier}`"


def _sanitize_identifier(name: str) -> str:
    return "".join(ch for ch in name if ch.isalnum() or ch == "_")


def _normalize_blank_policy_numbers() -> None:
    db_type = _db_type()
    table_sql = _quote_ident(TABLE_NAME, db_type=db_type)
    policy_no_sql = _quote_ident("policy_no", db_type=db_type)
    null_expr = (
        f"coalesce({policy_no_sql}, '')"
        if db_type == "postgres"
        else f"ifnull({policy_no_sql}, '')"
    )
    frappe.db.sql(
        f"""
        update {table_sql}
        set {policy_no_sql} = null
        where trim({null_expr}) = ''
        """
    )


def _assert_no_company_policy_duplicates() -> None:
    db_type = _db_type()
    table_sql = _quote_ident(TABLE_NAME, db_type=db_type)
    insurance_company_sql = _quote_ident("insurance_company", db_type=db_type)
    policy_no_sql = _quote_ident("policy_no", db_type=db_type)
    duplicates = frappe.db.sql(
        """
        """.strip()
        + f"""
        select {insurance_company_sql} as insurance_company, {policy_no_sql} as policy_no, count(*) as row_count
        from {table_sql}
        where {policy_no_sql} is not null
        group by {insurance_company_sql}, {policy_no_sql}
        having count(*) > 1
        limit 10
        """,
        as_dict=True,
    )
    if not duplicates:
        return

    sample = ", ".join(
        f"{row.insurance_company or '-'} / {row.policy_no or '-'} ({row.row_count})"
        for row in duplicates
    )
    frappe.throw(
        "Cannot migrate policy number model because duplicate insurance_company + policy_no pairs exist: "
        + sample
    )


def _drop_legacy_unique_policy_no_index(*, db_type: str) -> None:
    if db_type == "postgres":
        rows = frappe.db.sql(
            """
            select indexname, indexdef
            from pg_indexes
            where schemaname = current_schema()
              and tablename = %s
            """,
            ("tabAT Policy",),
            as_dict=True,
        )
        for row in rows:
            index_name = str(row.get("indexname") or "")
            index_def = str(row.get("indexdef") or "").lower()
            if "unique" not in index_def:
                continue
            if "(policy_no)" not in index_def.replace('"', ""):
                continue
            safe_name = _sanitize_identifier(index_name)
            if safe_name:
                frappe.db.sql(f'drop index if exists "{safe_name}"')
        return

    rows = frappe.db.sql(
        f"show index from {_quote_ident(TABLE_NAME, db_type=db_type)}", as_dict=True
    )
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[str(row.get("Key_name") or "")].append(row)

    for index_name, index_rows in grouped.items():
        if index_name == "PRIMARY":
            continue
        if any(int(row.get("Non_unique") or 0) != 0 for row in index_rows):
            continue
        ordered_columns = [
            str(row.get("Column_name") or "")
            for row in sorted(
                index_rows, key=lambda item: int(item.get("Seq_in_index") or 0)
            )
        ]
        if ordered_columns != ["policy_no"]:
            continue
        safe_index = _sanitize_identifier(index_name)
        if safe_index:
            table_sql = _quote_ident(TABLE_NAME, db_type=db_type)
            frappe.db.sql(
                f"drop index {_quote_ident(safe_index, db_type=db_type)} on {table_sql}"
            )


def _ensure_company_policy_constraint() -> None:
    frappe.db.add_unique(
        "AT Policy",
        ["insurance_company", "policy_no"],
        COMPANY_POLICY_NO_INDEX,
    )


def execute() -> None:
    db_type = _db_type()
    _normalize_blank_policy_numbers()
    _assert_no_company_policy_duplicates()
    frappe.db.commit()
    _drop_legacy_unique_policy_no_index(db_type=db_type)
    _ensure_company_policy_constraint()
