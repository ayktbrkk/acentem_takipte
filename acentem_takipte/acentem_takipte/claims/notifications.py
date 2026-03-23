from __future__ import annotations

from acentem_takipte.acentem_takipte.utils.statuses import ATClaimStatus


CLAIM_STATUS_TEMPLATE_KEYS = {
    ATClaimStatus.OPEN: "claim_status_open",
    ATClaimStatus.UNDER_REVIEW: "claim_status_under_review",
    ATClaimStatus.APPROVED: "claim_status_approved",
    ATClaimStatus.REJECTED: "claim_status_rejected",
    ATClaimStatus.PAID: "claim_status_paid",
    ATClaimStatus.CLOSED: "claim_status_closed",
}


def resolve_claim_status_template_key(claim_status: str | None) -> str | None:
    return CLAIM_STATUS_TEMPLATE_KEYS.get(str(claim_status or "").strip())

