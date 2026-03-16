# Scheduler Jobs and Operational Notes

This app is not "just CRUD": it defines scheduled jobs that enqueue background work.

## Where Jobs Are Defined

- Schedules (cron/daily): `acentem_takipte/hooks.py` (`scheduler_events`)
- Entry points (enqueue + limits/timeouts): `acentem_takipte/acentem_takipte/tasks.py`

The scheduled functions generally enqueue a worker job via `frappe.enqueue(...)` and return a small
"queued response" that includes the queue name and the job id (when available).

## Current Schedule (Summary)

From `acentem_takipte/hooks.py`:

- Every 10 minutes:
  - `acentem_takipte.acentem_takipte.tasks.run_notification_queue_job`
- Hourly:
  - `acentem_takipte.acentem_takipte.tasks.run_accounting_sync_job`
- Daily:
  - `acentem_takipte.acentem_takipte.tasks.create_renewal_tasks`
  - `acentem_takipte.acentem_takipte.tasks.run_stale_renewal_task_job`
  - `acentem_takipte.acentem_takipte.tasks.run_payment_due_job`
  - `acentem_takipte.acentem_takipte.tasks.run_due_campaigns_job`
  - `acentem_takipte.acentem_takipte.tasks.run_customer_segment_snapshot_job`
  - `acentem_takipte.acentem_takipte.tasks.run_scheduled_reports_job`
  - `acentem_takipte.acentem_takipte.tasks.run_accounting_reconciliation_job`

## Idempotency and Duplicate Prevention

Reviewer expectation for scheduled work:
- Jobs should be safe to re-run.
- Jobs should not create duplicate operational side-effects when run multiple times.

Repo examples:
- Payment due notifications:
  - `acentem_takipte/acentem_takipte/tasks.py` checks for a notification draft already created on the same day
    (`_payment_notification_exists_today`) before creating new drafts.

Guideline for new jobs:
- Prefer a deterministic dedupe key stored on the resulting DocType (or a query filter) rather than
  relying on job runtime-only state.

## Failure Handling and Observability

There are two primary failure classes:
- Enqueue failures (queue down / timeout / worker unavailable)
- Runtime failures (exceptions in the worker job)

What to do operationally:
1. Check worker and scheduler logs.
2. Re-run the job manually if it is designed to be idempotent.
3. For repeated failures: reduce scope using limits (many jobs accept `limit`) and retry.

Logging:
- Some jobs already emit structured summaries via `frappe.logger("acentem_takipte").info(...)`
  (example: payment due reminder job summary).

## Manual Execution (Common Debug Flow)

When debugging a job, a practical pattern is:
- run the job for a smaller batch (`limit`)
- verify the created/updated DocTypes
- repeat

The main entry points are in `acentem_takipte/acentem_takipte/tasks.py`, for example:
- `run_notification_queue_job(limit=120)`
- `run_payment_due_job(limit=250)`
- `run_accounting_sync_job(limit=250)`
- `run_scheduled_reports_job(frequency="daily", limit=10)`

In a Bench environment you can invoke these via Frappe console or API methods, depending on your setup.

