# 🛡️ Acentem Takipte

[![Framework: Frappe](https://img.shields.io/badge/Framework-Frappe-blue.svg)](https://frappeframework.com/)
[![Frontend: Vue 3](https://img.shields.io/badge/Frontend-Vue%203-42b883.svg)](https://vuejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Acentem Takipte** is a modern, comprehensive Insurance Agency CRM and Policy Management system built on the powerful **Frappe Framework** with a sleek, high-performance **Vue 3** single-page application (SPA) frontend.

Designed specifically for insurance agencies to streamline their operations, track policies, manage leads, and handle complex financial reconciliations in one unified platform.

---

## ✨ Key Features

### 👥 Customer & Lead Management
- **Centralized CRM**: Detailed profiles for individual and corporate clients.
- **Lead Pipeline**: Track potential sales from initial contact to policy issuance.
- **Access Logging**: Secure tracking of data access for compliance.

### 📜 Policy Lifecycle
- **Policy Management**: Full lifecycle tracking including endorsements and renewals.
- **Snapshots**: Historical versioning of policy data for accurate record-keeping.
- **Offer Management**: Generate and track multiple quotes/offers for prospects.

### 💰 Financials & Claims
- **Payment Tracking**: Integrated payment recording and status monitoring.
- **Reconciliation Workbench**: Advanced tools for matching agency records with insurance company statements.
- **Claims Board**: Simplified tracking of insurance claims from filing to settlement.

### 📧 Communication & Automation
- **Communication Center**: Manage client interactions in one place.
- **Notification Templates**: Automated reminders for renewals and important dates via customizable templates.

---

## 🛠️ Tech Stack

- **Backend**: [Frappe Framework](https://frappeframework.com/) (Python, MariaDB/PostgreSQL)
- **Frontend**: [Vue 3](https://vuejs.org/) SPA + [Vite](https://vitejs.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Frappe UI](https://frappeui.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/) / Composition API

---

## 📂 Project Structure

- `acentem_takipte/`: Frappe application source code (DocTypes, Python logic).
- `frontend/`: Vue 3 + Vite SPA frontend projects.
- `docs/`: Technical documentation and guides.
- `scripts/`: Utility scripts for development and deployment.

---

## 🚀 Getting Started

### Prerequisites
- Frappe Bench environment installed.
- Node.js (v16+) and npm/yarn.

### Installation

1. **Install the App**:
   ```bash
   bench get-app https://github.com/[your-username]/acentem_takipte.git
   bench --site [your-site] install-app acentem_takipte
   ```

2. **Setup Frontend**:
   ```bash
   cd apps/acentem_takipte/frontend
   npm install
   ```

### Development

#### Run Frontend Dev Server
```bash
cd frontend
npm run dev
```
The app will be accessible at `your-site-url/at`.

#### Build for Production
```bash
cd frontend
npm run build
```

---

## 🐳 Docker Note

If you are running in a Docker environment and encounter 404 errors for assets after a restart, use the recovery script:

```powershell
.\scripts\ensure_docker_asset_links.ps1 -ClearCache
```

This ensures the symbolic links between the backend and frontend containers are correctly established.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ for the insurance industry.*

