# audit(facade): Keep the DocType class exported from the package root for
# Frappe's dotted-path imports and compatibility with existing tests.
from .at_notification_draft import ATNotificationDraft

__all__ = ["ATNotificationDraft"]

