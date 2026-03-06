"""Centralized status constants for AT DocType controllers."""

from __future__ import annotations


class ATOfferStatus:
    DRAFT = "Draft"
    SENT = "Sent"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"
    CONVERTED = "Converted"

    CONVERTIBLE = frozenset({SENT, ACCEPTED})
    CREATION_ALLOWED = frozenset({DRAFT, SENT, ACCEPTED, REJECTED})


class ATLeadStatus:
    DRAFT = "Draft"
    OPEN = "Open"
    REPLIED = "Replied"
    CLOSED = "Closed"


class ATPolicyStatus:
    IPT = "IPT"
    KYT = "KYT"
    ACTIVE = "Active"


class ATPaymentStatus:
    DRAFT = "Draft"
    PAID = "Paid"
    CANCELLED = "Cancelled"

    VALID = frozenset({DRAFT, PAID, CANCELLED})


class ATPolicyEndorsementStatus:
    DRAFT = "Draft"
    APPLIED = "Applied"
    CANCELLED = "Cancelled"


class ATRenewalTaskStatus:
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    DONE = "Done"
    CANCELLED = "Cancelled"


class ATReconciliationItemStatus:
    OPEN = "Open"
    RESOLVED = "Resolved"
    IGNORED = "Ignored"

    RESOLUTION_REQUIRED = frozenset({OPEN})
    CLOSED = frozenset({RESOLVED, IGNORED})


class ATAccountingEntryStatus:
    DRAFT = "Draft"
    SYNCED = "Synced"
    FAILED = "Failed"


class ATNotificationOutboxStatus:
    QUEUED = "Queued"
    PROCESSING = "Processing"
    SENT = "Sent"
    FAILED = "Failed"
    DEAD = "Dead"


class ATNotificationDraftStatus:
    DRAFT = "Draft"
    QUEUED = "Queued"
    SENT = "Sent"
    FAILED = "Failed"
    DEAD = "Dead"


class ATClaimStatus:
    DRAFT = "Draft"
    OPEN = "Open"
    UNDER_REVIEW = "Under Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    PAID = "Paid"
    CLOSED = "Closed"
