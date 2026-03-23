from types import SimpleNamespace

from acentem_takipte.acentem_takipte.api import communication


def test_get_queue_snapshot_applies_normalized_office_branch(monkeypatch):
    get_list_calls = []
    sql_calls = []

    monkeypatch.setattr(communication, "assert_authenticated", lambda: None)
    monkeypatch.setattr(communication, "normalize_requested_office_branch", lambda branch: "Istanbul")
    monkeypatch.setattr(
        communication.frappe,
        "get_list",
        lambda doctype, **kwargs: get_list_calls.append((doctype, kwargs)) or [],
    )
    monkeypatch.setattr(
        communication.frappe.db,
        "sql",
        lambda query, params=None, as_dict=False: sql_calls.append((query, params, as_dict)) or [],
    )

    payload = communication.get_queue_snapshot(office_branch="Ankara", limit=20)

    assert payload["selected_office_branch"] == "Istanbul"
    assert get_list_calls[0][0] == "AT Notification Outbox"
    assert get_list_calls[0][1]["filters"]["office_branch"] == "Istanbul"
    assert get_list_calls[1][0] == "AT Notification Draft"
    assert get_list_calls[1][1]["filters"]["office_branch"] == "Istanbul"
    assert sql_calls[0][1]["office_branch"] == "Istanbul"

