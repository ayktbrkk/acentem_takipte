# Acentem Takipte

Acentem Takipte is a comprehensive Insurance CRM (Customer Relationship Management) application built on the powerful Frappe Framework and Vue 3. It is designed specifically for insurance agencies to efficiently manage policies, customers, renewals, claims, and offers.

## 🌟 Key Features

*   **Customer Management**: Store and organize detailed customer records with integrated communication history across channels (Email, SMS).
*   **Policy lifecycle**: Track policies from creation through active coverage to renewal. Complete visibility of policy data and attached documents.
*   **Automated Renewals**: Intelligent background tasks built into Frappe to track expiring policies, dispatch notifications to customers, and create renewal tasks for agents.
*   **Offer & Claim Tracking**: Dedicated workspaces and views for handling insurance offers and managing claim records against active policies.
*   **Communication Center**: Built-in centralized dispatch hub. Monitor queue status, retry failed messages, and engage customers seamlessly without leaving the dashboard.
*   **Modern Frontend**: A fully bespoke, highly responsive SPA (Single Page Application) built with Vue 3 and Tailwind CSS running seamlessly alongside Frappe's traditional desk.
*   **Financial Reconciliation**: Base integration for tracking payments and basic accounting records against policies.

## 🛠️ Technology Stack

*   **Backend**: Python, MariaDB, Redis, [Frappe Framework 15](https://frappeframework.com/)
*   **Frontend**: Vue 3, Vite, Tailwind CSS, Frappe UI, Lucide Icons

## 🚀 Installation

Ensure you have a working Bench environment set up with Frappe V15.

### Standard Installation

1.  **Get the App**
    Get the app from this repository into your bench environment.
    ```bash
    bench get-app https://github.com/ayktbrkk/acentem_takipte.git
    ```

2.  **Install on Site**
    Install the app on your desired site.
    ```bash
    bench --site [your-site-name] install-app acentem_takipte
    ```

3.  **Build Frontend Assets**
    Because this app contains a custom Vue frontend, you must compile the bundle.
    ```bash
    bench --site [your-site-name] build --app acentem_takipte
    # If the standard build doesn't hook properly, you can compile it manually:
    cd apps/acentem_takipte/frontend
    npm install
    npm run build
    ```

4.  **Migrate & Restart**
    ```bash
    bench --site [your-site-name] migrate
    bench restart
    ```

## 📁 Repository Structure

The framework operates on the traditional structural model of Frappe Applications:
*   `acentem_takipte/`: The backend Python package containing modules, APIs, DocTypes, and business logic.
*   `acentem_takipte/public/frontend/`: Compiled Vue 3 production files.
*   `frontend/`: Source codes for the Vue 3 SPA (Single Page Application).
*   `patches/`: Frappe Database migration scripts.

## 🌐 Accessing the Hub

After a successful installation and login, you can access the modern agent dashboard directly via your browser at:
`http://[your-site-name]/at`

## 📄 License

This project is open-sourced under the MIT License.
