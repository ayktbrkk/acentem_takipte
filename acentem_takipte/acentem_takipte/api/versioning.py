from __future__ import annotations

from typing import Any

DEFAULT_API_VERSION = "v1"
SUPPORTED_API_VERSIONS = ("v1", "v2")


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
