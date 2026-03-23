from types import SimpleNamespace

from acentem_takipte.api import communication


def test_create_quick_notification_draft_uses_customer_office_branch(monkeypatch):
    inserted_payload = {}
    enqueued = []

    monkeypatch.setattr(communication, "_assert_dispatch_mutation_access", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        communication.frappe.db,
        "exists",
        lambda doctype, name: True,
    )
    monkeypatch.setattr(
        communication.frappe,
        "get_doc",
        lambda arg1, arg2=None: (
            SimpleNamespace(event_key="policy_created", channel="WHATSAPP", language="tr", provider_template_name="policy_delivery", get=lambda field: {"body_template": "Body"}.get(field))
            if isinstance(arg1, str)
            else SimpleNamespace(name="DRF-0001", insert=lambda: inserted_payload.update(arg1) or SimpleNamespace(name="DRF-0001"))
        ),
    )
    monkeypatch.setattr(communication.frappe.db, "get_value", lambda doctype, name, field: "Istanbul" if doctype == "AT Customer" else None)
    monkeypatch.setattr(communication.communication_logic, "enqueue_notification_draft", lambda name: enqueued.append(("enqueue", name)))
    monkeypatch.setattr(communication.communication_logic, "send_notification_draft_now", lambda name: enqueued.append(("send_now", name)))

    result = communication.create_quick_notification_draft(
        template="TPL-001",
        recipient="+905551112233",
        customer="CUST-001",
        send_now=0,
    )

    assert result == {"draft": "DRF-0001"}
    assert inserted_payload["office_branch"] == "Istanbul"
    assert inserted_payload["channel"] == "WHATSAPP"
    assert enqueued == [("enqueue", "DRF-0001")]


def test_create_quick_notification_draft_send_now_dispatches(monkeypatch):
    inserted_payload = {}
    calls = []

    monkeypatch.setattr(communication, "_assert_dispatch_mutation_access", lambda *args, **kwargs: None)
    monkeypatch.setattr(communication.frappe.db, "exists", lambda doctype, name: True)
    monkeypatch.setattr(
        communication.frappe,
        "get_doc",
        lambda arg1, arg2=None: (
            SimpleNamespace(event_key="claim_status_update", channel="SMS", language="tr", provider_template_name=None, get=lambda field: {"body_template": "Body"}.get(field))
            if isinstance(arg1, str)
            else SimpleNamespace(name="DRF-0002", insert=lambda: inserted_payload.update(arg1) or SimpleNamespace(name="DRF-0002"))
        ),
    )
    monkeypatch.setattr(communication.frappe.db, "get_value", lambda doctype, name, field: None)
    monkeypatch.setattr(communication, "get_default_office_branch", lambda: "Ankara")
    monkeypatch.setattr(communication.communication_logic, "enqueue_notification_draft", lambda name: calls.append(("enqueue", name)))
    monkeypatch.setattr(communication.communication_logic, "send_notification_draft_now", lambda name: calls.append(("send_now", name)))

    communication.create_quick_notification_draft(
        template="TPL-002",
        recipient="ada@example.com",
        channel="Email",
        send_now=1,
    )

    assert inserted_payload["office_branch"] == "Ankara"
    assert inserted_payload["channel"] == "Email"
    assert calls == [("enqueue", "DRF-0002"), ("send_now", "DRF-0002")]


def test_create_quick_notification_draft_checks_customer_and_reference_permissions(monkeypatch):
    calls = []

    monkeypatch.setattr(communication, "_assert_dispatch_mutation_access", lambda *args, **kwargs: None)
    monkeypatch.setattr(communication.frappe.db, "exists", lambda doctype, name: True)
    monkeypatch.setattr(
        communication.frappe,
        "get_doc",
        lambda arg1, arg2=None: (
            SimpleNamespace(event_key="policy_created", channel="SMS", language="tr", provider_template_name=None, get=lambda field: {"body_template": "Body"}.get(field))
            if isinstance(arg1, str)
            else SimpleNamespace(name="DRF-0003", insert=lambda: SimpleNamespace(name="DRF-0003"))
        ),
    )
    monkeypatch.setattr(communication.frappe.db, "get_value", lambda doctype, name, field: "Istanbul" if field == "office_branch" else None)
    monkeypatch.setattr(communication, "assert_doc_permission", lambda doctype, name, permtype: calls.append((doctype, name, permtype)))
    monkeypatch.setattr(communication, "assert_office_branch_access", lambda branch, user=None: branch)
    monkeypatch.setattr(communication.communication_logic, "enqueue_notification_draft", lambda name: None)

    communication.create_quick_notification_draft(
        template="TPL-003",
        recipient="+905551112255",
        customer="CUST-003",
        reference_doctype="AT Policy",
        reference_name="POL-003",
    )

    assert ("AT Customer", "CUST-003", "read") in calls
    assert ("AT Policy", "POL-003", "read") in calls
