from __future__ import annotations

from typing import Any

from acentem_takipte.acentem_takipte.platform.permissions.access_policy import DoctypePolicy, load_access_policy


PERMISSION_KEYS = (
    "read",
    "write",
    "create",
    "delete",
    "submit",
    "cancel",
    "amend",
    "report",
    "export",
    "import",
    "share",
    "print",
    "email",
)
OPERATIONAL_ROLE_FAMILY = "operational"
BRANCH_PERMISSION_SCOPE_TYPES = {"branch_only", "branch_and_sales_entity"}
HOOK_ONLY_SCOPE_TYPES = {"policy_link_scope", "payment_link_scope", "accounting_entry_link_scope"}

_BRANCH_PERMISSION_MODULE = "acentem_takipte.acentem_takipte.doctype.branch_permissions"
_CUSTOMER_PERMISSION_MODULE = "acentem_takipte.acentem_takipte.doctype.at_customer.at_customer"
_DOCUMENT_PERMISSION_MODULE = "acentem_takipte.acentem_takipte.doctype.at_document.at_document"


def build_permission_matrix() -> dict[str, dict[str, dict[int, dict[str, int]]]]:
    policy = load_access_policy()
    matrix: dict[str, dict[str, dict[int, dict[str, int]]]] = {}

    for doctype, doctype_policy in policy.doctype_policies.items():
        matrix[doctype] = _build_matrix_entry_for_policy(policy, doctype_policy)

    return matrix


def build_runtime_permission_hooks() -> tuple[dict[str, str], dict[str, str]]:
    policy = load_access_policy()
    query_hooks: dict[str, str] = {}
    permission_hooks: dict[str, str] = {}

    for doctype, doctype_policy in policy.doctype_policies.items():
        query_path, permission_path = _hook_paths_for_policy(doctype, doctype_policy)
        if query_path and permission_path:
            query_hooks[doctype] = query_path
            permission_hooks[doctype] = permission_path
    return query_hooks, permission_hooks


def get_branch_scoped_doctype_policy(doctype: str) -> DoctypePolicy | None:
    doctype_policy = load_access_policy().get_doctype_policy(doctype)
    if doctype_policy is None:
        return None
    if doctype_policy.runtime_scope.get("type") not in BRANCH_PERMISSION_SCOPE_TYPES:
        return None
    return doctype_policy


def get_doctype_policy_definition(doctype: str) -> DoctypePolicy | None:
    return load_access_policy().get_doctype_policy(doctype)


def permission_function_stem(doctype: str) -> str:
    normalized = str(doctype or "").strip()
    if normalized.startswith("AT "):
        normalized = normalized[3:]
    normalized = normalized.replace("-", " ").replace("/", " ")
    return "_".join(part for part in normalized.lower().split() if part)


def _build_matrix_entry_for_policy(policy, doctype_policy: DoctypePolicy) -> dict[str, dict[int, dict[str, int]]]:
    permission_bundle = policy.get_permission_bundle(doctype_policy.permission_bundle) or {}
    if not _bundle_declares_permissions(permission_bundle):
        return {}

    permission_rule = _permission_rule_from_bundle(permission_bundle)
    roles = policy.roles_for_family(doctype_policy.visible_to)
    return {role: {0: dict(permission_rule)} for role in roles}


def _bundle_declares_permissions(permission_bundle: dict[str, Any]) -> bool:
    return any(key in permission_bundle for key in PERMISSION_KEYS)


def _permission_rule_from_bundle(permission_bundle: dict[str, Any]) -> dict[str, int]:
    return {key: int(bool(permission_bundle.get(key, False))) for key in PERMISSION_KEYS}


def _hook_paths_for_policy(doctype: str, doctype_policy: DoctypePolicy) -> tuple[str | None, str | None]:
    scope_type = str(doctype_policy.runtime_scope.get("type") or "").strip()
    if scope_type in BRANCH_PERMISSION_SCOPE_TYPES or scope_type in HOOK_ONLY_SCOPE_TYPES:
        function_stem = permission_function_stem(doctype)
        return (
            f"{_BRANCH_PERMISSION_MODULE}.get_{function_stem}_permission_query_conditions",
            f"{_BRANCH_PERMISSION_MODULE}.has_{function_stem}_permission",
        )
    if scope_type == "branch_plus_personal_portfolio":
        return (
            f"{_CUSTOMER_PERMISSION_MODULE}.get_permission_query_conditions",
            f"{_CUSTOMER_PERMISSION_MODULE}.has_permission",
        )
    if scope_type == "linked_record_or_owner_fallback":
        return (
            f"{_DOCUMENT_PERMISSION_MODULE}.get_permission_query_conditions",
            f"{_DOCUMENT_PERMISSION_MODULE}.has_permission",
        )
    return None, None