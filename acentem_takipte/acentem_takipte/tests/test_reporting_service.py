from types import SimpleNamespace

from acentem_takipte.acentem_takipte.services import reporting


def test_normalize_report_filters_applies_normalized_office_branch(monkeypatch):
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-IST")

    filters = reporting.normalize_report_filters({"office_branch": "BR-OTHER", "branch": "AUTO"})

    assert filters["office_branch"] == "BR-IST"
    assert filters["branch"] == "AUTO"


def test_normalize_report_filters_handles_invalid_json_gracefully():
    assert reporting.normalize_report_filters("{invalid-json}") == {}


def test_normalize_report_filters_ignores_nullish_strings(monkeypatch):
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: None)

    filters = reporting.normalize_report_filters({"branch": " null ", "status": "None", "sales_entity": " SE-1 "})

    assert "branch" not in filters
    assert "status" not in filters
    assert filters["sales_entity"] == "SE-1"


def test_normalize_report_filters_keeps_granularity(monkeypatch):
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: None)

    filters = reporting.normalize_report_filters({"granularity": " monthly "})

    assert filters["granularity"] == "monthly"


def test_build_policy_report_filters_keeps_office_branch_and_date_range(monkeypatch):
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-ANK")

    query_filters = reporting.build_policy_report_filters(
        {"office_branch": "FORBIDDEN", "from_date": "2026-01-01", "to_date": "2026-01-31"}
    )

    assert query_filters["office_branch"] == "BR-ANK"
    assert query_filters["issue_date"] == ["between", ["2026-01-01", "2026-01-31"]]


def test_build_payment_report_filters_keeps_office_branch_and_due_date(monkeypatch):
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-IZM")

    query_filters = reporting.build_payment_report_filters(
        {"office_branch": "FORBIDDEN", "from_date": "2026-03-01"}
    )

    assert query_filters["office_branch"] == "BR-IZM"
    assert query_filters["due_date"] == [">=", "2026-03-01"]


def test_build_payment_report_filters_applies_branch_policy_scope(monkeypatch):
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: None)
    monkeypatch.setattr(reporting.frappe, "get_all", lambda *args, **kwargs: ["POL-001", "POL-002"])

    query_filters = reporting.build_payment_report_filters({"branch": "Kasko"})

    assert query_filters["policy"] == ["in", ["POL-001", "POL-002"]]


def test_build_payment_report_filters_reuses_branch_policy_cache(monkeypatch):
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: None)
    monkeypatch.setattr(reporting.frappe, "local", SimpleNamespace(), raising=False)
    captured = {"calls": 0}

    def _get_all(*args, **kwargs):
        captured["calls"] += 1
        return ["POL-001"]

    monkeypatch.setattr(reporting.frappe, "get_all", _get_all)

    first_filters = reporting.build_payment_report_filters({"branch": "Kasko"})
    second_filters = reporting.build_payment_report_filters({"branch": "Kasko"})

    assert first_filters["policy"] == ["in", ["POL-001"]]
    assert second_filters["policy"] == ["in", ["POL-001"]]
    assert captured["calls"] == 1


def test_get_renewal_performance_report_rows_passes_office_branch(monkeypatch):
    captured = {}
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-IST")
    monkeypatch.setattr(
        reporting.frappe.db,
        "sql",
        lambda query, values, as_dict=False: captured.update({"query": query, "values": values}) or [],
    )

    reporting.get_renewal_performance_report_rows({"office_branch": "FORBIDDEN"})

    assert "office_branch = %(office_branch)s" in captured["query"]
    assert captured["values"]["office_branch"] == "BR-IST"


def test_get_claim_loss_ratio_report_rows_passes_office_branch(monkeypatch):
    captured = {}
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-ANK")
    monkeypatch.setattr(
        reporting.frappe.db,
        "sql",
        lambda query, values, as_dict=False: captured.update({"query": query, "values": values}) or [],
    )

    reporting.get_claim_loss_ratio_report_rows({"office_branch": "FORBIDDEN"})

    assert "c.office_branch = %(office_branch)s" in captured["query"]
    assert captured["values"]["office_branch"] == "BR-ANK"


def test_get_agent_performance_report_rows_passes_office_branch(monkeypatch):
    captured = {}
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-IST")
    monkeypatch.setattr(
        reporting.frappe.db,
        "sql",
        lambda query, values, as_dict=False: captured.update({"query": query, "values": values}) or [],
    )

    reporting.get_agent_performance_report_rows({"office_branch": "FORBIDDEN"})

    assert "p.office_branch = %(office_branch)s" in captured["query"]
    assert captured["values"]["office_branch"] == "BR-IST"
    assert "offer_conversion_rate" in captured["query"]
    assert "completed_renewal_task_count" in captured["query"]
    assert "open_renewal_task_count" in captured["query"]
    assert "renewal_success_rate" in captured["query"]


def test_get_customer_segmentation_report_rows_passes_office_branch(monkeypatch):
    captured = {}
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-IZM")
    monkeypatch.setattr(
        reporting.frappe.db,
        "sql",
        lambda query, values, as_dict=False: captured.update({"query": query, "values": values}) or [],
    )

    reporting.get_customer_segmentation_report_rows({"office_branch": "FORBIDDEN"})

    assert "c.office_branch = %(office_branch)s" in captured["query"]
    assert captured["values"]["office_branch"] == "BR-IZM"
    assert "claim_history_segment" in captured["query"]
    assert "loyalty_segment" in captured["query"]
    assert "active_policy_count" in captured["query"]
    assert "cancelled_policy_count" in captured["query"]


def test_get_communication_operations_report_rows_passes_office_branch_and_status(monkeypatch):
    captured = {}
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-IST")
    monkeypatch.setattr(
        reporting.frappe.db,
        "sql",
        lambda query, values, as_dict=False: captured.update({"query": query, "values": values}) or [],
    )

    reporting.get_communication_operations_report_rows({"office_branch": "FORBIDDEN", "status": "Completed", "branch": "Kasko"})

    assert "c.office_branch = %(office_branch)s" in captured["query"]
    assert "c.branch = %(branch)s" in captured["query"]
    assert "c.status = %(status)s" in captured["query"]
    assert captured["values"]["office_branch"] == "BR-IST"
    assert captured["values"]["branch"] == "Kasko"
    assert captured["values"]["status"] == "Completed"
    assert "draft_count" in captured["query"]
    assert "sent_outbox_count" in captured["query"]


def test_get_reconciliation_operations_report_rows_passes_office_branch_and_status(monkeypatch):
    captured = {}
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-ANK")
    monkeypatch.setattr(
        reporting.frappe.db,
        "sql",
        lambda query, values, as_dict=False: captured.update({"query": query, "values": values}) or [],
    )

    reporting.get_reconciliation_operations_report_rows({"office_branch": "FORBIDDEN", "status": "Open", "branch": "Kasko"})

    assert "ae.office_branch = %(office_branch)s" in captured["query"]
    assert "p.branch = %(branch)s" in captured["query"]
    assert "ri.status = %(status)s" in captured["query"]
    assert captured["values"]["office_branch"] == "BR-ANK"
    assert captured["values"]["branch"] == "Kasko"
    assert captured["values"]["status"] == "Open"
    assert "difference_try" in captured["query"]
    assert "resolution_action" in captured["query"]


def test_get_reconciliation_operations_report_rows_passes_sales_entity(monkeypatch):
    captured = {}
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: None)
    monkeypatch.setattr(
        reporting.frappe.db,
        "sql",
        lambda query, values, as_dict=False: captured.update({"query": query, "values": values}) or [],
    )

    reporting.get_reconciliation_operations_report_rows({"sales_entity": "SE-001"})

    assert "ae.sales_entity = %(sales_entity)s" in captured["query"]
    assert captured["values"]["sales_entity"] == "SE-001"


def test_get_claims_operations_report_rows_passes_claim_filters(monkeypatch):
    captured = {}
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-IZM")
    monkeypatch.setattr(
        reporting.frappe.db,
        "sql",
        lambda query, values, as_dict=False: captured.update({"query": query, "values": values}) or [],
    )

    reporting.get_claims_operations_report_rows(
        {
            "office_branch": "FORBIDDEN",
            "status": "Rejected",
            "branch": "Kasko",
            "insurance_company": "ACME",
        }
    )

    assert "cl.office_branch = %(office_branch)s" in captured["query"]
    assert "cl.claim_status = %(status)s" in captured["query"]
    assert "p.branch = %(branch)s" in captured["query"]
    assert "p.insurance_company = %(insurance_company)s" in captured["query"]
    assert captured["values"]["office_branch"] == "BR-IZM"
    assert captured["values"]["status"] == "Rejected"
    assert "assigned_expert" in captured["query"]
    assert "sent_outbox_count" in captured["query"]


def test_get_policy_list_report_rows_uses_grouped_query_for_granularity(monkeypatch):
    monkeypatch.setattr(
        reporting,
        "_get_policy_list_grouped_rows",
        lambda normalized_filters, granularity, limit=500: [{"period": "2026-03", "policy_count": 3}],
    )

    rows = reporting.get_policy_list_report_rows({"granularity": "monthly"}, limit=250)

    assert rows == [{"period": "2026-03", "policy_count": 3}]

