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
const BreakGlassRequest = () => import("../pages/BreakGlassRequest.vue");
const BreakGlassApprovals = () => import("../pages/BreakGlassApprovals.vue");

const router = createRouter({
  history: createWebHistory("/at/"),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: Dashboard,
      meta: {
        title: "Dashboard",
        section: "Overview",
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
        title: "Fırsatlar",
        section: "Sales & Portfolio",
      },
    },
    {
      path: "/leads/:name",
      name: "lead-detail",
      component: LeadDetail,
      props: true,
      meta: {
        title: "Fırsat Detayı",
        section: "Sales & Portfolio",
      },
    },
    {
      path: "/offers",
      name: "offer-board",
      component: OfferBoard,
      meta: {
        title: "Teklifler",
        section: "Insurance Operations",
      },
    },
    {
      path: "/offers/:name",
      name: "offer-detail",
      component: OfferDetail,
      props: true,
      meta: {
        title: "Teklif Detayı",
        section: "Insurance Operations",
      },
    },
    {
      path: "/policies",
      name: "policy-list",
      component: PolicyList,
      meta: {
        title: "Poliçeler",
        section: "Insurance Operations",
      },
    },
    {
      path: "/policies/:name",
      name: "policy-detail",
      component: PolicyDetail,
      props: true,
      meta: {
        title: "Poliçe Detayı",
        section: "Insurance Operations",
      },
    },
    {
      path: "/customers",
      name: "customer-list",
      component: CustomerList,
      meta: {
        title: "Müşteriler",
        section: "Sales & Portfolio",
      },
    },
    {
      path: "/customer-search",
      name: "customer-search",
      component: CustomerSearchPage,
      meta: {
        title: "Müşteri Ara",
        section: "Sales & Portfolio",
      },
    },
    {
      path: "/claims",
      name: "claims-board",
      component: ClaimsBoard,
      meta: {
        title: "Claims Board",
        section: "Insurance Operations",
      },
    },
    {
      path: "/claims/:name",
      name: "claim-detail",
      component: ClaimDetail,
      props: true,
      meta: {
        title: "Claim Details",
        section: "Insurance Operations",
      },
    },
    {
      path: "/payments",
      name: "payments-board",
      component: PaymentsBoard,
      meta: {
        title: "Payment Operations",
        section: "Insurance Operations",
      },
    },
    {
      path: "/payments/:name",
      name: "payment-detail",
      component: PaymentDetail,
      props: true,
      meta: {
        title: "Payment Details",
        section: "Insurance Operations",
      },
    },
    {
      path: "/renewals",
      name: "renewals-board",
      component: RenewalsBoard,
      meta: {
        title: "Renewal Board",
        section: "Insurance Operations",
      },
    },
    {
      path: "/renewals/:name",
      name: "renewal-task-detail",
      component: RenewalTaskDetail,
      props: true,
      meta: {
        title: "Renewal Details",
        section: "Insurance Operations",
      },
    },
    {
      path: "/communication",
      name: "communication-center",
      component: CommunicationHub,
      meta: {
        title: "Communication Center",
        section: "Control Center",
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
        title: "Break-Glass Request",
        section: "Control Center",
      },
    },
    {
      path: "/break-glass/approvals",
      name: "break-glass-approvals",
      component: BreakGlassApprovals,
      meta: {
        title: "Break-Glass Approvals",
        section: "Control Center",
        requiresBreakGlassManager: true,
      },
    },
    {
      path: "/reconciliation",
      name: "reconciliation-workbench",
      component: ReconciliationWorkbench,
      meta: {
        title: "Reconciliation Workbench",
        section: "Control Center",
      },
    },
    {
      path: "/reconciliation/:name",
      name: "reconciliation-detail",
      component: ReconciliationDetail,
      props: true,
      meta: {
        title: "Reconciliation Details",
        section: "Control Center",
      },
    },
    {
      path: "/reports",
      name: "reports",
      component: Reports,
      meta: {
        title: "Reports",
        section: "Control Center",
      },
    },
    {
      path: "/reports/premium",
      name: "premium-report",
      component: PremiumReport,
      meta: {
        title: "Premium Report",
        section: "Control Center",
      },
    },
    {
      path: "/reports/claim-ratio",
      name: "claim-ratio-report",
      component: ClaimRatioReport,
      meta: {
        title: "Claim Ratio Report",
        section: "Control Center",
      },
    },
    {
      path: "/reports/agent-performance",
      name: "agent-performance-report",
      component: AgentPerformanceReport,
      meta: {
        title: "Agent Performance Report",
        section: "Control Center",
      },
    },
    {
      path: "/reports/customer-segmentation",
      name: "customer-segmentation-report",
      component: CustomerSegmentationReport,
      meta: {
        title: "Customer Segmentation Report",
        section: "Control Center",
      },
    },
    {
      path: "/data-import",
      name: "import-data",
      component: ImportData,
      meta: {
        title: "Data Import",
        section: "Control Center",
      },
    },
    {
      path: "/data-export",
      name: "export-data",
      component: ExportData,
      meta: {
        title: "Data Export",
        section: "Control Center",
      },
    },
    {
      path: "/customers/:name",
      name: "customer-detail",
      component: CustomerDetail,
      props: true,
      meta: {
        title: "Müşteri Detayı",
        section: "Müşteri",
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

router.beforeEach((to) => {
  if (to.meta?.requiresBreakGlassManager && !hasSystemManagerRole(sessionState.roles)) {
    return { name: "break-glass-request" };
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
