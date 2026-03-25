from __future__ import annotations

from types import SimpleNamespace

from acentem_takipte.acentem_takipte.api import customers as customers_api


def test_search_customer_by_identity_returns_masked_payload_for_non_sensitive_user(monkeypatch):
    monkeypatch.setattr(customers_api, "assert_authenticated", lambda: "partner@example.com")
    monkeypatch.setattr(customers_api, "normalize_requested_office_branch", lambda office_branch, user=None: office_branch)
    monkeypatch.setattr(customers_api, "normalize_identity_number", lambda value: "12345678901")
    monkeypatch.setattr(customers_api, "has_sensitive_access", lambda user=None: False)

    calls = []
    monkeypatch.setattr(
        customers_api,
        "masked_query_gate",
        lambda user, endpoint="", row_count=0: calls.append((user, endpoint, row_count)),
    )
    monkeypatch.setattr(
        customers_api.frappe,
        "db",
        SimpleNamespace(
            get_value=lambda *args, **kwargs: {
                "name": "AT-CUST-0001",
                "full_name": "Ali Veli",
                "tax_id": "12345678901",
                "masked_tax_id": "12*******01",
                "phone": "05321234567",
                "masked_phone": "053******67",
                "email": "ali@example.com",
                "office_branch": "ANK",
            }
        ),
    )

    result = customers_api.search_customer_by_identity.__wrapped__("12345678901", office_branch="ANK")

    assert result["exists"] is True
    assert result["is_masked"] is True
    assert result["access_request_allowed"] is True
    assert result["customer"]["tax_id"] == "12*******01"
    assert calls == [("partner@example.com", "customer_global_search", 1)]


def test_search_customer_by_identity_returns_clear_payload_for_sensitive_user(monkeypatch):
    monkeypatch.setattr(customers_api, "assert_authenticated", lambda: "manager@example.com")
    monkeypatch.setattr(customers_api, "normalize_requested_office_branch", lambda office_branch, user=None: office_branch)
    monkeypatch.setattr(customers_api, "normalize_identity_number", lambda value: "12345678901")
    monkeypatch.setattr(customers_api, "has_sensitive_access", lambda user=None: True)
    monkeypatch.setattr(customers_api, "masked_query_gate", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        customers_api.frappe,
        "db",
        SimpleNamespace(
            get_value=lambda *args, **kwargs: {
                "name": "AT-CUST-0001",
                "full_name": "Ali Veli",
                "tax_id": "12345678901",
                "masked_tax_id": "12*******01",
                "phone": "05321234567",
                "masked_phone": "053******67",
                "email": "ali@example.com",
                "office_branch": "ANK",
            }
        ),
    )

    result = customers_api.search_customer_by_identity.__wrapped__("12345678901", office_branch="ANK")

    assert result["exists"] is True
    assert result["is_masked"] is False
    assert result["customer"]["tax_id"] == "12345678901"


def test_create_customer_access_request_logs_decision_event(monkeypatch):
    monkeypatch.setattr(customers_api, "assert_authenticated", lambda: "partner@example.com")
    monkeypatch.setattr(customers_api, "assert_post_request", lambda message=None: None)
    monkeypatch.setattr(
        customers_api.frappe,
        "db",
        SimpleNamespace(exists=lambda doctype, name: True),
    )

    calls = []
    monkeypatch.setattr(
        customers_api,
        "log_decision_event",
        lambda **kwargs: calls.append(kwargs),
    )

    result = customers_api.create_customer_access_request.__wrapped__(
        "AT-CUST-0001",
        "Musteri kaydi transfer sureci icin erisim gerekiyor.",
        request_kind="transfer",
    )

    assert result["ok"] is True
    assert result["request_kind"] == "transfer"
    assert calls and calls[0]["reference_name"] == "AT-CUST-0001"
    assert calls[0]["action_summary"] == "TRANSFER_REQUEST"
