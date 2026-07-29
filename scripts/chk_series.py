"""Check naming series for AT doctypes."""
import os, sys
sys.path.insert(0, "/home/aykut/frappe-bench/apps/frappe")
os.chdir("/home/aykut/frappe-bench")
import frappe
frappe.init(site="at.localhost", sites_path="./sites")
frappe.connect()

rows = frappe.db.sql("SELECT name, current FROM tabSeries WHERE name LIKE %s", ("AT%%",))
print("--- Series entries ---")
for r in rows:
    print(r)
if not rows:
    print("(none found)")

# Also check the autoname from doctype metadata
for dt in ["AT Call Note", "AT Segment", "AT Campaign", "AT Document", "AT Notification Draft"]:
    meta = frappe.get_meta(dt)
    print(f"\n{dt}: autoname={meta.autoname}")
