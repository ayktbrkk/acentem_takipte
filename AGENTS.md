# AGENTS.md

This repository is a hybrid Frappe + Vue application for insurance agency operations. Use this file as the fast-start guide; follow the linked docs for details instead of duplicating their content.

Start with [docs/README.md](docs/README.md) for the documentation index, [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) for the short architecture summary, and [docs/ARCHITECTURE_MAP.md](docs/ARCHITECTURE_MAP.md) for the full verified architecture map.

## First 15 Minutes

Use this order when you are new to the repository or returning after a gap:

1. Read [README.md](README.md) for product scope, setup, and validation commands.
2. Read [docs/README.md](docs/README.md) to see the documentation entry points.
3. Read [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) for the short system summary.
4. Read [docs/ARCHITECTURE_MAP.md](docs/ARCHITECTURE_MAP.md) if the task touches multiple layers or an unfamiliar domain.
5. Open [acentem_takipte/hooks.py](acentem_takipte/hooks.py) if the task may affect routes, scheduler jobs, permissions, or DocType events.
6. Open [frontend/src/router/index.js](frontend/src/router/index.js) if the task changes SPA navigation or screen ownership.
7. Move from the page/component being changed to its matching API and service modules before editing.

## Source Of Truth Order

When documents or files seem to disagree, trust them in this order:

1. Runtime code that is actually executed in this workspace.
2. [acentem_takipte/hooks.py](acentem_takipte/hooks.py) for routes, scheduler jobs, and DocType event wiring.
3. [README.md](README.md), [docs/README.md](docs/README.md), [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md), and [docs/ARCHITECTURE_MAP.md](docs/ARCHITECTURE_MAP.md).
4. Other repo docs such as design, UI review, and production checklists.
5. External summaries, generated wiki pages, or stale notes.

If an external summary disagrees with the current workspace files, update the repo docs from the workspace, not the other way around.

## Change Checklist

Before editing:

- Confirm whether the task belongs to backend, frontend, or both.
- Confirm the runtime file, not just a similarly named pointer or generated file.
- Check whether the change affects bilingual UI copy, permissions, scheduler jobs, or built assets.

While editing:

- Keep changes in English for code, comments, identifiers, and tests.
- Keep user-facing UI bilingual and update both TR and EN sources in the same change.
- Prefer extending existing shared components, composables, or services instead of cloning patterns.
- Keep hooks, route rules, and scheduler changes inside [acentem_takipte/hooks.py](acentem_takipte/hooks.py), not the repository-root `hooks.py`.

Before closing the task:

- Run the narrowest relevant validation first.
- If frontend behavior changed, build assets when the shipped `/at` surface depends on them.
- If user-facing UI changed, review against [docs/UI_REVIEW_CHECKLIST.md](docs/UI_REVIEW_CHECKLIST.md).
- If the change affects deployment or runtime safety, verify against [docs/PRODUCTION_DEPLOY_CHECKLIST.md](docs/PRODUCTION_DEPLOY_CHECKLIST.md).

## Validation Matrix

Use the smallest validation that can falsify the change, then widen only if needed.

- Frontend page, composable, or shared component change:
	run the affected unit test first, then `npm run build` if the shipped `/at` surface changed.
- Frontend routing, session, or shell change:
	inspect [frontend/src/router/index.js](frontend/src/router/index.js), [frontend/src/main.js](frontend/src/main.js), and [frontend/src/state/session.js](frontend/src/state/session.js), then run the narrowest related unit test and `npm run build`.
- Backend API or service change:
	run the narrowest backend test or Bench command that exercises the touched behavior.
- Hook, scheduler, route, or DocType event change:
	review [acentem_takipte/hooks.py](acentem_takipte/hooks.py) and validate both the direct logic path and any queued or scheduled entrypoint that reaches it.
- Documentation-only change:
	verify links, file names, and command examples against the current workspace.

## Task Playbooks

### Frontend task

Use this flow when the work is mainly inside `frontend/`:

1. Start from the owning page in `frontend/src/pages/`.
2. Check the matching composable in `frontend/src/composables/` and any shared component in `frontend/src/components/`.
3. Confirm which API endpoint or `frappe.client` call supplies the data.
4. If UI copy changes, update both TR and EN in the same change.
5. Run the narrowest frontend validation first, usually the affected unit test.
6. Run `npm run build` when the shipped `/at` surface is affected.

### Backend task

Use this flow when the work is mainly inside `acentem_takipte/acentem_takipte/`:

1. Start from the API entrypoint, DocType, task function, or service that directly owns the behavior.
2. Confirm whether the logic belongs in `api/`, `services/`, `doctype/`, `renewal/`, or `tasks.py`.
3. If the change touches permissions, routes, hooks, or scheduler jobs, inspect [acentem_takipte/hooks.py](acentem_takipte/hooks.py) before editing.
4. Prefer service-layer fixes over duplicating logic inside the API layer.
5. Validate with the narrowest backend test or bench command available.
6. If runtime behavior depends on scheduled or queued work, verify the enqueue path as well as the pure logic path.

### Docs task

Use this flow when the work is documentation-only or architecture-heavy:

1. Prefer updating an existing doc before creating a new one.
2. Put high-level orientation in `README.md` or `docs/README.md`.
3. Put system structure and verified runtime behavior in `docs/ARCHITECTURE_OVERVIEW.md` or `docs/ARCHITECTURE_MAP.md`.
4. Keep docs tied to real file paths and current workspace state.
5. When documenting commands, prefer the commands already verified in this repo and Bench workflow.
6. If a doc changes contributor behavior, reflect that change in `AGENTS.md` too.

## Common Mistakes

- Editing the repository-root `hooks.py` instead of [acentem_takipte/hooks.py](acentem_takipte/hooks.py).
- Editing generated or pointer files when the runtime source lives elsewhere.
- Assuming `/at` is broken before rebuilding frontend assets after a shipped UI change.
- Changing user-facing UI copy in only one language.
- Adding a new local UI pattern when an existing shared component or policy-page pattern already fits.
- Fixing behavior in the page layer when the owning logic really lives in a composable, API module, or service.
- Running backend validation from the standalone Windows virtualenv instead of the Bench environment.
- Treating auto-generated summaries or stale docs as more authoritative than the current workspace files.
- Forgetting that scheduler, route, permission, or doc-event changes usually need a hooks-level review.

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