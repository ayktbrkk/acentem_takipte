import frappe

def publish_realtime_event(doc, method=None):
    """
    Publishes a real-time event to the frontend when a document is updated.
    """
    event_name = "at_record_changed"
    
    # Payload contains basic info about what changed
    payload = {
        "doctype": doc.doctype,
        "name": doc.name,
        "method": method,
        "status": doc.get("status"),
        "customer": doc.get("customer"),
        "owner": doc.owner,
    }
    
    # Broadcast to all connected clients
    frappe.publish_realtime(event_name, payload)

def on_record_change(doc, method=None):
    """Generic hook handler for real-time record changes."""
    if method in ["after_insert", "on_update", "on_trash"]:
        publish_realtime_event(doc, method)
