from __future__ import annotations

import importlib
import sys

_ALIASES = {
    "accounting": "acentem_takipte.acentem_takipte.api.accounting",
    "admin_jobs": "acentem_takipte.acentem_takipte.api.admin_jobs",
    "break_glass": "acentem_takipte.acentem_takipte.api.break_glass",
    "branches": "acentem_takipte.acentem_takipte.api.branches",
    "communication": "acentem_takipte.acentem_takipte.api.communication",
    "customers": "acentem_takipte.acentem_takipte.api.customers",
    "dashboard": "acentem_takipte.acentem_takipte.api.dashboard",
    "filter_presets": "acentem_takipte.acentem_takipte.api.filter_presets",
    "list_exports": "acentem_takipte.acentem_takipte.api.list_exports",
    "mutation_access": "acentem_takipte.acentem_takipte.api.mutation_access",
    "quick_create": "acentem_takipte.acentem_takipte.api.quick_create",
    "reports": "acentem_takipte.acentem_takipte.api.reports",
    "security": "acentem_takipte.acentem_takipte.api.security",
    "seed": "acentem_takipte.acentem_takipte.api.seed",
    "session": "acentem_takipte.acentem_takipte.api.session",
    "smoke": "acentem_takipte.acentem_takipte.api.smoke",
    "versioning": "acentem_takipte.acentem_takipte.api.versioning",
}


def _register_alias(alias_name: str, target_module: str):
    module = importlib.import_module(target_module)
    sys.modules[f"{__name__}.{alias_name}"] = module
    globals()[alias_name] = module
    return module


for _alias_name, _target_module in _ALIASES.items():
    _register_alias(_alias_name, _target_module)


__all__ = sorted(_ALIASES)
