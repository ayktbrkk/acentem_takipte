import { createRouter, createWebHistory } from "vue-router";
import { AUX_WORKBENCH_ROUTE_DEFS } from "../config/auxWorkbench";
import { sessionState } from "../state/session";

export const OFFICE_BRANCH_QUERY_KEY = "office_branch";

const Dashboard = () => import("../pages/Dashboard.vue");
const OfferBoard = () => import("../pages/OfferBoard.vue");
const PolicyList = () => import("../pages/PolicyList.vue");
const PolicyDetail = () => import("../pages/PolicyDetail.vue");
const LeadList = () => import("../pages/LeadList.vue");
const LeadDetail = () => import("../pages/LeadDetail.vue");
const CustomerList = () => import("../pages/CustomerList.vue");
const CustomerDetail = () => import("../pages/CustomerDetail.vue");
const CustomerSearchPage = () => import("../pages/CustomerSearchPage.vue");
const OfferDetail = () => import("../pages/OfferDetail.vue");
const ClaimsBoard = () => import("../pages/ClaimsBoard.vue");
const ClaimDetail = () => import("../pages/ClaimDetail.vue");
const PaymentsBoard = () => import("../pages/PaymentsBoard.vue");
const PaymentDetail = () => import("../pages/PaymentDetail.vue");
const RenewalsBoard = () => import("../pages/RenewalsBoard.vue");
const RenewalTaskDetail = () => import("../pages/RenewalTaskDetail.vue");
const ImportData = () => import("../pages/ImportData.vue");
const ExportData = () => import("../pages/ExportData.vue");
const ReconciliationWorkbench = () => import("../pages/ReconciliationWorkbench.vue");
const ReconciliationDetail = () => import("../pages/ReconciliationDetail.vue");
const CommunicationHub = () => import("../pages/CommunicationHub.vue");
const Reports = () => import("../pages/Reports.vue");
const AdminGeneralSettings = () => import("../pages/AdminGeneralSettings.vue");
const AdminAlertChannelsSettings = () => import("../pages/AdminAlertChannelsSettings.vue");
const PremiumReport = () => import("../pages/PremiumReport.vue");
const ClaimRatioReport = () => import("../pages/ClaimRatioReport.vue");
const AgentPerformanceReport = () => import("../pages/AgentPerformanceReport.vue");
const CustomerSegmentationReport = () => import("../pages/CustomerSegmentationReport.vue");
const AuxWorkbench = () => import("../pages/AuxWorkbench.vue");
const QuickDocumentUpload = () => import("../pages/QuickDocumentUpload.vue");
const NotificationDraftsList = () => import("../pages/NotificationDraftsList.vue");
const NotificationDraftDetail = () => import("../pages/NotificationDraftDetail.vue");
const SentNotificationsList = () => import("../pages/SentNotificationsList.vue");
const SentNotificationDetail = () => import("../pages/SentNotificationDetail.vue");
const CompaniesList = () => import("../pages/CompaniesList.vue");
const CompanyDetail = () => import("../pages/CompanyDetail.vue");
const BranchesList = () => import("../pages/BranchesList.vue");
const BranchDetail = () => import("../pages/BranchDetail.vue");
const SalesEntitiesList = () => import("../pages/SalesEntitiesList.vue");
const SalesEntityDetail = () => import("../pages/SalesEntityDetail.vue");
const NotificationTemplatesList = () => import("../pages/NotificationTemplatesList.vue");
const NotificationTemplateEditor = () => import("../pages/NotificationTemplateEditor.vue");
const AccountingEntriesList = () => import("../pages/AccountingEntriesList.vue");
const AccountingEntryDetail = () => import("../pages/AccountingEntryDetail.vue");
const ReconciliationItemsList = () => import("../pages/ReconciliationItemsList.vue");
const ReconciliationItemDetail = () => import("../pages/ReconciliationItemDetail.vue");
const TasksList = () => import("../pages/TasksList.vue");
const TaskDetail = () => import("../pages/TaskDetail.vue");
const AuxRecordDetail = () => import("../pages/AuxRecordDetail.vue");
const BreakGlassRequest = () => import("../pages/BreakGlassRequest.vue");
const BreakGlassApprovals = () => import("../pages/BreakGlassApprovals.vue");

const ROLE_SYSTEM = ["AT System Manager", "System Manager", "Administrator"];
const ROLE_MANAGER = [...ROLE_SYSTEM, "AT Manager"];
const ROLE_ACCOUNTANT = [...ROLE_MANAGER, "AT Agent", "AT Accountant"];

const AUX_ROLE_MAP = {
  tasks: ROLE_ACCOUNTANT,
  "notification-drafts": ROLE_SYSTEM,
  "notification-outbox": ROLE_SYSTEM,
  companies: ROLE_SYSTEM,
  branches: ROLE_SYSTEM,
  "sales-entities": ROLE_SYSTEM,
  templates: ROLE_SYSTEM,
  "accounting-entries": ROLE_SYSTEM,
  "reconciliation-items": ROLE_SYSTEM,
};

const router = createRouter({
  history: createWebHistory("/at/"),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: Dashboard,
      meta: {
        title: { tr: "Pano", en: "Dashboard" },
        section: { tr: "Genel Görünüm", en: "Overview" },
        requiredRoles: ROLE_MANAGER,
      },
    },
    {
      path: "/dashboard/operations",
      redirect: { name: "dashboard", query: { tab: "daily" } },
    },
    {
      path: "/dashboard/sales",
      redirect: { name: "dashboard", query: { tab: "sales" } },
    },
    {
      path: "/dashboard/collections",
      redirect: { name: "dashboard", query: { tab: "collections" } },
    },
    {
      path: "/dashboard/renewals",
      redirect: { name: "dashboard", query: { tab: "renewals" } },
    },
    {
      path: "/leads",
      name: "lead-list",
      component: LeadList,
      meta: {
        title: { tr: "Fırsatlar", en: "Leads" },
        section: { tr: "Satış & Portföy", en: "Sales & Portfolio" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/leads/:name",
      name: "lead-detail",
      component: LeadDetail,
      props: true,
      meta: {
        title: { tr: "Fırsat Detayı", en: "Lead Details" },
        section: { tr: "Satış & Portföy", en: "Sales & Portfolio" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/offers",
      name: "offer-board",
      component: OfferBoard,
      meta: {
        title: { tr: "Teklifler", en: "Offers" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/offers/:name",
      name: "offer-detail",
      component: OfferDetail,
      props: true,
      meta: {
        title: { tr: "Teklif Detayı", en: "Offer Details" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/policies",
      name: "policy-list",
      component: PolicyList,
      meta: {
        title: { tr: "Poliçeler", en: "Policies" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/policies/:name",
      name: "policy-detail",
      component: PolicyDetail,
      props: true,
      meta: {
        title: { tr: "Poliçe Detayı", en: "Policy Details" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/customers",
      name: "customer-list",
      component: CustomerList,
      meta: {
        title: { tr: "Müşteriler", en: "Customers" },
        section: { tr: "Satış & Portföy", en: "Sales & Portfolio" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/customer-search",
      name: "customer-search",
      component: CustomerSearchPage,
      meta: {
        title: { tr: "Müşteri Ara", en: "Customer Search" },
        section: { tr: "Satış & Portföy", en: "Sales & Portfolio" },
        requiredRoles: ROLE_SYSTEM,
      },
    },
    {
      path: "/claims",
      name: "claims-board",
      component: ClaimsBoard,
      meta: {
        title: { tr: "Hasarlar", en: "Claims" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/claims/:name",
      name: "claim-detail",
      component: ClaimDetail,
      props: true,
      meta: {
        title: { tr: "Hasar Detayı", en: "Claim Details" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/payments",
      name: "payments-board",
      component: PaymentsBoard,
      meta: {
        title: { tr: "Ödemeler", en: "Payments" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/payments/:name",
      name: "payment-detail",
      component: PaymentDetail,
      props: true,
      meta: {
        title: { tr: "Ödeme Detayı", en: "Payment Details" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/renewals",
      name: "renewals-board",
      component: RenewalsBoard,
      meta: {
        title: { tr: "Yenilemeler", en: "Renewals" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/renewals/:name",
      name: "renewal-task-detail",
      component: RenewalTaskDetail,
      props: true,
      meta: {
        title: { tr: "Yenileme Detayı", en: "Renewal Details" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/communication",
      name: "communication-center",
      component: CommunicationHub,
      meta: {
        title: { tr: "İletişim Merkezi", en: "Communication Center" },
        section: { tr: "İletişim", en: "Communication" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/communication-hub",
      redirect: { name: "communication-center" },
    },
    {
      path: "/break-glass",
      name: "break-glass-request",
      component: BreakGlassRequest,
      meta: {
        title: { tr: "Acil Erişim Talebi", en: "Break-Glass Request" },
        section: { tr: "Finans ve Kontrol", en: "Finance & Control" },
        requiredRoles: ROLE_SYSTEM,
      },
    },
    {
      path: "/break-glass/approvals",
      name: "break-glass-approvals",
      component: BreakGlassApprovals,
      meta: {
        title: { tr: "Acil Erişim Onayları", en: "Break-Glass Approvals" },
        section: { tr: "Finans ve Kontrol", en: "Finance & Control" },
        requiredRoles: ROLE_SYSTEM,
      },
    },
    {
      path: "/reconciliation",
      name: "reconciliation-workbench",
      component: ReconciliationWorkbench,
      meta: {
        title: { tr: "Mutabakat", en: "Reconciliation" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
        requiredRoles: ROLE_SYSTEM,
      },
    },
    {
      path: "/reconciliation/:name",
      name: "reconciliation-detail",
      component: ReconciliationDetail,
      props: true,
      meta: {
        title: { tr: "Mutabakat Detayı", en: "Reconciliation Details" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
        requiredRoles: ROLE_SYSTEM,
      },
    },
    {
      path: "/reports",
      name: "reports",
      component: Reports,
      meta: {
        title: { tr: "Raporlar", en: "Reports" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/admin/general-settings",
      name: "admin-general-settings",
      component: AdminGeneralSettings,
      meta: {
        title: { tr: "Genel Ayarlar", en: "General Settings" },
        section: { tr: "Yönetim Ayarları", en: "Admin Settings" },
        requiredRoles: ROLE_SYSTEM,
      },
    },
    {
      path: "/admin/alert-channels",
      name: "admin-alert-channels",
      component: AdminAlertChannelsSettings,
      meta: {
        title: { tr: "Uyarı Kanal Ayarları", en: "Alert Channel Settings" },
        section: { tr: "Yönetim Ayarları", en: "Admin Settings" },
        requiredRoles: ROLE_SYSTEM,
      },
    },
    {
      path: "/reports/premium",
      name: "premium-report",
      component: PremiumReport,
      meta: {
        title: { tr: "Prim Raporu", en: "Premium Report" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/reports/claim-ratio",
      name: "claim-ratio-report",
      component: ClaimRatioReport,
      meta: {
        title: { tr: "Hasar Oranı Raporu", en: "Claim Ratio Report" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/reports/agent-performance",
      name: "agent-performance-report",
      component: AgentPerformanceReport,
      meta: {
        title: { tr: "Temsilci Performans Raporu", en: "Agent Performance Report" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/reports/customer-segmentation",
      name: "customer-segmentation-report",
      component: CustomerSegmentationReport,
      meta: {
        title: { tr: "Müşteri Segmentasyon Raporu", en: "Customer Segmentation Report" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/data-import",
      name: "import-data",
      component: ImportData,
      meta: {
        title: { tr: "Veri İçe Aktarma", en: "Data Import" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
        requiredRoles: ROLE_SYSTEM,
      },
    },
    {
      path: "/data-export",
      name: "export-data",
      component: ExportData,
      meta: {
        title: { tr: "Veri Dışa Aktarma", en: "Data Export" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
        requiredRoles: ROLE_SYSTEM,
      },
    },
    {
      path: "/customers/:name",
      name: "customer-detail",
      component: CustomerDetail,
      props: true,
      meta: {
        title: { tr: "Müşteri Detayı", en: "Customer Details" },
        section: { tr: "Müşteri", en: "Customer" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    {
      path: "/at-documents/upload",
      name: "at-documents-upload",
      component: QuickDocumentUpload,
      meta: {
        title: { tr: "Hızlı Doküman Yükle", en: "Quick Document Upload" },
        section: { tr: "Doküman Merkezi", en: "Document Center" },
        requiredRoles: ROLE_ACCOUNTANT,
      },
    },
    ...AUX_WORKBENCH_ROUTE_DEFS.flatMap((def) => [
      {
        path: def.listPath,
        name: def.listName,
        component: def.key === "tasks"
          ? TasksList
          : def.key === "notification-drafts"
            ? NotificationDraftsList
            : def.key === "notification-outbox"
              ? SentNotificationsList
              : def.key === "companies"
                ? CompaniesList
                : def.key === "branches"
                  ? BranchesList
                  : def.key === "sales-entities"
                    ? SalesEntitiesList
                    : def.key === "templates"
                      ? NotificationTemplatesList
                      : def.key === "accounting-entries"
                        ? AccountingEntriesList
                        : def.key === "reconciliation-items"
                          ? ReconciliationItemsList
            : AuxWorkbench,
        props: ["tasks", "notification-drafts", "notification-outbox", "companies", "branches", "sales-entities", "templates", "accounting-entries", "reconciliation-items"].includes(def.key) ? false : { screenKey: def.key },
        meta: { ...def.meta, requiredRoles: AUX_ROLE_MAP[def.key] || ROLE_ACCOUNTANT },
      },
      {
        path: def.detailPath,
        name: def.detailName,
        component: def.key === "tasks"
          ? TaskDetail
          : def.key === "notification-drafts"
            ? NotificationDraftDetail
            : def.key === "notification-outbox"
              ? SentNotificationDetail
              : def.key === "companies"
                ? CompanyDetail
                : def.key === "branches"
                  ? BranchDetail
                  : def.key === "sales-entities"
                    ? SalesEntityDetail
                    : def.key === "templates"
                      ? NotificationTemplateEditor
                      : def.key === "accounting-entries"
                        ? AccountingEntryDetail
                        : def.key === "reconciliation-items"
                          ? ReconciliationItemDetail
            : AuxRecordDetail,
        props: def.key === "tasks" || def.key === "notification-drafts" || def.key === "notification-outbox" || def.key === "companies" || def.key === "branches" || def.key === "sales-entities" || def.key === "templates" || def.key === "accounting-entries" || def.key === "reconciliation-items"
          ? (route) => ({ name: route.params.name })
          : (route) => ({ screenKey: def.key, name: route.params.name }),
        meta: { ...def.detailMeta, requiredRoles: AUX_ROLE_MAP[def.key] || ROLE_ACCOUNTANT },
      },
    ]),
  ],
});

export function getDeskRedirectTarget(preferredHome, interfaceMode, userId, roles = []) {
  const normalizedRoles = normalizeRoles(roles);
  const normalizedUserId = String(userId || "").trim().toLowerCase();
  const isAdminByUserId = normalizedUserId === "administrator";
  const isRoleDataPresent = normalizedRoles.size > 0;
  const isSystemRole = hasSystemManagerRole(roles);

  const isDeskOnlyUser =
    String(interfaceMode || "") === "desk"
    && isRoleDataPresent
    && !isSystemRole
    && normalizedUserId !== "administrator"
    && userId;

  if (
    isDeskOnlyUser
    || (String(preferredHome || "") === "/app" && !isSystemRole && !isAdminByUserId && isRoleDataPresent && userId)
  ) {
    return "/app";
  }
  return null;
}

function normalizeRoles(roles = []) {
  return new Set(
    (roles || [])
      .map((role) => String(role || "").trim().toLowerCase())
      .filter(Boolean),
  );
}

export function hasSystemManagerRole(roles = []) {
  const normalizedRoles = normalizeRoles(roles);
  return normalizedRoles.has("system manager") || normalizedRoles.has("administrator");
}

function hasAnyRoleFromSession(allowedRoles = []) {
  if (!allowedRoles.length) return true;
  const userRoles = normalizeRoles(sessionState.roles);
  return allowedRoles.some((r) => userRoles.has(String(r).trim().toLowerCase()));
}

router.beforeEach((to) => {
  const requiredRoles = to.meta?.requiredRoles;
  if (Array.isArray(requiredRoles) && requiredRoles.length > 0 && !hasAnyRoleFromSession(requiredRoles)) {
    return { name: "dashboard" };
  }

  const target = getDeskRedirectTarget(
    sessionState.preferredHome,
    sessionState.interfaceMode,
    sessionState.userId,
    sessionState.roles,
  );
  if (!target) {
    if (
      !sessionState.canAccessAllOfficeBranches &&
      sessionState.defaultOfficeBranch &&
      !to.query?.[OFFICE_BRANCH_QUERY_KEY]
    ) {
      return {
        path: to.path,
        query: {
          ...to.query,
          [OFFICE_BRANCH_QUERY_KEY]: sessionState.defaultOfficeBranch,
        },
        hash: to.hash,
      };
    }
    return true;
  }

  if (typeof window !== "undefined") {
    window.location.assign(target);
  }
  return false;
});

export default router;
