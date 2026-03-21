# Operations

This page is a short, reviewer-friendly entry point for day-2 operations.

## Deployment

Current behavior:
- Frontend assets for `/at` are built from `frontend/` into `acentem_takipte/public/frontend/`.
- `/at` injects the latest Vite assets dynamically from the Vite manifest at runtime.

See: `docs/deploy.md`

## Scheduled Jobs

Current behavior (verifiable in repo):
- Schedules are defined in `acentem_takipte/hooks.py` (`scheduler_events`).
- Job entry points are in `acentem_takipte/acentem_takipte/tasks.py` and generally enqueue worker jobs via `frappe.enqueue(...)`.

See: `docs/ops/jobs.md`

## Job Safety / Idempotency

Current behavior (verifiable in repo):
- Some jobs include explicit dedupe checks before creating operational side-effects.
  Example: payment due notifications check for an existing draft created the same day before creating a new one.

Recommended improvement:
- For any new scheduled job, prefer a deterministic dedupe key (stored on the resulting DocType or enforced via query filters)
  so re-runs are safe even after partial failures.

## Failure Handling

Current behavior (verifiable in repo):
- Jobs are enqueued via `frappe.enqueue(...)`. If enqueue fails, the call site can fail (depending on exception handling in that path).
- Job implementations may catch exceptions and/or log summaries (varies by job).

Recommended improvement:
- Add a consistent, lightweight pattern for job-level error logging and alerting (even if just logs + a dashboard query),
  so repeated failures are visible without digging into container logs.

## Logging / Monitoring

Current behavior (verifiable in repo):
- Some jobs emit structured summaries via `frappe.logger(\"acentem_takipte\").info(...)`.

Recommended improvement:
- Standardize job summary logs across all scheduled jobs (start, end, duration, scanned/created/skipped counts),
  and document where operators should look for these logs in your Bench / deployment environment.

## Frontend E2E KPI Gate

Current behavior (verifiable in repo):
- The site-map Playwright scan emits structured outputs:
  - `frontend/test-results/site-haritasi-summary.json`
  - `frontend/test-results/site-haritasi-kpi.txt`
- KPI gate script: `frontend/scripts/e2e/validate-site-haritasi-kpi.mjs`
  - always fails when `app_errors > 0`
  - supports optional external thresholds (warn/fail)

Recommended invocation style:
- Run commands from repository root with npm prefix to avoid cwd drift:
  - `npm --prefix frontend run e2e:site-map`
  - `npm --prefix frontend run e2e:site-map:kpi`
  - `npm --prefix frontend run e2e:site-map:ci`
- If you are already in `frontend/`, run scripts without prefix:
  - `npm run e2e:site-map:kpi`

Profile variants:
- Warning profile: `npm --prefix frontend run e2e:site-map:kpi:warn`
- Strict profile: `npm --prefix frontend run e2e:site-map:kpi:strict`

Optional threshold controls:
- CLI: `--external-warn=<n>`, `--external-max=<n>`
- ENV: `SITE_HARITASI_EXTERNAL_WARN`, `SITE_HARITASI_EXTERNAL_MAX`

Quick CI example (GitHub Actions style):
- `npm --prefix frontend ci`
- `npm --prefix frontend run e2e:site-map`
- `npm --prefix frontend run e2e:site-map:kpi:warn`

Strict nightly example:
- `npm --prefix frontend run e2e:site-map:ci:strict`
