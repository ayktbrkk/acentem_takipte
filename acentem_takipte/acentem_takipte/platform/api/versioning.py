from __future__ import annotations

from typing import Any

DEFAULT_API_VERSION = "v1"
SUPPORTED_API_VERSIONS = ("v1", "v2")
API_BASE_MODULE = "acentem_takipte.acentem_takipte.api"
_APP_ROOT_MODULE = "acentem_takipte.acentem_takipte"

# v1 implementation modules re-exported by their v2 alias module (api/v2/<alias>).
_V2_ALIAS_MODULES = {
    "platform.api.quick_create": "quick_create",
    "platform.api.session": "session",
    "domains.reports.api.endpoints": "reports",
    "domains.reports.api.dashboard": "dashboard",
}


def normalize_api_version(version: str | None, *, default: str = DEFAULT_API_VERSION) -> str:
    candidate = str(version or "").strip().lower() or default
    if candidate not in SUPPORTED_API_VERSIONS:
        raise ValueError(f"Unsupported API version: {candidate}")
    return candidate


def build_versioned_method_path(method: str, version: str | None = None) -> str:
    normalized_version = normalize_api_version(version)
    method_name = str(method or "").strip()
    if not method_name:
        raise ValueError("Method name is required.")
    return f"{normalized_version}:{method_name}"


def build_versioned_api_method_path(method: str, version: str | None = None) -> str:
    normalized_version = normalize_api_version(version)
    method_name = str(method or "").strip()
    if not method_name:
        raise ValueError("Method name is required.")

    if method_name.startswith(API_BASE_MODULE + "."):
        # Already inside the API namespace: rewrite the version segment.
        rest = method_name[len(API_BASE_MODULE) :].lstrip(".")
        if rest.startswith("v1.") or rest.startswith("v2."):
            _, module_path = rest.split(".", 1)
        else:
            module_path = rest
        return f"{API_BASE_MODULE}.{normalized_version}.{module_path}"

    module_path = method_name
    if module_path.startswith(_APP_ROOT_MODULE + "."):
        module_path = module_path[len(_APP_ROOT_MODULE) + 1 :]

    # Map a known v1 implementation module to its v2 alias module.
    for v1_module, alias_name in _V2_ALIAS_MODULES.items():
        if module_path == v1_module or module_path.startswith(v1_module + "."):
            suffix = module_path[len(v1_module) :].lstrip(".")
            return f"{API_BASE_MODULE}.{normalized_version}.{alias_name}.{suffix}".rstrip(".")

    return f"{API_BASE_MODULE}.{normalized_version}.{module_path}"


def build_version_meta(
    *,
    version: str | None = None,
    deprecated: bool = False,
    successor: str | None = None,
    extras: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_version = normalize_api_version(version)
    payload = {
        "version": normalized_version,
        "deprecated": bool(deprecated),
        "successor": str(successor or "").strip() or None,
    }
    if extras:
        payload.update(dict(extras))
    return payload
