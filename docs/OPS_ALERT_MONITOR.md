# Ops Alert Monitor

This document describes the operational alert monitor that scans `Error Log` and can notify Slack or Telegram for critical incidents.

## Scope

The monitor currently targets two classes of incidents:

- break-glass audit incidents
- external integration incidents such as Slack, Telegram, WhatsApp, Meta, Sentry, webhooks, and provider-router failures

Generic application errors are intentionally excluded by default to keep the signal-to-noise ratio usable.

## Scheduler

The monitor runs hourly from [acentem_takipte/hooks.py](acentem_takipte/hooks.py).

Registered job:

- `acentem_takipte.acentem_takipte.services.ops_alerts.run_error_log_alert_monitor`

## Configuration

Add these keys to the site config when you want live delivery:

- `at_ops_alert_slack_webhook_url`
- `at_ops_alert_telegram_bot_token`
- `at_ops_alert_telegram_chat_id`

Optional tuning:

- `at_ops_alert_error_log_window_minutes`
- `at_ops_alert_error_log_keywords`
- `sentry_environment` or `environment`

Example:

```json
{
  "at_ops_alert_slack_webhook_url": "https://hooks.slack.com/services/...",
  "at_ops_alert_telegram_bot_token": "123456:bot-token",
  "at_ops_alert_telegram_chat_id": "123456789",
  "at_ops_alert_error_log_window_minutes": 60,
  "sentry_environment": "production"
}
```

## Preview Without Sending

Use Bench execute to preview the current payload without sending any webhook requests:

```bash
bench --site at.localhost execute acentem_takipte.acentem_takipte.services.ops_alerts.preview_error_log_alert_monitor
```

The preview response includes:

- grouped incident rows
- current filter keywords
- rendered alert message
- direct Desk links to `Error Log`

## Duplicate Grouping

The monitor groups duplicate `Error Log` rows by incident title before composing the alert. This reduces noise when the same break-glass request or integration failure emits multiple rows.

Each grouped row includes:

- `count`
- `log_names`
- most recent `name`
- most recent `creation`
- best available excerpt

## Break-Glass Audit Logging

Canonical break-glass `Error Log` audit entries are emitted from the service layer in [acentem_takipte/acentem_takipte/services/break_glass.py](acentem_takipte/acentem_takipte/services/break_glass.py).

The `AT Break Glass Request` DocType submit hook intentionally does not write a second `Error Log` row. This prevents duplicate alert incidents for the same approval or rejection.

## Validation Commands

Focused ops alert tests:

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_ops_alerts
```

Break-glass regression tests:

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_break_glass
```