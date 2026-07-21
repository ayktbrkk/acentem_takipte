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

# Domain API redirects
import acentem_takipte.acentem_takipte.domains.accounting.api.endpoints as accounting
import acentem_takipte.acentem_takipte.domains.admin.api.jobs as admin_jobs
import acentem_takipte.acentem_takipte.domains.communications.api.endpoints as communication
import acentem_takipte.acentem_takipte.domains.customers.api.endpoints as customers
import acentem_takipte.acentem_takipte.domains.reports.api.dashboard as dashboard
import acentem_takipte.acentem_takipte.domains.reports.api.endpoints as reports

# Platform API redirects
import acentem_takipte.acentem_takipte.platform.api.filter_presets as filter_presets
import acentem_takipte.acentem_takipte.platform.api.list_exports as list_exports
import acentem_takipte.acentem_takipte.platform.api.mutation_access as mutation_access
import acentem_takipte.acentem_takipte.platform.api.quick_create as quick_create
import acentem_takipte.acentem_takipte.platform.api.security as security
import acentem_takipte.acentem_takipte.platform.api.seed as seed
import acentem_takipte.acentem_takipte.platform.api.session as session
import acentem_takipte.acentem_takipte.platform.api.smoke as smoke
import acentem_takipte.acentem_takipte.platform.api.versioning as versioning

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
