from acentem_takipte.acentem_takipte.services import reporting


def test_normalize_report_filters_applies_normalized_office_branch(monkeypatch):
    monkeypatch.setattr(reporting, "normalize_requested_office_branch", lambda office_branch=None, user=None: "BR-IST")

    filters = reporting.normalize_report_filters({"office_branch": "BR-OTHER", "branch": "AUTO"})

    assert filters["office_branch"] == "BR-IST"
    assert filters["branch"] == "AUTO"


def test_normalize_report_filters_handles_invalid_json_gracefully():
    assert reporting.normalize_report_filters("{invalid-json}") == {}


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
