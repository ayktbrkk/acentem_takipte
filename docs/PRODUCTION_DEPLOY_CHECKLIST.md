# AT Production Deploy Checklist

This checklist is the operational runbook for production deployments of `acentem_takipte` on a Frappe Bench.

Use it together with the installation steps in [README.md](../README.md). The goal is to reduce configuration drift, failed asset deploys, and unsafe production toggles.

Verified project environment in this repository:

- Bench path: `~/frappe-bench`
- Main site used during verification: `at.localhost`
- Application route: `http://at.localhost:8000/at/`
- Live Coolify site verified on 2026-05-20: `https://kipsigorta.acentemtakipte.com/at/`
- Live image source: `ghcr.io/ayktbrkk/acentem-worker:latest`
- Latest verified production deploy-helper commit: `02173de020d9bd7f27bcac3bd3b4c533ebf56b99`
- Latest verified production image commit: `928264d021b4926e55b03a0aef78801434779c30`

For real production, replace `at.localhost` and the localhost URL with the actual site and public domain, but keep the same command order and safety checks.

The current production path for this repository is Coolify + GHCR. A push to `main` publishes the app image through `.github/workflows/coolify-ghcr-image.yml`; the server then pulls `ghcr.io/ayktbrkk/acentem-worker:latest` and recreates the `backend`, `frontend`, `websocket`, `worker-short`, `worker-long`, and `scheduler` services.

## 0.1 Verified 2026-06-07 Production Roadmap Note

- Commit `928264d021b4926e55b03a0aef78801434779c30` was published by the `Coolify GHCR Image` workflow and deployed to the live Coolify stack.
- Production tag `production-2026-06-07-928264d` points at the latest deployed runtime image commit for rollback/reference.
- Earlier 2026-06-07 production tag `production-2026-06-07-c7ffeb7` points at the previous runtime image and can be used as the immediate rollback reference.
- The live stack now runs separate `worker-short`, `worker-long`, and `scheduler` services.
- Live `bench doctor` reported `Workers online: 2` and no queued jobs after the final helper run.
- Production safety flags were checked without printing secrets: `developer_mode` and `at_enable_demo_endpoints` were not enabled; `sentry_dsn_set=false` remains an open observability item.
- `detect-secrets` was run against git-tracked files. The generated `frontend/tsconfig.tsbuildinfo` cache file was removed from git, and the remaining findings were classified as local CI/test placeholders or environment variable names. See [production_roadmap_evidence_2026-06-07.md](audit/production_roadmap_evidence_2026-06-07.md).

## 0. Verified 2026-05-20 Release Note

- Commit `fcaece85c1364094e5fc8b66070bedf50fd51f7c` aligned visible AT operational routes with actual runtime permission convergence.
- `AT Payment Installment`, `AT Task`, and related visible operational DocTypes now receive converged `Custom DocPerm` read access plus runtime scope hooks.
- `AT Document` now uses linked-record scope plus unlinked-owner fallback, while permanent delete remains restricted to system roles.
- Reports scheduled-config management is now limited to desk/system users, so operational SPA users no longer hit `get_scheduled_report_configs` validation failures.
- Windows operators can use `scripts/deploy_prod_coolify_ghcr.ps1` after pushing to `main` to wait for the GHCR workflow, redeploy the live Coolify stack, rerun migrate/permission convergence, and smoke test the four critical `/at` routes.
- If a host-local emergency image is ever required again, build it from the already working app image `ghcr.io/ayktbrkk/acentem-worker:latest`, not from `frappe/erpnext-worker:latest`; otherwise the frontend runtime can lose `nginx-entrypoint.sh`.

## 1. Pre-Deploy Gate

- Confirm the target site name and Bench path before touching production.
- Confirm the working tree is clean and the commit to deploy is tagged or otherwise recorded.
- Confirm recent backup capacity exists on the server disk.
- Confirm no one is actively running data-import or admin bulk operations.
- Confirm scheduler and workers are healthy before the deploy starts.

Example:

```bash
cd ~/frappe-bench
bench --site at.localhost doctor
bench --site at.localhost show-config
git -C apps/acentem_takipte rev-parse HEAD
```

## 2. Production Safety Flags

Before the deploy, verify the site configuration is safe for production.

- `developer_mode` must be `0`.
- `at_enable_demo_endpoints` must be absent or `0`.
- Secrets must remain outside git history and only in site/server configuration.
- Error tracking configuration such as Sentry DSN should be set deliberately, not ad hoc.

Check the live config:

```bash
cd ~/frappe-bench
bench --site at.localhost console
```

Then verify:

```python
cfg = frappe.get_site_config() or {}
print({
    "developer_mode": cfg.get("developer_mode"),
    "at_enable_demo_endpoints": cfg.get("at_enable_demo_endpoints"),
    "sentry_dsn_set": bool(cfg.get("sentry_dsn")),
})
```

Do not leave demo or smoke endpoints enabled in production.

## 3. Backup Before Change

Take a fresh application/database backup before migrate/build steps.

```bash
cd ~/frappe-bench
bench --site at.localhost backup --with-files
```

Minimum expectation:

- database backup completed successfully
- private files backup completed successfully
- public files backup completed successfully
- backup path or artifact location recorded in the deploy note

If you are about to edit `site_config.json`, keep a timestamped copy first.

```bash
cd ~/frappe-bench/sites/at.localhost
cp site_config.json "site_config.json.$(date +%Y%m%d%H%M%S).bak"
```

## 4. Build And Deploy Sequence

Use the path that matches the target environment.

### Raw Bench path

Run this sequence only for a non-containerized Bench deployment.

```bash
cd ~/frappe-bench/apps/acentem_takipte/frontend
npm ci
npm run build

cd ~/frappe-bench
bench --site at.localhost migrate
bench --site at.localhost clear-cache
bench build --app acentem_takipte
bench --site at.localhost clear-website-cache
```

If the server uses managed processes, reload them only after the above steps succeed.

Example:

```bash
sudo supervisorctl restart all
sudo systemctl reload nginx
```

If you use `bench setup production`, treat it as one-time infrastructure setup, not as the normal per-release deploy command.

### Coolify/GHCR path

For the live Coolify deployment, use this order:

1. Push the intended commit to `main`.
2. Wait for the `Coolify GHCR Image` GitHub Actions workflow to complete successfully.
3. On the server, take a fresh backup before replacing containers.
4. Pull the new `ghcr.io/ayktbrkk/acentem-worker:latest` image.
5. Recreate only app services: `backend`, `frontend`, `websocket`, `worker-short`, `worker-long`, and `scheduler`.
6. Verify production safety flags inside the backend container without printing secrets.
7. Run `bench --site <site> migrate`, `clear-cache`, and `clear-website-cache` inside the backend container.
8. Smoke test `/api/method/ping`, `/at/`, login redirect, security headers, worker/scheduler health, and logs.

Example commands used for the verified 2026-05-20 deployment:

```bash
cd /data/coolify/applications/<coolify-app-id>
docker compose pull backend frontend websocket worker-short worker-long scheduler configurator
docker compose up -d --no-deps --force-recreate backend websocket frontend worker-short worker-long scheduler

docker exec <backend-container> bash -lc '
  cd /home/frappe/frappe-bench &&
  python3 - <<'PY' &&
import json
from pathlib import Path

site_name = "kipsigorta.acentemtakipte.com"
config = {}
for path in (Path("sites/common_site_config.json"), Path("sites") / site_name / "site_config.json"):
    if path.exists():
        config.update(json.loads(path.read_text()))

def enabled(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False

if enabled(config.get("developer_mode", 0)) or enabled(config.get("at_enable_demo_endpoints", 0)):
    raise SystemExit("Unsafe production flags are enabled.")

print("Production safety flags OK.")
PY
  bench --site kipsigorta.acentemtakipte.com migrate &&
  bench --site kipsigorta.acentemtakipte.com clear-cache &&
  bench --site kipsigorta.acentemtakipte.com clear-website-cache &&
  bench --site kipsigorta.acentemtakipte.com doctor
'
```

For the Windows-hosted operator flow used in this repository, the equivalent helper is:

```powershell
.\scripts\deploy_prod_coolify_ghcr.ps1
```

By default the script waits for the `Coolify GHCR Image` workflow for the current `HEAD`, updates `APP_IMAGE` back to `ghcr.io/ayktbrkk/acentem-worker:latest`, recreates `backend`, `frontend`, `websocket`, `worker-short`, `worker-long`, and `scheduler`, runs `migrate`, reruns `ensure_role_permissions`, clears caches, verifies `bench doctor`, and smoke tests the four critical AT routes.
Use `-DryRun` to print the exact workflow, remote deploy, and smoke-test plan without touching GitHub, SSH, or the live stack.

## 5. Post-Deploy Verification

Validate both the Frappe shell and the `/at` frontend route.

- `/at` loads without a blank screen
- authenticated users can open the workspace
- a non-admin business flow can still read only authorized records
- background jobs are processed
- `bench doctor` reports at least one online worker and no unexpected queue buildup
- no demo/smoke endpoint is enabled accidentally

Suggested checks:

```bash
cd ~/frappe-bench
bench --site at.localhost list-apps
bench --site at.localhost doctor
```

For Coolify/GHCR, also verify the running image revision:

```bash
docker inspect <backend-container> --format '{{.Image}}'
docker image inspect ghcr.io/ayktbrkk/acentem-worker:latest --format '{{json .Config.Labels}}'
```

Application checks:

1. Open `https://your-domain/at`
2. Log in as a real business role, not only `Administrator`
3. Open a policy detail page
4. Open a customer detail page
5. Trigger one safe report/export flow
6. Confirm scheduler queue is draining normally

## 6. Operational Log Checks

Inspect logs immediately after deploy.

```bash
cd ~/frappe-bench
tail -n 200 logs/web.error.log
tail -n 200 logs/worker.error.log
tail -n 200 logs/scheduler.log
```

Pay special attention to:

- import errors
- missing asset manifest errors
- migration failures
- permission regressions
- repeated external-service failures such as FX refresh jobs

## 7. Rollback Conditions

Rollback quickly if any of the following happen:

- the `/at` route fails to render
- migration succeeds but key DocTypes fail at runtime
- worker queues back up continuously after release
- permissions regress for standard user roles
- unexpected writes to live configuration are detected

Minimum rollback path:

1. Revert the app to the last known good commit.
2. Restore the matching database/files backup if the release included irreversible data changes.
3. Rebuild assets and rerun migrate only for the restored revision.
4. Recheck `/at`, scheduler health, and worker logs.

## 8. Release Sign-Off

Do not call the release complete until all of the following are true:

- backups are confirmed
- build and migrate completed without manual patching
- `/at` route verified interactively
- production safety flags verified
- logs reviewed
- deployed commit SHA recorded
- rollback point recorded

## 9. AT-Specific Notes

- Production must not run with `at_enable_demo_endpoints=1`.
- Scheduled report configuration persists through `site_config.json`; treat manual config edits as sensitive operations and back them up first.
- Backend validations should be run in the Bench environment, not a standalone Windows Python environment without Frappe.
- If a deployment changes frontend assets, validate both `npm run build` and `bench build --app acentem_takipte`.
- In the Coolify/GHCR path, frontend assets are built into the image; do not rebuild them inside one running container unless you intentionally rebuild and redeploy the image.
