# Acentem Takipte

> Insurance agency CRM and policy operations app built on Frappe and Vue.

`Acentem Takipte` is a hybrid Frappe application for insurance agencies that need one place to manage customer relationships, policy lifecycles, renewals, claims, collections, reporting, and operational follow-up. It combines Frappe DocTypes and server-side jobs with a Vue-powered `/at` workspace for day-to-day operations.

## Why This Project Exists

Insurance operations tend to spread across spreadsheets, chat tools, renewal reminders, accounting handoffs, and disconnected customer notes. Acentem Takipte brings those workflows together so agency teams can:

- track customers, leads, policies, and related activities in one system
- follow renewal pipelines before revenue is lost
- manage claims, offers, and payment follow-up with operational context
- coordinate communications through draft and outbox workflows
- support reporting, exports, and reconciliation from the same workspace

## What the Product Covers

The application currently includes workflows and modules around:

- Customer and lead management
- Policy and endorsement tracking
- Renewal task generation and reminder flows
- Claims operations
- Payment follow-up and accounting sync
- Notification templates, drafts, and outbox processing
- Reporting, exports, and scheduled reports
- Branch-aware permissions and session routing
- A Vue single-page workspace mounted at `/at`

## Core Capabilities

### Unified customer and policy operations

The app models the main insurance entities directly in Frappe, including customers, policies, claims, offers, payments, reminders, and renewal tasks. This makes it easier to connect operational history, ownership, branch scope, and communication activity in one place.

### Desk plus SPA workflow

`Acentem Takipte` is not a standalone frontend detached from Frappe. It uses Frappe for core app structure, roles, routing, scheduler jobs, and DocTypes, while the `/at` route provides a faster Vue-based operational workspace for list, detail, dashboard, reporting, and workbench experiences.

### Automated background jobs

The project defines scheduled jobs for tasks such as:

- notification queue processing
- accounting sync
- renewal task creation
- payment due jobs
- campaign execution
- customer segment snapshots
- scheduled report generation
- reconciliation jobs

### Branch-aware access control

Permissions are enforced across multiple business entities with branch-sensitive query conditions and permission helpers, helping agencies operate safely across office or branch boundaries.

## High-Level Architecture

### Backend

- Python
- Frappe Framework
- MariaDB
- Redis

The backend contains DocTypes, API endpoints, scheduled jobs, permission hooks, service modules, and setup utilities.

### Frontend

- Vue 3
- Vite
- Pinia
- Vue Router
- Tailwind CSS
- Frappe UI

The frontend source lives in `frontend/` and is built into static assets consumed by the Frappe route at `/at`.
Frontend build artifacts are generated during build/deployment and are not committed to the repository.

## Prerequisites

Before installing the app, make sure you have:

- a working Frappe Bench environment
- Frappe v15
- Python 3.10 or newer
- Node.js 20 or newer
- MariaDB
- Redis

This repository assumes Bench manages the Frappe runtime and most framework dependencies.

Important: install and verify the Frappe Framework / Bench environment first. `acentem_takipte` is an app that runs inside an existing Frappe site; it is not a standalone installer and should not be used before Bench and Frappe are already working.

Official installation references:

- Frappe Framework: https://docs.frappe.io/framework
- Bench / Installation: https://docs.frappe.io/framework/user/en/installation
- Bench repository: https://github.com/frappe/bench

## Installation

### 1. Get the app into your Bench

```bash
cd /opt/frappe-bench
bench get-app https://github.com/ayktbrkk/acentem_takipte.git
```

### 2. Install the app on your site

```bash
bench --site your-site.local install-app acentem_takipte
```

### 3. Build the frontend workspace

```bash
cd frappe-bench/apps/acentem_takipte/frontend
npm ci
npm run build
```

The build writes fresh assets into `acentem_takipte/public/frontend/`, and `/at` serves them from the latest Vite manifest at runtime.

### 4. Run site migrations and clear cache

```bash
cd frappe-bench
bench --site your-site.local clear-cache
bench --site your-site.local migrate
bench --site your-site.local clear-cache
```

If you run `migrate` before the frontend build, the app can install successfully while `/at` still renders as an empty page because the Vite manifest and built assets are missing.

### 5. Troubleshooting first install

If the install partially succeeded earlier and you see a duplicate `Module Def` error, retry with force:

```bash
bench --site your-site.local install-app acentem_takipte --force
bench --site your-site.local migrate
bench --site your-site.local clear-cache
```

If `/at` opens but shows no content:

```bash
cd frappe-bench/apps/acentem_takipte/frontend
npm ci
npm run build

cd ../../..
bench --site your-site.local migrate
bench --site your-site.local clear-cache
```

### 6. Optional production setup

If you are preparing a production Bench:

```bash
sudo bench setup production frappe
```

For the actual release procedure, backups, production-safe flags, post-deploy checks, and rollback expectations, use [docs/PRODUCTION_DEPLOY_CHECKLIST.md](docs/PRODUCTION_DEPLOY_CHECKLIST.md).

Production boot is also guarded by the app itself: if `at_enable_demo_endpoints=1`, desk boot fails fast; if `developer_mode=1`, the app logs a deployment warning so the issue is visible before release validation is signed off.

## First-Time Access

After installation:

1. Sign in to your Frappe site.
2. Open `/at` on the same site.
3. Confirm the Vue workspace loads successfully.
4. Verify the user has an appropriate role such as `Manager`, `Agent`, `Accountant`, `System Manager`, or `Administrator`.

Example:

```text
Production: https://your-domain/at
Local:      http://your-site.local/at
```

Unauthenticated users are redirected to the Frappe login page and then back to `/at`.
For local development, use the same path on your Bench site.

## Basic Usage Flow

A typical team workflow looks like this:

1. Create or import customers and leads.
2. Record offers, policies, endorsements, and insured assets.
3. Track renewals and follow-up tasks generated by the system.
4. Manage claims and payment-related operations.
5. Prepare or dispatch customer communications through notification flows.
6. Use dashboards, reports, exports, and reconciliation views to monitor agency activity.

## Repository Structure

```text
acentem_takipte/
  acentem_takipte/           Frappe app package: APIs, DocTypes, services, tasks, utilities
  public/frontend/           Generated frontend build output (not committed) served by Frappe
  www/                       Web route entry for /at
frontend/                    Vue application source, unit tests, Playwright tests
scripts/                     Optional benchmark and seed helpers
.github/workflows/           CI workflows for lint, tests, build, and optional E2E gates
```

## Development Notes

Even though this README is product-focused, a few implementation details are useful when onboarding:

- frontend UI work should follow `docs/DESIGN_GUIDELINES.md` as the canonical design constitution
- PR and self-review for user-facing frontend changes should use `docs/UI_REVIEW_CHECKLIST.md`
- `frontend/` contains the SPA source and test setup.
- compiled assets in `acentem_takipte/public/frontend/` are generated artifacts and should not be committed
- the `/at` route injects the latest built Vite assets dynamically
- scheduler hooks are defined in the Frappe app and power recurring operational jobs
- `requirements.txt` intentionally stays minimal because the Bench environment provides Frappe itself
- CI workflows are kept in `.github/workflows/`
- benchmark and seed helpers under `scripts/` are optional and not required for installation

## Quality Gates and E2E Notes

The repository CI policy for frontend quality is:

- Node.js 20
- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`

If smoke E2E credentials are configured in CI, smoke jobs run as an additional gate.

For local Playwright runs, authenticated suites use this order for credentials:

1. `E2E_USER` and `E2E_PASSWORD` if provided.
2. On localhost only, fallback to `Administrator` / `admin`.

You can disable localhost fallback explicitly with:

```bash
E2E_ALLOW_LOCAL_FALLBACK=0 npm --prefix frontend run e2e -- tests/e2e/dashboard-tab-contract.spec.js
```

## Project Status

This project is under active development. Existing modules are already substantial, but the repository should still be treated as evolving software. Data model details, operational flows, and frontend screens may continue to change as the product matures.

## License

MIT
