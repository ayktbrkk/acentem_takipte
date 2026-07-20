from __future__ import annotations
import frappe
from frappe import _
from acentem_takipte.acentem_takipte.services.reports_runtime import build_safe_report_payload, build_report_download_response

@frappe.whitelist()
def enqueue_report_export(report_key: str, filters: dict | None = None, export_format: str = "xlsx"):
    from acentem_takipte.acentem_takipte.api.security import assert_authenticated
    assert_authenticated()
    
    user = frappe.session.user
    job = frappe.enqueue(
        "acentem_takipte.acentem_takipte.services.async_reports.process_report_export",
        report_key=report_key,
        filters=filters,
        export_format=export_format,
        user=user,
        now=frappe.flags.in_test
    )
    
    return {"job_id": job.id, "status": "Queued"}

def process_report_export(report_key: str, filters: dict | None, export_format: str, user: str):
    frappe.set_user(user)
    
    try:
        # 1. Generate payload
        payload = build_safe_report_payload(report_key, filters=filters, limit=5000)
        
        # 2. Build download response (binary content)
        response = build_report_download_response(
            report_key=report_key,
            columns=payload["columns"],
            rows=payload["rows"],
            filters=payload["filters"],
            export_format=export_format
        )
        
        # 3. Save as private file
        file_doc = frappe.get_doc({
            "doctype": "File",
            "file_name": response["filename"],
            "content": response["filecontent"],
            "is_private": 1,
            "folder": "Home/Attachments"
        })
        file_doc.insert(ignore_permissions=True)
        
        # 4. Notify user
        frappe.publish_realtime(
            "at_report_ready",
            {
                "report_key": report_key,
                "file_url": file_doc.file_url,
                "filename": file_doc.file_name
            },
            user=user
        )
        
        # Also create a system notification if possible
        _create_system_notification(user, _("Report Ready"), _("Your report {0} is ready for download.").format(response["filename"]), file_doc.file_url)

    except Exception:
        frappe.log_error(f"Async Export Failed: {report_key}")
        frappe.publish_realtime(
            "at_report_failed",
            {"report_key": report_key, "error": _("Background export failed.")},
            user=user
        )

def _create_system_notification(user: str, subject: str, body: str, link: str):
    # This is a placeholder for actual notification logic if available in the app
    pass
