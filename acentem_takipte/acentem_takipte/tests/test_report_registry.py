from acentem_takipte.acentem_takipte.services.report_registry import get_report_definition


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
