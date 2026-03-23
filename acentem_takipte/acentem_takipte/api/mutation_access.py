from __future__ import annotations

from acentem_takipte.acentem_takipte.utils.permissions import assert_mutation_access


def assert_role_based_write_access(
    *,
    action: str,
    roles: tuple[str, ...],
    permission_targets: tuple[str, ...],
    details: dict | None = None,
    role_message: str,
    post_message: str,
) -> None:
    assert_mutation_access(
        action=action,
        roles=roles,
        doctype_permissions=permission_targets,
        permtype="write",
        details=details,
        role_message=role_message,
        post_message=post_message,
    )

