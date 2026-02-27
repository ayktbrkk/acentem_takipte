# Acentem Takipte

Insurance agency CRM and policy management app for Frappe/ERPNext with a Vue 3 frontend.

## Project Layout

- `acentem_takipte/`: Frappe app source
- `frontend/`: Vue 3 + Vite + Tailwind + frappe-ui SPA

## Key Decisions

- SPA route base: `/at`
- Website fallback entry: `www/at.py` + `www/at.html`
- Website route rules:
  - `/at`
  - `/at/<path:app_path>`
- Vite base: `/assets/acentem_takipte/frontend/`
- Asset includes resolved via `acentem_takipte/utils/assets.py` manifest reader

## Implemented Core DocTypes

- `AT Sales Entity`
- `AT Customer`
- `AT Policy`
- `AT Insurance Company`
- `AT Branch`
- `AT Lead`
- `AT Access Log`
- `AT Notification Template`

## Frontend Pages

- `Dashboard`
- `PolicyList`
- `CustomerDetail`

## Local Frontend Commands

```bash
cd frontend
npm install
npm run dev
npm run build
```

## Docker Asset Link Recovery

If `/at` renders but JS/CSS files return 404 after container restart, run:

```powershell
.\scripts\ensure_docker_asset_links.ps1 -ClearCache
```

This ensures `/home/frappe/frappe-bench/sites/assets/acentem_takipte` points to app `public/` in both backend and frontend containers.

## Notes

- Dashboard data fetching uses `createResource` with `frappe.client.get_list`.
- `AT Policy` supports naming by `policy_no` or fallback `AT-POL-.#####.`.
- `AT Customer` uses `tax_id` as primary naming key.
