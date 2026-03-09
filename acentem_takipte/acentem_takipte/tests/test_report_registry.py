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
