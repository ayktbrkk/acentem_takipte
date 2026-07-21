"""Legacy API package — re-exports from domain/platform modules."""

# Domain API re-exports
import acentem_takipte.acentem_takipte.domains.accounting.api.endpoints as accounting
import acentem_takipte.acentem_takipte.domains.admin.api.jobs as admin_jobs
import acentem_takipte.acentem_takipte.domains.admin.api.settings as admin_settings
import acentem_takipte.acentem_takipte.domains.communications.api.endpoints as communication
import acentem_takipte.acentem_takipte.domains.customers.api.endpoints as customers
import acentem_takipte.acentem_takipte.domains.reports.api.dashboard as dashboard
import acentem_takipte.acentem_takipte.domains.reports.api.dashboard_cache as dashboard_cache
import acentem_takipte.acentem_takipte.domains.reports.api.dashboard_detail as dashboard_detail
import acentem_takipte.acentem_takipte.domains.leads.api.dashboard as dashboard_lead_logic
import acentem_takipte.acentem_takipte.domains.reports.api.dashboard_metrics as dashboard_metrics
import acentem_takipte.acentem_takipte.domains.reports.api.dashboard_preview as dashboard_preview
import acentem_takipte.acentem_takipte.domains.accounting.api.dashboard as dashboard_reconciliation
import acentem_takipte.acentem_takipte.domains.reports.api.dashboard_scopes as dashboard_scopes
import acentem_takipte.acentem_takipte.domains.reports.api.dashboard_workbench as dashboard_workbench
import acentem_takipte.acentem_takipte.domains.offers.api.endpoints as offers
import acentem_takipte.acentem_takipte.domains.reports.api.endpoints as reports

# Platform API re-exports
import acentem_takipte.acentem_takipte.platform.api.aux_edit_registry as aux_edit_registry
import acentem_takipte.acentem_takipte.platform.api.data_import as data_import
import acentem_takipte.acentem_takipte.platform.api.documents as documents
import acentem_takipte.acentem_takipte.platform.api.filter_presets as filter_presets
import acentem_takipte.acentem_takipte.platform.api.list_exports as list_exports
import acentem_takipte.acentem_takipte.platform.api.mutation_access as mutation_access
import acentem_takipte.acentem_takipte.platform.api.quick_create as quick_create
import acentem_takipte.acentem_takipte.platform.api.quick_payloads as quick_payloads
import acentem_takipte.acentem_takipte.platform.api.record_preview as record_preview
import acentem_takipte.acentem_takipte.platform.api.security as security
import acentem_takipte.acentem_takipte.platform.api.seed as seed
import acentem_takipte.acentem_takipte.platform.api.session as session
import acentem_takipte.acentem_takipte.platform.api.smoke as smoke
import acentem_takipte.acentem_takipte.platform.api.versioning as versioning
