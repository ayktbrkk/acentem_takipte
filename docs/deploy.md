# Deployment Notes

This repository is a Frappe app with a Vue (Vite) SPA mounted at `/at`.

## Supported Runtimes

- Python: 3.10+
- Frappe: v15 (Bench-managed)
- Node.js: 20+

## Frontend Build Contract

- Frontend source: `frontend/`
- Build output (generated): `acentem_takipte/public/frontend/`
- Manifest (generated): `acentem_takipte/public/frontend/.vite/manifest.json`
- Serving path (site assets): `/assets/acentem_takipte/frontend/...`

Important:
- Frontend build artifacts are generated during build/deployment and are not committed to the repository.
- `/at` injects the latest Vite assets dynamically from the manifest in `acentem_takipte/www/at.py`.

## Optional Realtime Socket.IO

`/at` now treats Socket.IO as an explicit deployment feature, not a frontend default.

Site config keys:
- `at_realtime_enabled`: `true` or `false`
- `at_realtime_port`: optional integer, defaults to `9000` when realtime is enabled

Example `site_config.json` fragment:

```json
{
   "at_realtime_enabled": true,
   "at_realtime_port": 9000
}
```

Behavior:
- if `at_realtime_enabled` is falsy, `/at` mounts without Socket.IO
- if it is truthy, `/at` passes the configured port to `frappe-ui`
- after changing these values, rebuild frontend assets and clear cache so `/at` boots with the new session payload and latest bundle

## Deploy (Bench, Typical Linux)

From your bench:

```bash
cd /opt/frappe-bench

# update app code (choose one)
bench get-app https://github.com/ayktbrkk/acentem_takipte.git
# or if already installed
cd apps/acentem_takipte
git pull

# apply backend changes
cd /opt/frappe-bench
bench --site your-site.local migrate

# build frontend assets
cd /opt/frappe-bench/apps/acentem_takipte/frontend
npm ci
npm run build

# clear caches and restart
cd /opt/frappe-bench
bench --site your-site.local clear-cache
bench restart
```

Verify:
- Local: `http://your-site.local/at` (Bench often runs on `:8000`, depending on your setup)
- Production: `https://your-domain/at`

## Local Dev (Windows Host + frappe_docker)

This repo includes a helper script for docker-based local development:

- `scripts/sync_frappe_docker_dev.ps1`

Typical usage:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\\sync_frappe_docker_dev.ps1
```

This script (by default):
- builds the frontend
- restarts containers
- clears cache
- prints the manifest main asset names and performs HTTP checks for JS/CSS

## Optional: CI Smoke E2E

The GitHub Actions workflow includes an optional Playwright smoke job that runs only when:
- `E2E_BASE_URL` is configured as a repo/environment variable
- `E2E_USER` and `E2E_PASSWORD` are configured as secrets

## Troubleshooting

### `/at` loads but shows a blank page

Symptoms:
- `/at` HTML has `<div id="app"></div>` but no `<script type="module" ...>` tags.

Checks:
1. Ensure the manifest exists:
   - `acentem_takipte/public/frontend/.vite/manifest.json`
2. Ensure the main JS/CSS are served (HTTP 200):
   - `/assets/acentem_takipte/frontend/assets/main-*.js`
   - `/assets/acentem_takipte/frontend/assets/main-*.css`
3. Rebuild and restart:
   - `npm ci && npm run build` (in `frontend/`)
   - `bench --site <site> clear-cache`
   - `bench restart`

### `/at` shows `ERR_CONNECTION_REFUSED` for `localhost:9000/socket.io`

Checks:
1. Confirm the served frontend bundle is current:
   - rebuild with `npm run build` in `frontend/`
2. Confirm `site_config.json` matches your intent:
   - if you do not run a Socket.IO service, keep `at_realtime_enabled` unset or `false`
   - if you do run one, verify `at_realtime_port`
3. Clear cache / restart after backend config changes:
   - `bench --site <site> clear-cache`
   - `bench restart`
