from __future__ import annotations

from frappe.model.document import Document


class ATDocument(Document):
    def before_insert(self):
        # The upload service owns display_name/sequence generation.
        # This fallback only runs when the value is still empty.
        if not self.display_name:
            self.display_name = _build_display_name(self)

    def before_save(self):
        # Recompute only when blank; users may edit the visible name.
        if not self.display_name:
            self.display_name = _build_display_name(self)


def _build_display_name(doc) -> str:
    """Build a readable fallback display name for AT Document.

    Fallback format: ``[SubType]_[YYYYMMDD]``
    The central upload API service owns sequence-safe naming.
    """
    from frappe.utils import getdate

    sub_type = (doc.document_sub_type or "").strip() or "Document"

    # Date source: document_date, creation, or today.
    date_val = doc.document_date or doc.creation or getdate()
    date_str = str(date_val).split(" ")[0].replace("-", "")
    return f"{sub_type}_{date_str}" if date_str else sub_type
