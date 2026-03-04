from __future__ import annotations


def _to_int(value) -> int:
    try:
        return int(value or 0)
    except Exception:
        return 0


def _to_float(value) -> float:
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def attach_customer_portfolio_summary(rows: list[dict], summary_map: dict[str, dict]) -> None:
    for row in rows:
        summary = summary_map.get(row.get("name"), {})
        row["active_policy_count"] = _to_int(summary.get("active_policy_count"))
        row["open_offer_count"] = _to_int(summary.get("open_offer_count"))
        row["active_policy_gross_premium"] = _to_float(summary.get("active_policy_gross_premium"))
        row["has_active_policy"] = bool(row["active_policy_count"])
        row["has_open_offer"] = bool(row["open_offer_count"])


def mask_customer_sensitive_fields(rows: list[dict]) -> None:
    for row in rows:
        row["tax_id"] = row.get("masked_tax_id")
        row["phone"] = row.get("masked_phone")


def build_paged_rows_response(*, rows: list[dict], total: int, page: int, page_length: int) -> dict:
    return {
        "rows": rows,
        "total": total,
        "page": page,
        "page_length": page_length,
    }


def reorder_rows_by_name(rows: list[dict], ordered_names: list[str]) -> list[dict]:
    row_map = {str(row.get("name") or ""): row for row in rows}
    ordered_rows = []
    for name in ordered_names:
        key = str(name or "")
        row = row_map.get(key)
        if row:
            ordered_rows.append(row)
    return ordered_rows


def attach_lead_workbench_derived_fields(
    rows: list[dict],
    *,
    lead_stale_state_fn,
    lead_can_convert_to_offer_fn,
    lead_conversion_state_fn,
    lead_conversion_missing_fieldnames_fn,
    lead_next_conversion_action_fn,
) -> None:
    for row in rows:
        row["stale_state"] = lead_stale_state_fn(row.get("modified"))
        row["can_convert_to_offer"] = lead_can_convert_to_offer_fn(row)
        row["conversion_state"] = lead_conversion_state_fn(row)
        row["conversion_missing_fields"] = lead_conversion_missing_fieldnames_fn(row)
        row["next_conversion_action"] = lead_next_conversion_action_fn(row)


def filter_lead_workbench_rows(rows: list[dict], *, stale_state: str = "", can_convert_only: bool = False) -> list[dict]:
    return [
        row
        for row in rows
        if (not stale_state or row.get("stale_state") == stale_state)
        and (not can_convert_only or bool(row.get("can_convert_to_offer")))
    ]
