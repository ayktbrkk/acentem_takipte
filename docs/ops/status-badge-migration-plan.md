# StatusBadge Migration Plan

Date: 2026-03-16

## Current Legacy Usage Inventory

Legacy component: `frontend/src/components/StatusBadge.vue`

Direct imports still active in:

None.

`frontend/src/pages/CustomerList.vue`, `frontend/src/pages/LeadList.vue`, `frontend/src/pages/OfferBoard.vue` and `frontend/src/pages/ClaimsBoard.vue` were migrated to `frontend/src/components/ui/StatusBadge.vue` in this iteration.

## Proposed Removal Phases

### Phase A - Low-Risk List Pages

1. LeadList.vue
2. OfferBoard.vue
3. ClaimsBoard.vue

Status: Completed on 2026-03-16

Actions:
- Replace import with `components/ui/StatusBadge.vue`
- Replace `type` prop usage with `domain`
- Verify each domain mapping is covered in ui StatusBadge

### Phase B - Dashboard + Communication

1. Dashboard.vue
2. CommunicationCenter.vue

Status: Completed on 2026-03-16

Actions:
- Migrate badge usage and keep existing semantics
- Confirm dashboard cards and communication timeline states map to standard tokens

### Phase C - Auxiliary Workbenches

1. AuxWorkbench.vue
2. AuxRecordDetail.vue

Status: Completed on 2026-03-16

Actions:
- Migrate all badges
- Run focused smoke checks for auxiliary workflows

### Phase D - Final Decommission

1. Assert no imports from `components/StatusBadge.vue` remain
2. Remove `frontend/src/components/StatusBadge.vue`
3. Run unit tests + Vite build + e2e smoke

Status: Completed on 2026-03-16

## Exit Criteria

- `grep` finds zero imports of `../components/StatusBadge.vue`
- Customer, policy, offer, lead, claim, payment, renewal, reminder/activity states render correctly
- Unit tests and build pass
