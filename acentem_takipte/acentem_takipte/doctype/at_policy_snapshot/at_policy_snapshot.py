from __future__ import annotations

from frappe.model.document import Document
from frappe.utils import now_datetime


class ATPolicySnapshot(Document):
    def before_insert(self):
        if not self.captured_on:
            self.captured_on = now_datetime()

