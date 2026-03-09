from __future__ import annotations

import frappe

from acentem_takipte.acentem_takipte.utils.metrics import build_metric_event


def log_renewal_job_summary(summary: dict[str, int]) -> None:
    frappe.logger("acentem_takipte").info(
        "AT renewal task job summary: %s",
        build_metric_event(
            "renewal.task_job",
            dimensions={"component": "renewal.pipeline"},
            values=summary,
        ),
    )


def log_renewal_remediation_summary(summary: dict[str, int]) -> None:
    frappe.logger("acentem_takipte").info(
        "AT renewal stale remediation summary: %s",
        build_metric_event(
            "renewal.stale_remediation",
            dimensions={"component": "renewal.pipeline"},
            values=summary,
        ),
    )
