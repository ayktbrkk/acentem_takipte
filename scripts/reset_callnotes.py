import frappe
frappe.init(site="at.localhost", sites_path="/home/aykut/frappe-bench/sites")
frappe.connect()

rows = frappe.db.sql("SELECT name FROM `tabAT Call Note`")
print("Existing AT Call Note records:", rows)
for (name,) in rows:
    print(f"Deleting: {name}")
frappe.db.sql("DELETE FROM `tabAT Call Note`")
frappe.db.commit()
frappe.db.sql("UPDATE tabSeries SET current = 0 WHERE name = %s", ("AT-CALL-2026-",))
frappe.db.sql("UPDATE tabSeries SET current = 0 WHERE name = %s", ("AT-SEG-2026-",))
frappe.db.sql("UPDATE tabSeries SET current = 0 WHERE name = %s", ("AT-CAMP-2026-",))
frappe.db.sql("UPDATE tabSeries SET current = 0 WHERE name = %s", ("AT-DOC-2026-",))
frappe.db.sql("UPDATE tabSeries SET current = 0 WHERE name = %s", ("AT-NOTIF-2026-",))
frappe.db.commit()
print("Done - series reset")
