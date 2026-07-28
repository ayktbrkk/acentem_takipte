# Endorsement Versioning System Design

**Date:** 2025-07-21
**Status:** Approved

## Goal
When an endorsement is applied to a policy, create a new versioned policy record instead of modifying the original in-place. The new record follows naming convention `{parent}-{version}`. Cancellation endorsements create negative-financial records.

## Naming Convention
```
Original: AT-POL-2025-000001        (policy_version=0)
Version 1: AT-POL-2025-000001-01    (policy_version=1)
Version 2: AT-POL-2025-000001-02    (policy_version=2)
```

## Behavior by Endorsement Type

| Type | Original Policy | New Version Record | Financials |
|------|----------------|-------------------|------------|
| Cancellation | status → IPT | status → IPT | NEGATIVE (-net, -tax, -commission, -gross) |
| Premium Update | unchanged Active | new values, Active | POSITIVE new values |
| Coverage Update | unchanged Active | new values, Active | Copied from original |
| Date Update | unchanged Active | new values, Active | Copied from original |
| Other | unchanged Active | new values, Active | Copied from original |

## New AT Policy Fields
- `parent_policy` (Link → AT Policy) — link to original
- `endorsement_reference` (Link → AT Policy Endorsement)
- `policy_version` (Int) — 0=original, 1,2...

## Backend Changes
- Rewrite `apply_endorsement` to create new version record
- Modify AT Policy autoname for versioned records
- Endorsement quick create accepts financial fields

## Frontend Changes
- Endorsement dialog: add financial fields (Premium/Cancellation types)
- Policy list: show versioned policies with parent grouping
- Policy detail: show version chain in sidebar

## Policy List Visibility
- Versioned policies appear in list with their own record name
- Parent policy grouping visually (indentation or badge)
- Filtering by parent to see all versions of a policy

## No Delta Tracking
Financial records (negative for cancellation, positive for updates) are sufficient for accounting.
