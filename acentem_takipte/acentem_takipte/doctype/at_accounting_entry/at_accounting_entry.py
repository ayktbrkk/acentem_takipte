from __future__ import annotations

from frappe.model.document import Document
from frappe.utils import flt
from acentem_takipte.acentem_takipte.utils.statuses import ATAccountingEntryStatus

RECONCILIATION_TOLERANCE = 0.01


class ATAccountingEntry(Document):
    def validate(self):
        local_try = flt(self.local_amount_try)
        external_try = flt(self.external_amount_try)
        difference = external_try - local_try

        self.difference_try = difference
        self.needs_reconciliation = (
            1
            if abs(difference) > RECONCILIATION_TOLERANCE or self.status == ATAccountingEntryStatus.FAILED
            else 0
        )

