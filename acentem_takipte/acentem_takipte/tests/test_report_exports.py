from acentem_takipte.acentem_takipte.services import report_exports


def test_build_report_filename_uses_expected_extension():
    filename = report_exports.build_report_filename("policy_list", "xlsx")

    assert filename.startswith("policy_list_")
    assert filename.endswith(".xlsx")


def test_build_report_title_falls_back_to_report_key():
    assert report_exports.build_report_title("unknown_report", "tr") == "unknown_report"


def test_build_report_title_supports_claim_loss_ratio():
    assert report_exports.build_report_title("claim_loss_ratio", "tr") == "Hasar Prim Orani Raporu"


def test_build_report_title_supports_agent_performance():
    assert report_exports.build_report_title("agent_performance", "tr") == "Acente Uretim Karnesi"
