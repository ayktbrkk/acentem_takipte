import frappe
import json

doctypes = ["AT Policy", "AT Offer", "AT Lead", "AT Customer", "AT Claim", "AT Payment"]

def check_fields():
    frappe.init(site="at.localhost")
    frappe.connect()
    try:
        report = {}
        for dt in doctypes:
            meta = frappe.get_meta(dt)
            report[dt] = [f.fieldname for f in meta.fields]
        print(json.dumps(report, indent=2))
    finally:
        frappe.destroy()

if __name__ == "__main__":
    check_fields()
