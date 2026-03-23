from acentem_takipte.services import report_registry
from acentem_takipte.services.report_registry import get_report_definition


def test_agent_performance_report_definition_includes_scorecard_columns():
    definition = get_report_definition("agent_performance")

    assert "office_branch" in definition["columns"]
    assert "converted_offer_count" in definition["columns"]
    assert "offer_conversion_rate" in definition["columns"]
    assert "completed_renewal_task_count" in definition["columns"]
    assert "open_renewal_task_count" in definition["columns"]
    assert "renewal_success_rate" in definition["columns"]


def test_customer_segmentation_report_definition_includes_loyalty_columns():
    definition = get_report_definition("customer_segmentation")

    assert "assigned_agent" in definition["columns"]
    assert "active_policy_count" in definition["columns"]
    assert "cancelled_policy_count" in definition["columns"]
    assert "claim_history_segment" in definition["columns"]
    assert "loyalty_segment" in definition["columns"]


def test_communication_operations_report_definition_includes_delivery_columns():
    definition = get_report_definition("communication_operations")

    assert "campaign_name" in definition["columns"]
    assert "matched_customer_count" in definition["columns"]
    assert "sent_count" in definition["columns"]
    assert "sent_outbox_count" in definition["columns"]
    assert "failed_outbox_count" in definition["columns"]


def test_reconciliation_operations_report_definition_includes_resolution_columns():
    definition = get_report_definition("reconciliation_operations")

    assert "accounting_entry" in definition["columns"]
    assert "mismatch_type" in definition["columns"]
    assert "difference_try" in definition["columns"]
    assert "resolution_action" in definition["columns"]
    assert "needs_reconciliation" in definition["columns"]


def test_claims_operations_report_definition_includes_claim_workflow_columns():
    definition = get_report_definition("claims_operations")

    assert "claim_no" in definition["columns"]
    assert "assigned_expert" in definition["columns"]
    assert "rejection_reason" in definition["columns"]
    assert "appeal_status" in definition["columns"]
    assert "sent_outbox_count" in definition["columns"]


def test_build_report_payload_normalizes_non_numeric_limit(monkeypatch):
    captured = {}
    monkeypatch.setattr(report_registry, "normalize_report_filters", lambda filters=None: {"status": "Active"})
    monkeypatch.setitem(
        report_registry.REPORT_DEFINITIONS,
        "policy_list",
        {
            **report_registry.REPORT_DEFINITIONS["policy_list"],
            "rows_fn": lambda filters, limit: captured.update({"filters": filters, "limit": limit}) or [],
        },
    )

    payload = report_registry.build_report_payload("policy_list", filters={"status": "Active"}, limit="abc")

    assert captured["filters"] == {"status": "Active"}
    assert captured["limit"] == 1
    assert payload["total"] == 0


def test_build_report_payload_keeps_positive_string_limit(monkeypatch):
    captured = {}
    monkeypatch.setattr(report_registry, "normalize_report_filters", lambda filters=None: {})
    monkeypatch.setitem(
        report_registry.REPORT_DEFINITIONS,
        "policy_list",
        {
            **report_registry.REPORT_DEFINITIONS["policy_list"],
            "rows_fn": lambda filters, limit: captured.update({"limit": limit}) or [{"name": "POL-001"}],
        },
    )

    payload = report_registry.build_report_payload("policy_list", filters={}, limit="25")

    assert captured["limit"] == 25
    assert payload["total"] == 1


def test_build_report_payload_uses_granularity_columns_for_policy_list(monkeypatch):
    monkeypatch.setattr(report_registry, "normalize_report_filters", lambda filters=None: {"granularity": "monthly"})
    monkeypatch.setitem(
        report_registry.REPORT_DEFINITIONS,
        "policy_list",
        {
            **report_registry.REPORT_DEFINITIONS["policy_list"],
            "rows_fn": lambda filters, limit: [{"period": "2026-03"}],
        },
    )

    payload = report_registry.build_report_payload("policy_list", filters={"granularity": "monthly"}, limit=50)

    assert payload["columns"] == ["period", "period_label", "policy_count", "total_gross_premium", "total_commission"]


def test_build_report_payload_keeps_default_columns_when_no_granularity(monkeypatch):
    monkeypatch.setattr(report_registry, "normalize_report_filters", lambda filters=None: {})
    monkeypatch.setitem(
        report_registry.REPORT_DEFINITIONS,
        "policy_list",
        {
            **report_registry.REPORT_DEFINITIONS["policy_list"],
            "rows_fn": lambda filters, limit: [{"name": "POL-001"}],
        },
    )

    payload = report_registry.build_report_payload("policy_list", filters={}, limit=50)

    assert "name" in payload["columns"]
    assert "policy_no" in payload["columns"]
