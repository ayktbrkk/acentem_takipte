#!/usr/bin/env python
"""Branch hierarchy depth & allowed-set size guard.

Run via bench:
    bench --site at.localhost execute \
        acentem_takipte.acentem_takipte.scripts.branch_depth_check.run_check

Or directly (requires frappe context):
    bench --site at.localhost run-script scripts/branch_depth_check.py

Thresholds (can be overridden via Site Config):
    at_branch_depth_warn      (default 5)   — max tree depth before warning
    at_branch_count_warn      (default 100) — total branch count before warning
    at_allowed_set_avg_warn   (default 300) — avg allowed-set size before warning

Exit codes (when run as a standalone script):
    0 — all thresholds OK
    1 — at least one threshold exceeded (CI should treat as warning, not failure)
"""
from __future__ import annotations

import sys
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any

# ---------------------------------------------------------------------------
# Thresholds defaults
# ---------------------------------------------------------------------------
DEFAULT_DEPTH_WARN = 5
DEFAULT_COUNT_WARN = 100
DEFAULT_AVG_SET_WARN = 300


@dataclass
class BranchMetrics:
    total_branches: int = 0
    max_depth: int = 0
    avg_allowed_set_size: float = 0.0
    sample_user_count: int = 0
    warnings: list[str] = field(default_factory=list)
    nested_set_recommended: bool = False


def _build_children_map(rows: list[dict[str, Any]]) -> dict[str, list[str]]:
    children: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        parent = str(row.get("parent_office_branch") or "").strip()
        name = str(row.get("name") or "").strip()
        if name:
            children[parent].append(name)
    return children


def _compute_max_depth(rows: list[dict[str, Any]]) -> int:
    """BFS from root(s) to compute maximum tree depth."""
    children = _build_children_map(rows)
    all_names = {str(r.get("name") or "").strip() for r in rows if r.get("name")}
    all_children = {child for siblings in children.values() for child in siblings}
    roots = all_names - all_children

    if not roots:
        # Fallback: if no clear root, try the one with no parent
        roots = {
            str(r.get("name") or "").strip()
            for r in rows
            if not str(r.get("parent_office_branch") or "").strip()
            and str(r.get("name") or "").strip()
        }

    if not roots:
        return 0

    max_depth = 0
    queue: deque[tuple[str, int]] = deque((root, 1) for root in roots)
    while queue:
        node, depth = queue.popleft()
        if depth > max_depth:
            max_depth = depth
        for child in children.get(node, []):
            queue.append((child, depth + 1))
    return max_depth


def _compute_avg_allowed_set(
    rows: list[dict[str, Any]],
    access_rows: list[dict[str, Any]],
    max_sample: int = 50,
) -> tuple[float, int]:
    """Estimate average allowed-set size across sampled users.

    Returns (avg_size, sample_count).
    """
    import frappe  # noqa: PLC0415 — imported here so module loads without frappe

    children = _build_children_map(rows)

    def descendants(seed: str) -> set[str]:
        result: set[str] = set()
        queue: deque[str] = deque([seed])
        while queue:
            node = queue.popleft()
            for child in children.get(node, []):
                if child not in result:
                    result.add(child)
                    queue.append(child)
        return result

    # Group access rows by user
    user_branches: dict[str, list[dict]] = defaultdict(list)
    for row in access_rows:
        user = str(row.get("user") or "").strip()
        if user:
            user_branches[user].append(row)

    sampled_users = list(user_branches.keys())[:max_sample]
    if not sampled_users:
        return 0.0, 0

    set_sizes: list[int] = []
    for user in sampled_users:
        allowed: set[str] = set()
        for row in user_branches[user]:
            branch = str(row.get("office_branch") or "").strip()
            scope = str(row.get("scope_mode") or "self_only").strip()
            if branch:
                allowed.add(branch)
                if scope == "self_and_descendants":
                    allowed.update(descendants(branch))
        set_sizes.append(len(allowed))

    avg = sum(set_sizes) / len(set_sizes) if set_sizes else 0.0
    return avg, len(sampled_users)


def collect_metrics(site: str | None = None) -> BranchMetrics:
    """Collect branch hierarchy metrics. Must be called in a frappe context."""
    import frappe  # noqa: PLC0415

    metrics = BranchMetrics()

    # Load thresholds from site config (allows per-site override)
    cfg = frappe.get_site_config() if hasattr(frappe, "get_site_config") else {}
    depth_warn: int = int(cfg.get("at_branch_depth_warn", DEFAULT_DEPTH_WARN))
    count_warn: int = int(cfg.get("at_branch_count_warn", DEFAULT_COUNT_WARN))
    avg_set_warn: int = int(cfg.get("at_allowed_set_avg_warn", DEFAULT_AVG_SET_WARN))

    branch_rows = frappe.get_all(
        "AT Office Branch",
        fields=["name", "parent_office_branch"],
        limit_page_length=0,
    )
    metrics.total_branches = len(branch_rows)
    metrics.max_depth = _compute_max_depth(branch_rows)

    access_rows = frappe.get_all(
        "AT User Branch Access",
        filters={"is_active": 1},
        fields=["user", "office_branch", "scope_mode"],
        limit_page_length=0,
    )
    metrics.avg_allowed_set_size, metrics.sample_user_count = _compute_avg_allowed_set(
        branch_rows, access_rows
    )

    # --- Threshold checks ---
    if metrics.total_branches > count_warn:
        metrics.warnings.append(
            f"[WARN] Total branch count {metrics.total_branches} exceeds threshold {count_warn}."
        )

    if metrics.max_depth > depth_warn:
        metrics.warnings.append(
            f"[WARN] Tree max depth {metrics.max_depth} exceeds threshold {depth_warn}. "
            "Consider migrating AT Office Branch to nested set (lft/rgt)."
        )
        metrics.nested_set_recommended = True

    if metrics.avg_allowed_set_size > avg_set_warn:
        metrics.warnings.append(
            f"[WARN] Average allowed-set size {metrics.avg_allowed_set_size:.1f} exceeds "
            f"threshold {avg_set_warn}. Verify Redis precompute cache is active."
        )

    return metrics


def run_check() -> None:
    """Entry point for `bench execute`."""
    import frappe  # noqa: PLC0415

    metrics = collect_metrics()

    print("=== Branch Hierarchy Health Check ===")
    print(f"  Total branches     : {metrics.total_branches}")
    print(f"  Max tree depth     : {metrics.max_depth}")
    print(f"  Avg allowed-set    : {metrics.avg_allowed_set_size:.1f} "
          f"(sampled {metrics.sample_user_count} users)")
    print(f"  Nested set needed  : {'YES' if metrics.nested_set_recommended else 'no'}")

    if metrics.warnings:
        print("\nWarnings:")
        for w in metrics.warnings:
            print(f"  {w}")
        # Log to Frappe so it appears in Error Log / bench logs
        for w in metrics.warnings:
            frappe.log_error(title="Branch Depth Check", message=w)
    else:
        print("\nAll thresholds OK.")

    if metrics.nested_set_recommended:
        frappe.log_error(
            title="Branch Depth Check — Action Required",
            message=(
                f"Tree depth {metrics.max_depth} exceeded threshold. "
                "Move AT Office Branch to NestedSet to avoid IN-query performance degradation."
            ),
        )


# ---------------------------------------------------------------------------
# Standalone entry point (bench run-script)
# ---------------------------------------------------------------------------
def execute() -> None:  # noqa: D401 — bench run-script convention
    run_check()


if __name__ == "__main__":
    print(
        "Run via bench:\n"
        "  bench --site <site> execute "
        "acentem_takipte.acentem_takipte.scripts.branch_depth_check.run_check\n"
        "or:\n"
        "  bench --site <site> run-script scripts/branch_depth_check.py"
    )
    sys.exit(0)
