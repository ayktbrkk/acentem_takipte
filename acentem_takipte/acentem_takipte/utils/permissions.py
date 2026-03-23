from __future__ import annotations

from typing import Iterable, Sequence

from acentem_takipte.acentem_takipte.api.security import (
    assert_authenticated,
    assert_doctype_permission,
    assert_post_request,
    assert_roles,
    audit_admin_action,
)


def assert_mutation_access(
    *,
    action: str,
    roles: Sequence[str],
    doctype_permissions: Iterable[str] = (),
    permtype: str = "write",
    details: dict | None = None,
    role_message: str = "You do not have permission to perform this action.",
    post_message: str = "Only POST requests are allowed for this action.",
) -> str:
    user = assert_authenticated()
    assert_post_request(post_message)
    assert_roles(*roles, user=user, message=role_message)

    for doctype in doctype_permissions:
        assert_doctype_permission(
            doctype,
            permtype,
            f"You do not have permission to perform this action for {doctype}.",
        )

    audit_admin_action(action, details or {})
    return user


def build_doctype_permission_map(**mapping: tuple[str, ...]) -> dict[str, tuple[str, ...]]:
    return {key: tuple(value) for key, value in mapping.items()}

