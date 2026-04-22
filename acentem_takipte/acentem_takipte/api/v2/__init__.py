from __future__ import annotations

# Modern API modules (v2 native)
from . import (
    constants,
    dashboard_security,
    details_lead,
    details_offer,
    filters,
    queries_customers,
    queries_kpis,
    queries_leads,
    serializers,
    tab_payload,
)

# Legacy Redirects (Redirects v2 calls to core api modules)
from acentem_takipte.acentem_takipte.api import (
    accounting,
    admin_jobs,
    branches,
    break_glass,
    communication,
    customers,
    dashboard,
    filter_presets,
    list_exports,
    mutation_access,
    quick_create,
    reports,
    security,
    seed,
    session,
    smoke,
    versioning,
)

__all__ = [
    # Native
    "constants",
    "dashboard_security",
    "details_lead",
    "details_offer",
    "filters",
    "queries_customers",
    "queries_kpis",
    "queries_leads",
    "serializers",
    "tab_payload",
    # Redirects
    "accounting",
    "admin_jobs",
    "branches",
    "break_glass",
    "communication",
    "customers",
    "dashboard",
    "filter_presets",
    "list_exports",
    "mutation_access",
    "quick_create",
    "reports",
    "security",
    "seed",
    "session",
    "smoke",
    "versioning",
]
