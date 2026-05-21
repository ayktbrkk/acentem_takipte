# AT Access Protocol Report

Last updated: 2026-05-21

This document summarizes the current repository-backed access model for operational and system users, records the verification basis, and proposes a more user-adjustable configuration shape for future evolution.

## Scope

This report is limited to repository-truth in the current workspace.

It does not prove live-site database overrides such as manually edited `Custom DocPerm` rows.

## Source Of Truth

Use these files in this order when evaluating the current behavior:

1. `acentem_takipte/acentem_takipte/setup_utils.py`
2. `acentem_takipte/hooks.py`
3. `acentem_takipte/acentem_takipte/doctype/branch_permissions.py`
4. `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
5. `acentem_takipte/acentem_takipte/doctype/at_document/at_document.py`
6. `acentem_takipte/acentem_takipte/services/branches.py`
7. `acentem_takipte/acentem_takipte/services/sales_entities.py`
8. `frontend/src/router/index.js`
9. `acentem_takipte/acentem_takipte/api/v2/dashboard_security.py`

## Executive Summary

The current access model is hybrid.

- Branch scope is the main access boundary for most operational records.
- Sales entity scope is a second filter for a smaller set of doctypes such as leads, offers, policies, payments, and accounting entries.
- Personal portfolio scope is applied most explicitly to `AT Customer` for `AT Agent` users.
- `AT Document` is a special case and inherits access from linked business records instead of following the normal branch-only pattern.
- Operational route visibility and backend doctype access are intentionally different layers. A visible page is expected to align with `Custom DocPerm` convergence in `setup_utils.py`, then be narrowed at runtime by permission hooks.

## Verified Current Model

### 1. Role Families

- Operational family: `AT Agent`, `AT Accountant`, `AT Manager`
- System family: `AT System Manager`, `System Manager`, `Administrator`
- Non-operational SPA roles: `AT User`, `AT Customer`

Operational route visibility is defined in `frontend/src/router/index.js`.

### 2. Install-Time Access Convergence

`ensure_role_permissions()` in `acentem_takipte/acentem_takipte/setup_utils.py` provisions `Custom DocPerm` rows from `PERMISSION_MATRIX`.

Current operational doctypes in that matrix are:

- `AT Lead`
- `AT Offer`
- `AT Policy`
- `AT Policy Endorsement`
- `AT Policy Snapshot`
- `AT Customer`
- `AT Claim`
- `AT Payment`
- `AT Payment Installment`
- `AT Renewal Task`
- `AT Call Note`
- `AT Segment`
- `AT Campaign`
- `AT Ownership Assignment`
- `AT Activity`
- `AT Task`
- `AT Reminder`

`AT Document` is also operationally visible, but with a reduced permission bundle:

- `read=1`
- `write=1`
- `create=1`
- `delete=0`
- `submit=0`
- `cancel=0`
- `amend=0`
- `report=1`
- `export=1`
- `import=0`
- `share=1`
- `print=1`
- `email=1`

System-only doctypes currently left outside the operational matrix are:

- `AT Access Log`
- `AT Accounting Entry`
- `AT Branch`
- `AT Insurance Company`
- `AT Notification Draft`
- `AT Notification Outbox`
- `AT Notification Template`
- `AT Reconciliation Item`
- `AT Sales Entity`

For every mapped doctype, `AT System Manager` is automatically expanded to full access during convergence.

### 3. Branch Scope

Branch scope is derived from `AT User Branch Access` via `acentem_takipte/acentem_takipte/services/branches.py`.

Current verified behavior:

- `self_only` grants access to the assigned branch only.
- `self_and_descendants` expands access to descendant office branches.
- `is_default` defines the default branch for normalization and fallback.
- `valid_until` can expire a branch assignment.
- `System Manager` and `Administrator` are treated as global branch users.

`normalize_requested_office_branch()` keeps a requested branch only if it is inside the allowed branch set; otherwise it falls back to the user's default branch or to `None`.

### 4. Sales Entity Scope

Sales entity scope is derived from `AT User Sales Entity Access` via `acentem_takipte/acentem_takipte/services/sales_entities.py`.

Current verified behavior:

- `self_only` grants only the assigned sales entity.
- `self_and_descendants` expands to descendant sales entities.
- `is_default` defines the default entity.
- `valid_until` can expire an entity assignment.
- `System Manager` and `Administrator` are treated as global sales-entity users.

`normalize_requested_sales_entity()` keeps a requested sales entity only if it is inside the allowed set; otherwise it falls back to the default sales entity or to `None`.

### 5. Doctype-Level Runtime Scope

The main runtime permission hooks are registered in `acentem_takipte/hooks.py`.

Verified patterns:

- Branch + sales entity scope: `AT Lead`, `AT Offer`, `AT Policy`, `AT Payment`, `AT Accounting Entry`
- Branch-only scope: `AT Claim`, `AT Renewal Task`, `AT Renewal Outcome`, `AT Call Note`, `AT Segment`, `AT Campaign`, `AT Notification Draft`, `AT Notification Outbox`, `AT Activity`, `AT Task`, `AT Reminder`, `AT Ownership Assignment`
- Parent-derived scope: `AT Payment Installment`, `AT Policy Endorsement`, `AT Reconciliation Item`
- Controller-special scope: `AT Customer`, `AT Document`

### 6. Personal Portfolio Logic

Personal portfolio logic is not global.

It is explicit and strongest on `AT Customer` for `AT Agent`.

`AT Agent` may access a customer only when both conditions hold:

1. The customer is assigned to that user or owned by that user.
2. The customer is inside the user's allowed office-branch scope.

This rule is implemented in `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`.

For most other operational doctypes, the code does not impose the same direct assigned-agent restriction. Those doctypes are mostly scoped by branch and, where applicable, sales entity.

This means the current model is intentionally hybrid:

- customer portfolio: person-based for `AT Agent`
- most other operational records: organization-based via branch and sales entity

### 7. Dashboard-Specific Scope

`acentem_takipte/acentem_takipte/api/v2/dashboard_security.py` further confirms the same split.

Verified behavior:

- `AT Manager` and `AT Accountant` get global dashboard customer scope relative to branch assignments.
- `AT Agent` gets customer dashboard scope limited by `assigned_agent=user`, then further narrowed by allowed branches.
- `AT Agent` sales entity scope is also explicitly narrowed in dashboard security.

## High-Confidence Findings

These points are strongly supported by the current workspace:

1. Branch scope is the core access boundary across the system.
2. Sales entity scope is the second filter for only a subset of doctypes.
3. "Own portfolio" is not a universal rule across all operational records.
4. `AT Customer` is the clearest doctype where own-portfolio rules are applied.
5. `AT Document` is intentionally exceptional and derives access from linked records or owner fallback.

## Open Risks And Drift Sources

These are the main remaining ambiguity or drift sources:

1. Live database `Custom DocPerm` overrides may differ from repository intent.
2. `AT Policy Snapshot` appears in the install-time permission matrix but not in the main runtime permission hook maps gathered here.
3. `AT Renewal Outcome` appears in runtime permission hooks but not in the install-time operational matrix.
4. Tests expect certain scope-invalidation hook registrations around branch and sales-entity assignment doctypes. That expectation should be rechecked against the current canonical runtime hooks before further refactors.

## Correctness Check

This report is based on the repository files above and is considered code-backed.

To validate it against runtime behavior, use this sequence:

1. Re-run the focused backend permission tests.
2. Query live `Custom DocPerm` rows for representative doctypes.
3. Verify one user per role family in a live site.

Recommended focused checks:

1. `AT Agent` can only read customers where `assigned_agent=user` or `owner=user`, and branch is allowed.
2. `AT Agent` can read policies only when branch and sales entity are allowed, regardless of assigned-agent relation.
3. `AT Manager` and `AT Accountant` are branch-scoped for customers, not agent-scoped.
4. `AT Document` access follows linked record access or owner fallback.

## Improvement Plan

### Goal

Make access protocols easier to understand, audit, and adjust without scattering rules across multiple Python modules.

### Phase 1: Normalize The Current Model

1. Keep the current hybrid behavior intact.
2. Document every doctype in a single declarative table.
3. Add tests that assert the declared model matches `PERMISSION_MATRIX`, runtime hooks, and special controllers.

### Phase 2: Introduce A Declarative Access Policy Layer

1. Define a single access policy file for doctype families, roles, and scope modes.
2. Generate or validate `PERMISSION_MATRIX` from that policy.
3. Generate or validate hook registrations from that policy.
4. Keep controller-level special cases only for truly exceptional doctypes such as `AT Customer` and `AT Document`.

### Phase 3: Add A User-Adjustable Admin Surface

1. Add an admin-facing access policy UI or a controlled settings doctype.
2. Limit editable fields to branch scope mode, sales entity scope mode, role family assignment, and own-portfolio toggles where the domain really supports them.
3. Keep structural constraints enforced in code so the UI cannot produce invalid policies.

## Proposed Easier-To-Adjust Format

The proposed declarative policy template lives at `docs/examples/access_policy_template.yml`.

It converts the current hard-coded logic into one editable structure with:

- role families
- doctype families
- install-time permission targets
- runtime scope strategy
- special case flags
- risk notes

This file is a design artifact, not yet the runtime source of truth.

## Recommendation

Preserve the current hybrid model for now.

Do not flatten everything into a single "own portfolio only" rule.

Instead:

1. Keep customer access person-based for `AT Agent`.
2. Keep most operational records branch-based or branch+entity-based.
3. Introduce a declarative access policy layer so administrators and maintainers can adjust protocols from one place.