# Acentem Takipte

> [!WARNING]
> **Work in Progress:** This project is currently in active development. Features and functionalities are subject to change without notice.

Acentem Takipte is an insurance CRM application built on Frappe Framework and Vue 3. It helps agencies manage customers, policies, renewals, claims, offers, communications, and reconciliation workflows.

## Key Features

- Customer management with communication context
- Policy lifecycle tracking (issue, active, renewal)
- Automated renewal task generation and notification queueing
- Offer and claim workflows
- Communication center for draft/outbox operations
- Desk + SPA hybrid experience (`/at`)
- Accounting sync and reconciliation workbench

## Technology Stack

- Backend: Python, MariaDB, Redis, Frappe Framework v15
- Frontend: Vue 3, Vite, Tailwind CSS, Frappe UI

## Installation and Deployment (Frappe v15)

### Prerequisites

- Ubuntu 22.04+ (or equivalent Linux server)
- Python 3.10+, Node.js 20+, MariaDB, Redis
- Bench CLI with Frappe v15

### 1) Get the app

```bash
cd /opt/frappe-bench
bench get-app https://github.com/ayktbrkk/acentem_takipte.git
```

### 2) Install on your site

```bash
bench --site your-site.local install-app acentem_takipte
bench --site your-site.local migrate
```

### 3) Build frontend assets

```bash
cd /opt/frappe-bench/apps/acentem_takipte/frontend
npm ci
npm run build
cd /opt/frappe-bench
bench --site your-site.local clear-cache
```

### 4) Restart services

```bash
bench restart
```

### 5) Production process setup (optional)

```bash
sudo bench setup production frappe
```

### 6) Verify

- Open `https://your-domain/at`
- Confirm dashboard renders and authenticated actions are available

## Repository Structure

- `acentem_takipte/`: Frappe app package (DocTypes, APIs, hooks, patches, public assets)
- `acentem_takipte/public/frontend/`: Canonical compiled SPA output consumed by `/at`
- `frontend/`: SPA source code and frontend tests

## Accessing the Hub

After installation and login, open:

`http://[your-site-name]/at`

## License

MIT
