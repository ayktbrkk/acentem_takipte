# Acentem Takipte Architecture Overview

Last verified: 2026-05-05

This is the short-form architecture summary for the current workspace. Use [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) for the full file-by-file map and runtime flow details.

## System In One View

`Acentem Takipte` is a hybrid Frappe + Vue application for insurance agency operations.

- Frappe is the runtime backbone.
  It owns DocTypes, permissions, scheduler jobs, background workers, server-side APIs, and `/at` route bootstrapping.
- Vue 3 is the operational workspace.
  It renders the dashboard, customer, lead, policy, claims, payments, renewals, communication, reconciliation, report, and admin settings screens.
- The application is branch-aware.
  Session bootstrap, permission checks, and query scoping are designed around office branch access and role-based capabilities.

## Main Runtime Surfaces

### Backend

- [acentem_takipte/hooks.py](../acentem_takipte/hooks.py)
  Runtime hooks, website routing, document event wiring, scheduler definitions.
- [acentem_takipte/acentem_takipte/api](../acentem_takipte/acentem_takipte/api)
  SPA-facing API entrypoints.
- [acentem_takipte/acentem_takipte/api/v2](../acentem_takipte/acentem_takipte/api/v2)
  Refactored dashboard query/serialization slice.
- [acentem_takipte/acentem_takipte/services](../acentem_takipte/acentem_takipte/services)
  Domain logic, 360 payload builders, reporting, renewals, payments, alerting, and settings.
- [acentem_takipte/acentem_takipte/doctype](../acentem_takipte/acentem_takipte/doctype)
  Core business documents such as customer, lead, offer, policy, claim, payment, reminder, renewal, and reconciliation records.
- [acentem_takipte/acentem_takipte/tasks.py](../acentem_takipte/acentem_takipte/tasks.py)
  Enqueued background jobs for notifications, renewals, payments, campaigns, reports, and reconciliation.

### Frontend

- [frontend/src/main.js](../frontend/src/main.js)
  Vue bootstrap, Frappe UI setup, session hydration, realtime configuration.
- [frontend/src/App.vue](../frontend/src/App.vue)
  Shell layout, sidebar, topbar, route outlet.
- [frontend/src/router/index.js](../frontend/src/router/index.js)
  `/at` route definitions and route-level access metadata.
- [frontend/src/state/session.js](../frontend/src/state/session.js)
  Normalized session, capabilities, locale, and realtime state.
- [frontend/src/pages](../frontend/src/pages)
  Route-level screens.
- [frontend/src/composables](../frontend/src/composables)
  Screen runtime logic and UI payload mapping.
- [frontend/src/stores](../frontend/src/stores)
  Pinia state domains.

## Core Flows

### SPA boot flow

1. Frappe routes `/at/...` to the `at` web entry.
2. `at.html` injects `window.AT_SESSION_BOOT`.
3. `frontend/src/main.js` starts the Vue app.
4. `frontend/src/state/session.js` normalizes the session payload.
5. `frontend/src/router/index.js` resolves the target page.
6. `frontend/src/pages/*` loads data through Frappe-backed APIs.

### Standard request flow

1. A page or composable requests data.
2. Frappe UI resources or fetch logic call a Python API endpoint.
3. The API layer validates and coordinates the request.
4. The service layer applies business rules.
5. Frappe ORM / DocTypes read or mutate persisted records.

### Background job flow

1. `hooks.py` schedules recurring jobs.
2. `tasks.py` enqueues work into Frappe queues.
3. Workers execute service-layer logic.
4. Outputs feed notifications, report snapshots, campaign actions, renewal tasks, and reconciliation updates.

## Functional Areas

- Customer and sales portfolio: customers, leads, offers, assignments, search, customer detail editing.
- Insurance operations: policies, endorsements, claims, insured assets, renewals.
- Financial control: payments, accounting sync, reconciliation, reports.
- Communication and outbound operations: drafts, outbox, campaigns, alert channels.
- Admin and governance: general settings, break-glass access, branch-aware permissions, scheduled jobs.

## Where To Start Reading

If you need the quickest orientation path, read in this order:

1. [README.md](../README.md)
2. [AGENTS.md](../AGENTS.md)
3. [acentem_takipte/hooks.py](../acentem_takipte/hooks.py)
4. [acentem_takipte/www/at.html](../acentem_takipte/www/at.html)
5. [frontend/src/main.js](../frontend/src/main.js)
6. [frontend/src/router/index.js](../frontend/src/router/index.js)
7. The relevant page under [frontend/src/pages](../frontend/src/pages)
8. The matching API module under [acentem_takipte/acentem_takipte/api](../acentem_takipte/acentem_takipte/api)
9. The matching service module under [acentem_takipte/acentem_takipte/services](../acentem_takipte/acentem_takipte/services)

## Related Docs

- [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md)
- [DESIGN_GUIDELINES.md](DESIGN_GUIDELINES.md)
- [UI_REVIEW_CHECKLIST.md](UI_REVIEW_CHECKLIST.md)
- [PRODUCTION_DEPLOY_CHECKLIST.md](PRODUCTION_DEPLOY_CHECKLIST.md)