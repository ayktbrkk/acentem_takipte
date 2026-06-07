# Production Roadmap Evidence - 2026-06-07

This note records the evidence gathered while applying the production roadmap.
It is intentionally limited to non-secret metadata and reproducible commands.

## GitHub And Release State

- Repository: `ayktbrkk/acentem_takipte`
- Deploy-time `main` and image commit: `928264d021b4926e55b03a0aef78801434779c30`
- GitHub branch API: `main protected=false`
- Last GHCR image workflow: `Coolify GHCR Image` succeeded for `928264d021b4926e55b03a0aef78801434779c30`
- Live backend image label: `org.opencontainers.image.revision=928264d021b4926e55b03a0aef78801434779c30`
- Latest production tag: `production-2026-06-07-928264d`
- Previous production tag: `production-2026-06-07-c7ffeb7`

## Live Production Evidence

Target: `https://kipsigorta.acentemtakipte.com/at`

Commands run on the Coolify host under `/data/coolify/applications/h1d0pwvazwy9u59vrca160q9`:

```bash
docker compose --env-file .env -f docker-compose.yaml ps backend frontend websocket worker-short worker-long scheduler
docker inspect backend-h1d0pwvazwy9u59vrca160q9-072834570971 --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}'
docker compose --env-file .env -f docker-compose.yaml exec -T backend bash -lc 'cd /home/frappe/frappe-bench && bench doctor'
curl -fsSL -o /dev/null -w 'final_code=%{http_code} final_url=%{url_effective}\n' https://kipsigorta.acentemtakipte.com/at
```

Observed result:

- `backend`, `frontend`, `websocket`, `worker-short`, `worker-long`, and `scheduler` were running after the `928264d` deploy.
- `bench doctor` reported `Workers online: 2`.
- `bench doctor` did not show queued jobs after the final deploy helper run.
- `/at` returned `200` after redirecting to `/login?redirect-to=/at`.

## Production Safety Flags

Read-only config summary from the backend container:

- `developer_mode=None`
- `at_enable_demo_endpoints=None`
- `sentry_dsn_set=False`

Interpretation:

- Demo/developer safety flags are not enabled.
- Sentry remains an open operational integration item.

## Ops Alert Preview

Read-only preview command:

```bash
bench --site "$SITE_NAME" execute acentem_takipte.acentem_takipte.services.ops_alerts.preview_error_log_alert_monitor
```

Observed result:

- `window_minutes=60`
- `matched=0`
- `alerted=false`
- `channels=[]`

Interpretation:

- The preview path runs without sending webhook requests.
- No critical matching `Error Log` rows were present in the preview window.
- Live Slack/Telegram delivery remains open until production webhook settings and an approved test destination are configured.

## Secret Scan

Tool:

```bash
python -m detect_secrets -c 1 scan --force-use-all-plugins --exclude-files '(^frontend/node_modules/|^node_modules/|^acentem_takipte/public/frontend/|^\.playwright-mcp/|package-lock\.json$|frontend/package-lock\.json$)'
```

First pass found 619 findings. Of these, 612 were high-entropy false positives inside the generated TypeScript cache file `frontend/tsconfig.tsbuildinfo`.
That generated file was already ignored by `*.tsbuildinfo` but was still tracked, so it was removed from git.

Second pass after removing the generated cache found 8 `Secret Keyword` findings:

- `.github/workflows/backend-ci.yml`: local CI placeholder values `root` and `admin`
- `acentem_takipte/acentem_takipte/tests/test_break_glass.py`: test-only password fixture
- `docs/PRODUCTION_DEPLOY_CHECKLIST.md`: policy text that says production checks avoid printing secrets
- `frontend/tests/e2e/business-role-operational-smoke.spec.js`: environment variable name `E2E_BUSINESS_PASSWORD`
- `frontend/tests/e2e/customer-detail-profile-save.spec.js`: environment variable name `E2E_PASSWORD`
- `frontend/tests/e2e/g5-desk-free-qa-assist.spec.js`: environment variable name `E2E_RESTRICTED_PASSWORD`
- `scripts/deploy_prod_coolify_ghcr.ps1`: environment variable name `AT_PROD_ADMIN_PASSWORD`

No production secret value was identified in the second pass. The remaining findings are policy text, placeholders, or environment variable names that should stay out of logs and reports.

## Remaining Permission Or External Configuration Items

- Branch protection cannot be enabled from this local environment because no `GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_PAT` is present, and the available GitHub connector does not expose branch-protection mutation.
- Authenticated production smoke cannot be run from this local environment because `E2E_USER`, `E2E_PASSWORD`, `E2E_BASE_URL`, and `AT_PROD_ADMIN_PASSWORD` are not present.
- Sentry cannot be completed from this local environment because no `SENTRY_DSN` or `SENTRY_AUTH_TOKEN` is present.
- Slack/Telegram alert delivery cannot be completed unless production webhook settings are configured and an approved test destination is available.

The repository now includes `scripts/check_production_readiness.ps1` and the `Production Readiness Audit` GitHub Actions workflow to make these open items measurable. Run the script in report mode for a JSON readiness summary, or with `-FailOnOpenBlockers` when the environment is expected to have branch protection and required secret inputs configured. Set repository variable `PRODUCTION_READINESS_STRICT=true` to make the workflow enforce the same blocker policy in CI.
