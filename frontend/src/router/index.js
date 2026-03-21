import { createRouter, createWebHistory } from "vue-router";
import { AUX_WORKBENCH_ROUTE_DEFS } from "../config/auxWorkbenchConfigs";
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
const PremiumReport = () => import("../pages/PremiumReport.vue");
const ClaimRatioReport = () => import("../pages/ClaimRatioReport.vue");
const AgentPerformanceReport = () => import("../pages/AgentPerformanceReport.vue");
const CustomerSegmentationReport = () => import("../pages/CustomerSegmentationReport.vue");
const AuxWorkbench = () => import("../pages/AuxWorkbench.vue");
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
        title: { tr: "Fırsat Yönetimi", en: "Lead Management" },
        section: { tr: "Satış ve Portföy", en: "Sales & Portfolio" },
      },
    },
    {
      path: "/leads/:name",
      name: "lead-detail",
      component: LeadDetail,
      props: true,
      meta: {
        title: { tr: "Fırsat Detayı", en: "Lead Details" },
        section: { tr: "Satış ve Portföy", en: "Sales & Portfolio" },
      },
    },
    {
      path: "/offers",
      name: "offer-board",
      component: OfferBoard,
      meta: {
        title: { tr: "Teklif Panosu", en: "Offer Board" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
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
      },
    },
    {
      path: "/policies",
      name: "policy-list",
      component: PolicyList,
      meta: {
        title: { tr: "Poliçe Yönetimi", en: "Policy Management" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
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
      },
    },
    {
      path: "/customers",
      name: "customer-list",
      component: CustomerList,
      meta: {
        title: { tr: "Müşteri Yönetimi", en: "Customer Management" },
        section: { tr: "Satış ve Portföy", en: "Sales & Portfolio" },
      },
    },
    {
      path: "/claims",
      name: "claims-board",
      component: ClaimsBoard,
      meta: {
        title: { tr: "Hasar Panosu", en: "Claims Board" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
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
      },
    },
    {
      path: "/payments",
      name: "payments-board",
      component: PaymentsBoard,
      meta: {
        title: { tr: "Ödeme Operasyonları", en: "Payment Operations" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
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
      },
    },
    {
      path: "/renewals",
      name: "renewals-board",
      component: RenewalsBoard,
      meta: {
        title: { tr: "Yenileme Panosu", en: "Renewal Board" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
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
      },
    },
    {
      path: "/communication",
      name: "communication-center",
      component: CommunicationHub,
      meta: {
        title: { tr: "İletişim Merkezi", en: "Communication Center" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
      },
    },
    {
      path: "/communication-hub",
      redirect: { name: "communication-center" },
    },
    {
      path: "/reconciliation",
      name: "reconciliation-workbench",
      component: ReconciliationWorkbench,
      meta: {
        title: { tr: "Mutabakat Masası", en: "Reconciliation Workbench" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
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
      },
    },
    {
      path: "/reports",
      name: "reports",
      component: Reports,
      meta: {
        title: { tr: "Raporlar", en: "Reports" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
      },
    },
    {
      path: "/reports/premium",
      name: "premium-report",
      component: PremiumReport,
      meta: {
        title: { tr: "Prim Raporu", en: "Premium Report" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
      },
    },
    {
      path: "/reports/claim-ratio",
      name: "claim-ratio-report",
      component: ClaimRatioReport,
      meta: {
        title: { tr: "Hasar/Prim Oranı", en: "Claim Ratio Report" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
      },
    },
    {
      path: "/reports/agent-performance",
      name: "agent-performance-report",
      component: AgentPerformanceReport,
      meta: {
        title: { tr: "Acente Performans Raporu", en: "Agent Performance Report" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
      },
    },
    {
      path: "/reports/customer-segmentation",
      name: "customer-segmentation-report",
      component: CustomerSegmentationReport,
      meta: {
        title: { tr: "Müşteri Segmentasyon Raporu", en: "Customer Segmentation Report" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
      },
    },
    {
      path: "/data-import",
      name: "import-data",
      component: ImportData,
      meta: {
        title: { tr: "Veri İçe Aktarma", en: "Data Import" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
      },
    },
    {
      path: "/data-export",
      name: "export-data",
      component: ExportData,
      meta: {
        title: { tr: "Veri Dışa Aktarma", en: "Data Export" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
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
        meta: def.meta,
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
        meta: def.detailMeta,
      },
    ]),
  ],
});

export function getDeskRedirectTarget(preferredHome, interfaceMode, userId, roles = []) {
  const normalizedRoles = new Set(
    (roles || [])
      .map((role) => String(role || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const normalizedUserId = String(userId || "").trim().toLowerCase();
  const isAdminByUserId = normalizedUserId === "administrator";
  const isRoleDataPresent = normalizedRoles.size > 0;
  const isSystemRole = normalizedRoles.has("system manager") || normalizedRoles.has("administrator");

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

router.beforeEach((to) => {
  const target = getDeskRedirectTarget(
    sessionState.preferredHome,
    sessionState.interfaceMode,
    sessionState.userId,
    sessionState.roles,
  );
  if (!target) {
    if (
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
