# Coolify VPS Deployment Guide

This guide explains how to deploy `acentem_takipte` on your own VPS with Coolify.

It is written for the actual structure of this repository, not for a generic Frappe app template.

It also reflects the live deployment path that was verified against a real Coolify v4 installation on a Hetzner VPS, including the fixes that were required to make the public domain and `/at` route work correctly.

Important constraint up front:

- this repository does not ship a ready-to-run `Dockerfile`
- this repository does not ship a ready-to-run production `docker-compose.yml`
- the app runs inside a Frappe Bench runtime and serves a Vue workspace from `/at`

That means a successful Coolify deployment has two parts:

1. prepare a custom application image that contains Frappe Bench plus this app
2. deploy that image in a multi-service Coolify stack with MariaDB, Redis, nginx frontend, and socket.io

If you skip the custom image step and try to deploy the Git repo directly as a plain Node or plain Python app, the result will not be a working installation.

## Who This Guide Is For

Use this guide if you want to:

- rent your own VPS from Hetzner, Contabo, DigitalOcean, Vultr, or a similar provider
- install Coolify on that VPS
- deploy `https://github.com/ayktbrkk/acentem_takipte`
- expose the app on a public domain such as `https://your-domain/at`

Use a different guide if you want to:

- run the app only in local Bench development
- deploy with raw Bench and Supervisor instead of Coolify
- use Frappe Cloud instead of self-hosting

## Recommended Target Architecture

For this repository, the production shape that works reliably is:

- `backend`
  - custom image
  - runs Gunicorn for Frappe
  - runs from `/home/frappe/frappe-bench/sites`
- `frontend`
  - same custom app image as backend
  - runs `nginx-entrypoint.sh`
  - listens on container port `8080`
  - proxies public HTTP(S) traffic to backend
  - serves built assets from the shared `sites` volume
- `websocket`
  - same custom app image as backend
  - runs `node /home/frappe/frappe-bench/apps/frappe/socketio.js`
- `mariadb`
  - database
- `redis-cache`
  - cache Redis
- `redis-queue`
  - queue Redis
- `redis-socketio`
  - realtime Redis pub/sub
- `configurator` or one-off setup job
  - writes common site config, installs app, runs migrate

The public request flow is:

1. browser hits your domain
2. Coolify proxy routes traffic to the `frontend` service
3. nginx serves `/assets/*` directly
4. nginx proxies dynamic requests to `backend`
5. Frappe serves `/login`, desk, APIs, and the `/at` route

## Minimum VPS Sizing

Coolify's official minimum is at least:

- 2 CPU cores
- 2 GB RAM
- 30 GB free storage

For this app, that is too tight if you build images and run Frappe on the same server.

Practical recommendation:

- staging or single-user test: 4 vCPU, 8 GB RAM, 80+ GB disk
- production: 4 vCPU, 8-16 GB RAM, SSD storage

If the same server will run:

- Coolify itself
- image builds
- MariaDB
- 3 Redis containers
- Frappe backend
- nginx frontend

then lower specs will fail under load or during builds.

## Before You Start

Prepare these items first:

- a fresh Ubuntu LTS VPS, ideally Ubuntu 24.04 LTS
- root SSH access to the VPS
- a domain or subdomain you control
- DNS access for that domain
- a container registry you can push to
  - GitHub Container Registry is a good default
- a plan for secret values
  - MariaDB root password
  - site DB password
  - Administrator password
  - any SMTP, Sentry, or third-party credentials

Also read these repo docs before starting:

- [README.md](../README.md)
- [PRODUCTION_DEPLOY_CHECKLIST.md](PRODUCTION_DEPLOY_CHECKLIST.md)

## Part 1: Install Coolify On The VPS

Coolify's official recommended quick install command is:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Notes from Coolify's official installation docs:

- use a fresh server when possible
- Ubuntu LTS is the easiest path
- the quick install script installs Docker and Coolify for you
- after installation, open the URL shown by the installer, usually `http://your-server-ip:8000`
- create the first Coolify admin account immediately

### 1. Prepare the VPS

From your local machine:

```bash
ssh root@your-server-ip
```

Update the server first:

```bash
apt update && apt upgrade -y
reboot
```

Reconnect after reboot.

### 2. Open the required ports

At minimum, allow:

- `22` for SSH
- `80` for HTTP
- `443` for HTTPS
- `8000` temporarily for first-time Coolify access

If you use UFW:

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw enable
```

### 3. Install Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

When installation finishes:

- open `http://your-server-ip:8000`
- create the first admin user
- after logging in, add your server if it is not already registered as the default target

### 4. Point a domain to Coolify itself if you want

This is optional, but cleaner than using `:8000` long term.

Example:

- `coolify.example.com` -> VPS public IP

Then configure Coolify's own domain in its admin UI.

## Part 2: Understand What This Repo Needs In Containers

This repo is not a static frontend and not a standalone Python API.

It needs all of these runtime conditions:

- Frappe Bench exists in the image
- the `acentem_takipte` app exists inside Bench
- frontend assets have been built from `frontend/`
- the target site exists in `sites/`
- the app is installed on that site
- migrations have run
- nginx serves the exact built assets generated for that image

This is why a plain Coolify Git deploy is not enough.

## Part 3: Build A Custom Application Image First

Because there is no production Dockerfile in this repository, you should create one in your own deployment fork or infrastructure repository.

The image you build should:

1. start from the official `frappe_docker` build/base image pattern
2. copy or clone `acentem_takipte` into `apps/`
3. install Python dependencies
4. install frontend dependencies
5. run the Vue build from `frontend/`
6. leave Bench and app code ready for runtime site installation

### Recommended approach

Create a separate deployment repository or deployment branch that contains:

- a `Dockerfile` for your custom worker/backend image
- an optional CI workflow that publishes the image to a registry
- a Coolify-ready `docker-compose.yml`

This repository now includes starter templates you can copy and adapt:

- [examples/Dockerfile.coolify.example](examples/Dockerfile.coolify.example)
- [examples/docker-compose.coolify.example.yml](examples/docker-compose.coolify.example.yml)
- [examples/.env.coolify.example](examples/.env.coolify.example)
- [examples/github-actions.ghcr.coolify-image.example.yml](examples/github-actions.ghcr.coolify-image.example.yml)
- [examples/Dockerfile.frontend.coolify.example](examples/Dockerfile.frontend.coolify.example)
- [examples/nginx.default.conf.coolify.example.template](examples/nginx.default.conf.coolify.example.template)
- [examples/docker-entrypoint.frontend.coolify.example.sh](examples/docker-entrypoint.frontend.coolify.example.sh)

Treat these files as starting points, not drop-in production files. They still need your own base image, registry, secrets, and domain values.

The app image and Docker Compose examples under `docs/examples/` were also validated during a live Coolify deployment recovery. In particular, the current examples already include the fixes that were required for this repo:

- the app image installs `acentem_takipte` into the Bench environment with `pip install -e`
- the configurator installs only `acentem_takipte` by default, not `erpnext`
- the frontend service exposes container port `8080` so Coolify can generate a working proxy target
- the configurator shell loop escapes `$$app` correctly so Docker Compose does not eat the variable before runtime
- the configurator mounts the shared `app_sites` volume so it can see the real site directory before deciding whether `bench new-site` is needed
- the configurator does not run runtime asset builds, which would otherwise desynchronize backend/frontend asset hashes across separate containers

The app Dockerfile example now follows the same broad shape as `frappe_docker`: build Bench in a `build` image, then copy the finished bench into a `base` image that can serve `backend`, `frontend`, and `websocket` roles.

The `.env` example is intentionally minimal. Put real secret values into Coolify environment variables or a private deployment repository, not into this repository.

The GitHub Actions file is stored under `docs/examples/` on purpose so it does not run automatically in this repository. If you want to make it live, copy it into `.github/workflows/` and adjust the trigger paths, tags, and Dockerfile path to match your deployment repository.

This repository now also includes a live workflow at `.github/workflows/coolify-ghcr-image.yml` that publishes `ghcr.io/<owner>/acentem-worker` on pushes to `main`. If you use this repository directly as the source of truth, point Coolify `APP_IMAGE` at the GHCR image instead of a host-local tag such as `acentem-worker:latest`.

For this repo's current naming, the direct production-style value is:

```text
APP_IMAGE=ghcr.io/ayktbrkk/acentem-worker:latest
```

If you switch an existing Coolify stack from a host-local image to GHCR, make the image reference change first, then trigger a redeploy after the workflow has published at least one successful `latest` tag.

Use the app repository itself as source code, but keep deployment mechanics separate if you do not want infrastructure files mixed into the main app repository.

### What your image must contain

At minimum, your custom image needs:

- `frappe-bench`
- this app in `apps/acentem_takipte`
- built `/at` frontend assets
- Node installed for socket.io
- Python dependencies installed in the Bench environment
- if you want to follow the standard `frappe_docker` pattern, nginx plus `nginx-entrypoint.sh`

If you build your app image on top of the standard `frappe_docker` production/custom image pattern, you can reuse the same image for:

- `backend`
- `frontend`
- `websocket`
- `configurator`

That is the most general path. A separate custom frontend image is optional, not required.

### Registry recommendation

Push your image to one of:

- `ghcr.io/your-org/acentem-worker:latest`
- Docker Hub
- GitLab Container Registry

This guide will refer to that image as:

```text
ghcr.io/your-org/acentem-worker:latest
```

## Part 4: Create The Coolify Resource

In Coolify:

1. create a new `Project`
2. create a new `Environment`, usually `production`
3. choose `Docker Compose` as the application type
4. either:
   - paste the compose file directly into Coolify, or
   - point Coolify at a deployment repository that contains the compose file

For this app, compose deployment is the right fit because you need multiple coordinated services.

## Part 5: Use A Compose Topology That Matches Frappe

Below is a reference topology. It is not the only valid topology, but it reflects the runtime characteristics that were actually required to make this app work reliably.

If you want the closest match to the official `frappe_docker` production model, use the same app image for backend, frontend, and websocket, and vary only the container command and environment.

### Example service roles

```yaml
services:
  backend:
    image: ghcr.io/your-org/acentem-worker:latest
    working_dir: /home/frappe/frappe-bench/sites

  frontend:
    image: ghcr.io/your-org/acentem-worker:latest
    expose:
      - "8080"
    command: ["nginx-entrypoint.sh"]

  websocket:
    image: ghcr.io/your-org/acentem-worker:latest
    command: ["node", "/home/frappe/frappe-bench/apps/frappe/socketio.js"]

  configurator:
    image: ghcr.io/your-org/acentem-worker:latest

  mariadb:
    image: mariadb:10.6

  redis-cache:
    image: redis:6.2

  redis-queue:
    image: redis:6.2

  redis-socketio:
    image: redis:6.2
```

### Why `working_dir` matters for backend

Set backend `working_dir` to:

```text
/home/frappe/frappe-bench/sites
```

Without this, Frappe can fail to resolve:

- site directories
- `assets/assets.json`
- login page asset bundles

That failure shows up as:

- site exists but Frappe says it does not exist
- login page loads unstyled
- `website.bundle.css` lookup fails

### Does frontend have to be `frappe/erpnext-nginx:latest`?

No. What you need is a frontend image that can do all of these things reliably:

- serve `/assets/*` from the shared `sites/assets` volume
- proxy normal HTTP requests to the Frappe backend
- proxy `/socket.io` upgrades to the socket.io listener
- pass the `X-Frappe-Site-Name` header consistently
- expose nginx configuration knobs through explicit environment variables

If you follow the official `frappe_docker` pattern, the more general answer is: use the same app image for `frontend`, and run it with `nginx-entrypoint.sh`.

That means you do not need a dedicated `frappe/erpnext-nginx:latest` image, and you also do not need a fully separate custom frontend image just to get started.

Using only the raw Frappe application process is not enough for the public web edge. You still need a frontend reverse-proxy role for production traffic handling, headers, websocket upgrades, and static asset delivery.

The simplest general production path is:

- build one custom app image that includes your app on top of a `frappe_docker`-style base
- run that image as `backend`
- run that same image as `frontend` with `nginx-entrypoint.sh`
- run that same image as `websocket` with `node .../socketio.js`

The separate custom frontend image shown in `docs/examples/` is an optional advanced path when you want tighter control over nginx behavior.

### Why frontend needs the shared assets bind mount

Any frontend image you use will need access to the live built asset set.

This app generates fresh assets during build. If nginx serves the image's old assets instead of the shared `sites/assets` volume, the page loads with stale filenames and broken styling.

If you follow the standard `frappe_docker` frontend pattern and run `nginx-entrypoint.sh` from the same app image, mounting the shared `sites` volume is usually enough:

```yaml
frontend:
  image: ghcr.io/your-org/acentem-worker:latest
  command: ["nginx-entrypoint.sh"]
  volumes:
    - app_sites:/home/frappe/frappe-bench/sites
```

In that model, the frontend container reads assets through the shared bench `sites` volume and does not need a separate host bind mount to `/usr/share/nginx/html/assets`.

If you do not do this, the usual symptom is:

- login page HTML loads
- CSS and icons return `404`
- page looks broken or unstyled

There is one more constraint that mattered in the live recovery: avoid rebuilding assets inside only one runtime container after the image is already built.

For this repository, the custom app image should already contain the built Vue `/at` assets and a self-consistent Frappe asset tree. If a one-off runtime job such as `configurator` runs `npm run build` or `bench build` without the same app filesystem being shared across `backend` and `frontend`, you can create asset drift:

- backend HTML starts referencing new hashed asset filenames
- frontend nginx still serves the old asset tree baked into its container image
- login or `/at` loads HTML but CSS requests return `404` or `text/html`

For that reason, the example `configurator` flow is intentionally limited to site creation, app installation, `migrate`, and cache clears. Build the image first, then deploy that image consistently across `backend`, `frontend`, and `websocket`.

### Why frontend nginx env vars matter

In the live Hetzner deployment, the frontend container also depends on nginx template environment variables, not only on volumes.

At minimum, make sure these values are present somewhere in the frontend runtime config:

```text
BACKEND=backend:8000
SOCKETIO=websocket:9000
FRAPPE_SITE_NAME_HEADER=your-domain.com
UPSTREAM_REAL_IP_ADDRESS=127.0.0.1
UPSTREAM_REAL_IP_HEADER=X-Forwarded-For
UPSTREAM_REAL_IP_RECURSIVE=off
CLIENT_MAX_BODY_SIZE=50m
```

If you want to set an upstream read timeout, use the correctly spelled key:

```text
PROXY_READ_TIMEOUT=120
```

Also make sure the frontend service is discoverable by Coolify's proxy generator. In the validated deployment, that meant keeping the service on container port `8080` and declaring it explicitly in Compose:

```yaml
frontend:
  expose:
    - "8080"
```

Without that, Coolify's Traefik side can stay stuck on a `service "frontend-..." error: port is missing` 503 even while the frontend container itself is running.

Be aware that some stock nginx images published in the Frappe ecosystem still expose the misspelled `PROXY_READ_TIMOUT` variable in the container environment by default. Treat that as an upstream image quirk. Keep your own deployment configuration explicit, and always verify the effective nginx config with `nginx -T | grep proxy_read_timeout` after changes.

### Why the deployment needs a dedicated socket.io service

The default Frappe web bundles will attempt socket.io activity unless realtime is fully disabled everywhere.

For a production setup, the cleaner path is to run socket.io correctly instead of letting `/socket.io` return `502`.

A working pattern for this repository is to keep Gunicorn and socket.io in separate services and point nginx at the websocket service on port `9000`.

Example pattern:

```yaml
websocket:
  image: ghcr.io/your-org/acentem-worker:latest
  command:
    - node
    - /home/frappe/frappe-bench/apps/frappe/socketio.js
```

That assumes your image actually contains Node at that path. If it does not, adjust the path for your image.

## Part 6: Environment Variables You Must Set

At minimum, define:

- `SITE_NAME`
- `DB_ROOT_USER`
- `MYSQL_ROOT_PASSWORD`
- `ADMIN_PASSWORD`
- `INSTALL_APPS`
- `FRAPPE_SITE_NAME_HEADER`

Recommended values:

```text
SITE_NAME=your-domain.com
INSTALL_APPS=acentem_takipte
FRAPPE_SITE_NAME_HEADER=your-domain.com
```

For this repository, do not default `INSTALL_APPS` to `erpnext,acentem_takipte` unless your image really contains ERPNext. During the live deployment, leaving `erpnext` in that list caused the configurator to fail with `No module named 'erpnext'`.

### Why `FRAPPE_SITE_NAME_HEADER` matters

Do not set:

```text
FRAPPE_SITE_NAME_HEADER=X-Frappe-Site-Name
```

That looks plausible but is wrong for this deployment shape.

Use the actual site name instead:

```text
FRAPPE_SITE_NAME_HEADER=your-domain.com
```

If this is wrong, the browser will hit the correct domain, nginx will proxy correctly, and Frappe will still answer with:

```text
your-domain.com does not exist
```

### Common site config values

Your `common_site_config.json` or setup job should ensure these exist:

- `db_host`
- `redis_cache`
- `redis_queue`
- `redis_socketio`
- `dns_multitenant: true`
- `default_site`
- `serve_default_site: true`
- `socketio_port: 9000`

`dns_multitenant: true` is recommended for this Coolify setup because the public site is resolved by host header and domain routing, not by a local development hostname pattern.

Example shape:

```json
{
  "db_host": "mariadb",
  "redis_cache": "redis://redis-cache:6379",
  "redis_queue": "redis://redis-queue:6379",
  "redis_socketio": "redis://redis-socketio:6379",
  "dns_multitenant": true,
  "default_site": "your-domain.com",
  "serve_default_site": true,
  "socketio_port": 9000
}
```

## Part 7: First Deployment Sequence In Coolify

After your compose stack exists, run the first install in this order.

### 1. Deploy the stack

Let Coolify create the containers and volumes first.

### 2. Create or verify the Frappe site

You need a site directory such as:

```text
/home/frappe/frappe-bench/sites/your-domain.com
```

How you do this depends on your image and setup service. Typical approaches:

- a one-off setup command in `configurator`
- a manual `bench new-site`
- a custom entrypoint script that creates the site only if it does not yet exist

### 3. Install the app

Once the site exists, install the app:

```bash
bench --site your-domain.com install-app acentem_takipte
```

### 4. Build frontend assets

This must happen before you expect `/at` to work:

```bash
cd /home/frappe/frappe-bench/apps/acentem_takipte/frontend
npm ci
npm run build
```

### 5. Run migrate and clear cache

```bash
cd /home/frappe/frappe-bench
bench --site your-domain.com migrate
bench --site your-domain.com clear-cache
bench --site your-domain.com clear-website-cache
```

If you install the app but skip the frontend build, `/at` may stay blank or broken.

## Part 8: Set The Public Domain In Coolify

Assign your public domain to the `frontend` service, not the backend database or Redis services.

If your frontend service listens on container port `80` or `8080`, the Coolify domain is enough, as long as the Coolify service target port matches the port your image actually binds.

Example:

```text
https://your-domain.com
```

Coolify will route that to the frontend service.

For Docker Compose applications in Coolify, store the domain as a full URL, not a bare hostname.

Use:

```text
https://your-domain.com
```

Do not use:

```text
your-domain.com
```

In the validated deployment, a bare hostname caused Coolify to generate broken Traefik rules such as `Host(\`\`) && PathPrefix(...)`, which left the public site on `503` until the domain fields were rewritten as full URLs.

The current `docs/examples/docker-compose.coolify.example.yml` expects the `frontend` service to be the only public entrypoint. Keep the domain attached there.

### DNS setup

Create:

- `A your-domain.com -> VPS_IP`
or
- `A app.your-domain.com -> VPS_IP`

Wait for DNS propagation before debugging HTTPS.

## Part 9: What To Verify After Deploy

Check these in order.

### Public checks

```bash
curl -I https://your-domain.com
curl -I https://your-domain.com/login
curl -I https://your-domain.com/at
```

Expected behavior:

- `/login` returns `200`
- `/at` redirects unauthenticated users to `/login?redirect-to=/at`

### In-browser checks

Verify:

- login page is styled correctly
- icons and logo load
- no blank screen at `/at`
- after login, the SPA mounts correctly

### Container checks

Verify:

- backend listens on `8000`
- websocket listens on `9000`
- frontend listens on `8080`
- nginx can serve the actual hash-named CSS files from the shared `sites` volume

## Part 10: Known Failure Modes For This Repo

These are not theoretical. They are the main ways this app breaks in a Coolify-style deployment.

### 1. `/at` returns `503`

Usually means one of these:

- Coolify routed to the wrong service
- frontend service has no HTTPS router
- frontend container is down
- frontend container is up but Coolify could not detect an exposed upstream port

Check:

- domain assignment in Coolify
- domain value format in Coolify, which should be `https://your-domain.com`
- frontend container logs
- generated proxy labels
- Coolify proxy logs for `service "frontend-..." error: port is missing`

### 2. Public domain resolves, but Frappe says the site does not exist

Usually means one of these:

- `FRAPPE_SITE_NAME_HEADER` is wrong
- `default_site` is missing
- `serve_default_site` is missing
- backend is not resolving the same site name nginx is proxying

### 3. Login page renders as broken plain HTML

Usually means nginx is serving stale asset files.

Fixes:

- make sure frontend serves the shared `sites/assets`
- make sure frontend build ran successfully
- make sure `assets.json` and actual CSS filenames match

### 4. Login page works, but browser console shows `/socket.io` `502`

Usually means socket.io is not running.

Fixes:

- add `socketio_port` to common site config
- start the Node `socketio.js` process in the dedicated `websocket` service
- verify port `9000` is listening inside the websocket container

### 5. App installs, but `/at` is blank

Usually means:

- frontend build never ran
- built manifest does not match served assets
- frontend build output was not copied into the image or shared volume

### 6. Bench commands fail inside the container as `root`

If your image has a wrapper bench script tied to another home directory, `bench` may fail under `root` but work under `frappe`.

If that happens:

- run Bench from the correct runtime user
- or bypass the wrapper and call the environment Python directly

## Part 11: A Practical Deployment Checklist

Use this short version when repeating the deploy.

1. Install Coolify on a fresh Ubuntu LTS VPS.
2. Point your domain to the VPS.
3. Build and publish your custom Frappe app image.
4. Create a Coolify Docker Compose resource.
5. Add backend, frontend, MariaDB, and 3 Redis services.
6. Set backend `working_dir` to `/home/frappe/frappe-bench/sites`.
7. Mount the shared `sites` volume into both backend and frontend.
8. Set `FRAPPE_SITE_NAME_HEADER` to the actual site domain.
9. Set `INSTALL_APPS=acentem_takipte` unless your image also includes ERPNext.
10. Expose frontend container port `8080` in Compose.
11. Enter the Coolify domain as a full URL such as `https://your-domain.com`.
12. Ensure `default_site`, `serve_default_site`, and `socketio_port` exist in common site config.
13. Create the site.
14. Install `acentem_takipte`.
15. Build frontend assets.
16. Run migrate and clear cache.
17. Verify `/login`, `/at`, and socket.io behavior.

## Part 12: Example Copy-Paste Runbook

This section is intentionally example-only. The values below are placeholders, not real secrets or live infrastructure values.

### Example deployment values

Use a private password manager and replace these before a real deployment:

```text
VPS_IP=203.0.113.10
COOLIFY_PANEL_DOMAIN=https://coolify.example.com
APP_DOMAIN=https://app.example.com
SITE_NAME=app.example.com
APP_IMAGE=ghcr.io/example-org/acentem-worker:latest
MYSQL_ROOT_PASSWORD=replace-with-example-db-root-password
ADMIN_PASSWORD=replace-with-example-admin-password
INSTALL_APPS=acentem_takipte
```

The `203.0.113.10` address above is a documentation-only example from the reserved TEST-NET range.

### Example DNS setup

Create these DNS records:

- `A coolify.example.com -> 203.0.113.10`
- `A app.example.com -> 203.0.113.10`

### Example Coolify environment variables

In the Coolify application, set values like these:

```text
SITE_NAME=app.example.com
DB_ROOT_USER=root
MYSQL_ROOT_PASSWORD=replace-with-example-db-root-password
ADMIN_PASSWORD=replace-with-example-admin-password
INSTALL_APPS=acentem_takipte
APP_IMAGE=ghcr.io/example-org/acentem-worker:latest
```

The compose example already maps `FRAPPE_SITE_NAME_HEADER` from `SITE_NAME`, so you do not need to define it separately unless you intentionally override the example.

### Example first deployment flow

1. Build and publish your app image, for example `ghcr.io/example-org/acentem-worker:latest`.
2. In Coolify, create a new Docker Compose application that points to this repository.
3. Set the compose file path to `/docs/examples/docker-compose.coolify.example.yml`.
4. Set the public domain on the `frontend` service as `https://app.example.com`.
5. Add the example environment variables above with your real values.
6. Deploy once and let Coolify create the containers and volumes.
7. Confirm that `configurator` either exits successfully or is at least idempotent on the next deploy.
8. Check that the public endpoints respond as expected.

### Example post-deploy checks

From outside the server:

```bash
curl -I https://app.example.com/login
curl -I https://app.example.com/at
```

Expected example result:

- `/login` returns `200 OK`
- `/at` redirects to `/login?redirect-to=/at` when you are not authenticated

### Example cleanup rule

If you debug inside Coolify's application directory on the VPS, do not run ad hoc `docker compose up` commands there unless you are deliberately replacing Coolify management. Manual compose runs can create a second unmanaged container set that looks similar to the real deployment and complicates recovery.

## Part 13: Recommended Validation Commands

After deploy, these are the first commands to run.

### From outside the server

```bash
curl -I https://your-domain.com/login
curl -I https://your-domain.com/at
curl -I https://your-domain.com/assets/frappe/dist/css/website.bundle.YOURHASH.css
```

### From inside the backend container

```bash
curl -I http://127.0.0.1:8000/login
```

### From inside the websocket container

```bash
curl -I http://127.0.0.1:9000/socket.io/?EIO=4&transport=polling
```

### From inside the frontend container

```bash
curl -I http://127.0.0.1:8080/login
nginx -T | grep -E 'listen|proxy_read_timeout|upstream|socket.io'
```

## Part 14: What To Keep In Git And What Not To Keep In Git

Keep in git:

- deployment documentation
- Dockerfile or compose templates that are environment-agnostic
- CI workflows that build and publish images

Do not keep in git:

- production passwords
- site-specific `site_config.json` secrets
- emergency one-off hotfix values

## Part 15: When To Prefer Raw Bench Instead Of Coolify

Choose raw Bench instead of Coolify if:

- you already operate a stable Frappe/ERPNext Bench fleet
- you want fewer moving parts
- you do not want to maintain custom container images
- your team is more comfortable with Supervisor, Nginx, and direct server operations

Choose Coolify if:

- you want UI-based service management
- you want containerized multi-service deploys
- you are already standardizing on Compose-based deployments

## Final Recommendation

For this repository, the most reliable Coolify path is:

1. prepare and publish your own custom Frappe app image
2. deploy with Docker Compose in Coolify
3. keep frontend port exposure, backend working directory, site header, socket.io wiring, and Coolify domain format explicit

Do not rely on generic Frappe defaults for those areas. They are the places where this app most easily looks healthy at container level while still failing at runtime.