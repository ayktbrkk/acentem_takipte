# AGENTS.md

This repository is a hybrid Frappe + Vue application for insurance agency operations. Use this file as the fast-start guide; follow the linked docs for details instead of duplicating their content.

Start with [docs/README.md](docs/README.md) for the documentation index, [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) for the short architecture summary, and [docs/ARCHITECTURE_MAP.md](docs/ARCHITECTURE_MAP.md) for the full verified architecture map.

## Scope

- Backend lives in `acentem_takipte/acentem_takipte/` and runs inside Frappe Bench.
- Frontend source lives in `frontend/`; built assets are emitted to `acentem_takipte/public/frontend/` and served from `/at`.
- Runtime Frappe hooks live in `acentem_takipte/hooks.py`. The repository-root `hooks.py` is only a pointer.
- If you are editing hooks, scheduler events, route rules, or app metadata, change only `acentem_takipte/hooks.py`; the repository-root `hooks.py` is not read at runtime.

## Working Rules

- Keep code, comments, identifiers, and tests in English.
- Keep user-facing UI bilingual. Do not ship hardcoded copy in Vue or Python.
- In Python, wrap user-facing strings with `_()`.
- In Vue and JavaScript, use the translation helper already used by the surrounding module, such as `__()`, `t()`, or a local translation wrapper.
- When adding UI copy, update both English and Turkish translation sources in the same change.
- Reuse existing shared UI patterns before introducing a new one. Policy pages are the visual baseline.

Frontend and UI work should follow [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md). Review user-facing changes against [docs/UI_REVIEW_CHECKLIST.md](docs/UI_REVIEW_CHECKLIST.md).

## Commands

Run backend commands inside a Bench environment, not from the standalone Windows virtualenv in this repo.

### Frontend

From `frontend/`:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`
- `npm run e2e:smoke:ci` when E2E credentials are configured

### Backend

Typical local bench flow:

- `bench --site at.localhost install-app acentem_takipte`
- `bench --site at.localhost migrate`
- `bench --site at.localhost clear-cache`
- `bench --site at.localhost run-tests --app acentem_takipte`

CI also runs backend tests by creating a fresh Frappe v15 bench and site; see [backend CI](.github/workflows/backend-ci.yml) and [frontend CI](.github/workflows/frontend-ci.yml).

## Known Pitfalls

- Build frontend assets before expecting `/at` to work. A successful app install can still leave `/at` blank until `frontend/` is built.
- After frontend changes that affect shipped assets, run `npm run build` in `frontend/`. In Bench-based validation, follow with cache-clearing or `bench build --app acentem_takipte` when needed.
- Run Playwright from `frontend/`, not from the repository root, to avoid version-resolution issues.
- Frappe UI socket integration should remain disabled unless the environment intentionally exposes Socket.IO; otherwise E2E runs collect connection-refused noise.
- For seed/import code that must preserve explicit document names, verify Frappe autoname behavior first. `format:` autoname patterns can override explicit `name` values unless the import path is deliberate.
- When patching Python imports in tests, prefer the full inner package path rooted at `acentem_takipte.acentem_takipte...` if that is how the module is imported at runtime.

## Repo Landmarks

- [README.md](README.md): product overview, architecture, install flow, and local quality gates
- [docs/README.md](docs/README.md): documentation index and fastest entry point into repo docs
- [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md): short verified architecture summary for quick onboarding
- [docs/ARCHITECTURE_MAP.md](docs/ARCHITECTURE_MAP.md): full architecture map with runtime flows and module boundaries
- [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md): frontend design constitution and shared-component rules
- [docs/UI_REVIEW_CHECKLIST.md](docs/UI_REVIEW_CHECKLIST.md): quick review checklist for user-facing changes
- [docs/PRODUCTION_DEPLOY_CHECKLIST.md](docs/PRODUCTION_DEPLOY_CHECKLIST.md): production-safe deploy sequence and post-deploy checks

## Preference Order For Changes

- Make the smallest change that fits the existing module structure.
- Prefer extending shared components and services over cloning patterns.
- Do not commit generated frontend build output unless the task explicitly requires it.
- Do not change deployment or safety flags casually; production expectations are documented in [docs/PRODUCTION_DEPLOY_CHECKLIST.md](docs/PRODUCTION_DEPLOY_CHECKLIST.md).

## Local Environment Notes

Verified local setup for this repository uses WSL2 Ubuntu, Frappe Bench at `~/frappe-bench`, site `at.localhost`, and Node.js 20. If commands behave differently on Windows vs WSL, prefer the Bench environment as the source of truth for backend validation.