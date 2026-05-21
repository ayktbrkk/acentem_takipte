from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - validated by runtime dependency declaration.
    yaml = None


class AccessPolicyError(RuntimeError):
    """Raised when the declarative access policy file is missing or invalid."""


@dataclass(slots=True)
class DoctypePolicy:
    doctype: str
    visible_to: str
    permission_bundle: str
    runtime_scope: dict[str, Any]
    notes: tuple[str, ...]


@dataclass(slots=True)
class AccessPolicy:
    version: int
    role_families: dict[str, tuple[str, ...]]
    scope_sources: dict[str, dict[str, Any]]
    doctype_policies: dict[str, DoctypePolicy]
    permission_bundles: dict[str, dict[str, Any]]
    governance_rules: dict[str, dict[str, Any]]
    risk_checks: tuple[str, ...]

    def roles_for_family(self, family_name: str) -> tuple[str, ...]:
        return self.role_families.get(str(family_name or "").strip(), ())

    def get_doctype_policy(self, doctype: str) -> DoctypePolicy | None:
        return self.doctype_policies.get(str(doctype or "").strip())

    def get_permission_bundle(self, bundle_name: str) -> dict[str, Any] | None:
        return self.permission_bundles.get(str(bundle_name or "").strip())

    def visible_doctypes_for_family(self, family_name: str) -> tuple[str, ...]:
        family_key = str(family_name or "").strip()
        return tuple(
            doctype
            for doctype, policy in self.doctype_policies.items()
            if policy.visible_to == family_key
        )


_DEFAULT_POLICY_PATH = Path(__file__).resolve().parents[3] / "docs" / "examples" / "access_policy_template.yml"


def get_default_access_policy_path() -> Path:
    return _DEFAULT_POLICY_PATH


def clear_access_policy_cache() -> None:
    _load_access_policy_cached.cache_clear()


def load_access_policy(policy_path: str | Path | None = None, *, use_cache: bool = True) -> AccessPolicy:
    target_path = Path(policy_path) if policy_path else get_default_access_policy_path()
    resolved_path = target_path.expanduser().resolve()
    if use_cache:
        return _load_access_policy_cached(str(resolved_path))
    return _load_access_policy_from_path(resolved_path)


@lru_cache(maxsize=8)
def _load_access_policy_cached(resolved_path: str) -> AccessPolicy:
    return _load_access_policy_from_path(Path(resolved_path))


def _load_access_policy_from_path(policy_path: Path) -> AccessPolicy:
    if yaml is None:
        raise AccessPolicyError("PyYAML is required to load declarative access policies.")
    if not policy_path.exists():
        raise AccessPolicyError(f"Access policy file not found: {policy_path}")

    try:
        raw_data = yaml.safe_load(policy_path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - parser exceptions depend on input.
        raise AccessPolicyError(f"Failed to parse access policy YAML: {policy_path}") from exc

    return build_access_policy(raw_data, source_name=str(policy_path))


def build_access_policy(raw_data: Any, *, source_name: str = "<memory>") -> AccessPolicy:
    return _build_access_policy(raw_data, source_name=source_name)


def _build_access_policy(raw_data: Any, *, source_name: str) -> AccessPolicy:
    root = _expect_mapping(raw_data, "root")

    version = root.get("version")
    if not isinstance(version, int) or version < 1:
        raise AccessPolicyError(f"Access policy at {source_name} must define a positive integer version.")

    role_families = _parse_role_families(root.get("role_families"), source_name=source_name)
    scope_sources = _parse_named_mapping(root.get("scope_sources"), section_name="scope_sources", source_name=source_name)
    permission_bundles = _parse_named_mapping(
        root.get("permission_bundles"),
        section_name="permission_bundles",
        source_name=source_name,
    )
    governance_rules = _parse_named_mapping(
        root.get("governance_rules"),
        section_name="governance_rules",
        source_name=source_name,
    )
    doctype_policies = _parse_doctype_policies(
        root.get("doctype_policies"),
        role_families=role_families,
        permission_bundles=permission_bundles,
        source_name=source_name,
    )
    risk_checks = _parse_string_list(root.get("risk_checks"), field_name="risk_checks", source_name=source_name)

    return AccessPolicy(
        version=version,
        role_families=role_families,
        scope_sources=scope_sources,
        doctype_policies=doctype_policies,
        permission_bundles=permission_bundles,
        governance_rules=governance_rules,
        risk_checks=risk_checks,
    )


def _parse_role_families(raw_data: Any, *, source_name: str) -> dict[str, tuple[str, ...]]:
    families = _expect_mapping(raw_data, "role_families")
    parsed: dict[str, tuple[str, ...]] = {}
    for family_name, family_config in families.items():
        family_key = str(family_name or "").strip()
        if not family_key:
            raise AccessPolicyError(f"role_families in {source_name} contains an empty family name.")
        family_mapping = _expect_mapping(family_config, f"role_families.{family_key}")
        roles = _parse_string_list(
            family_mapping.get("roles"),
            field_name=f"role_families.{family_key}.roles",
            source_name=source_name,
        )
        if not roles:
            raise AccessPolicyError(f"role_families.{family_key}.roles in {source_name} must not be empty.")
        parsed[family_key] = roles
    return parsed


def _parse_named_mapping(raw_data: Any, *, section_name: str, source_name: str) -> dict[str, dict[str, Any]]:
    section = _expect_mapping(raw_data, section_name)
    parsed: dict[str, dict[str, Any]] = {}
    for key, value in section.items():
        normalized_key = str(key or "").strip()
        if not normalized_key:
            raise AccessPolicyError(f"{section_name} in {source_name} contains an empty key.")
        parsed[normalized_key] = _expect_mapping(value, f"{section_name}.{normalized_key}")
    return parsed


def _parse_doctype_policies(
    raw_data: Any,
    *,
    role_families: dict[str, tuple[str, ...]],
    permission_bundles: dict[str, dict[str, Any]],
    source_name: str,
) -> dict[str, DoctypePolicy]:
    if not isinstance(raw_data, list):
        raise AccessPolicyError(f"doctype_policies in {source_name} must be a list.")

    parsed: dict[str, DoctypePolicy] = {}
    for index, item in enumerate(raw_data):
        item_mapping = _expect_mapping(item, f"doctype_policies[{index}]")
        doctype = str(item_mapping.get("doctype") or "").strip()
        if not doctype:
            raise AccessPolicyError(f"doctype_policies[{index}] in {source_name} is missing doctype.")
        if doctype in parsed:
            raise AccessPolicyError(f"doctype_policies in {source_name} defines duplicate doctype '{doctype}'.")

        visible_to = str(item_mapping.get("visible_to") or "").strip()
        if visible_to not in role_families:
            raise AccessPolicyError(
                f"doctype_policies[{index}] in {source_name} references unknown role family '{visible_to}'."
            )

        permission_bundle = str(item_mapping.get("permission_bundle") or "").strip()
        if permission_bundle not in permission_bundles:
            raise AccessPolicyError(
                f"doctype_policies[{index}] in {source_name} references unknown permission bundle '{permission_bundle}'."
            )

        runtime_scope = _expect_mapping(item_mapping.get("runtime_scope"), f"doctype_policies[{index}].runtime_scope")
        scope_type = str(runtime_scope.get("type") or "").strip()
        if not scope_type:
            raise AccessPolicyError(
                f"doctype_policies[{index}].runtime_scope in {source_name} must define a non-empty type."
            )

        notes = _parse_optional_string_list(
            item_mapping.get("notes"),
            field_name=f"doctype_policies[{index}].notes",
            source_name=source_name,
        )

        parsed[doctype] = DoctypePolicy(
            doctype=doctype,
            visible_to=visible_to,
            permission_bundle=permission_bundle,
            runtime_scope=runtime_scope,
            notes=notes,
        )
    return parsed


def _parse_string_list(raw_data: Any, *, field_name: str, source_name: str) -> tuple[str, ...]:
    if not isinstance(raw_data, list):
        raise AccessPolicyError(f"{field_name} in {source_name} must be a list.")
    return tuple(_normalize_non_empty_string(item, field_name=field_name, source_name=source_name) for item in raw_data)


def _parse_optional_string_list(raw_data: Any, *, field_name: str, source_name: str) -> tuple[str, ...]:
    if raw_data is None:
        return ()
    return _parse_string_list(raw_data, field_name=field_name, source_name=source_name)


def _normalize_non_empty_string(raw_value: Any, *, field_name: str, source_name: str) -> str:
    normalized = str(raw_value or "").strip()
    if not normalized:
        raise AccessPolicyError(f"{field_name} in {source_name} contains an empty string value.")
    return normalized


def _expect_mapping(raw_value: Any, field_name: str) -> dict[str, Any]:
    if not isinstance(raw_value, dict):
        raise AccessPolicyError(f"{field_name} must be a mapping.")
    return dict(raw_value)