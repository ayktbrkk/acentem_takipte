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
const CommunicationCenter = () => import("../pages/CommunicationCenter.vue");
const ReconciliationWorkbench = () => import("../pages/ReconciliationWorkbench.vue");
const Reports = () => import("../pages/Reports.vue");
const AuxWorkbench = () => import("../pages/AuxWorkbench.vue");
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
        title: { tr: "Fırsat Detayı", en: "Lead Detail" },
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
        title: { tr: "Teklif Detayı", en: "Offer Detail" },
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
        title: { tr: "Poliçe Detayı", en: "Policy Detail" },
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
        title: { tr: "Hasar Masası", en: "Claims Desk" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
      },
    },
    {
      path: "/claims/:name",
      name: "claim-detail",
      component: ClaimDetail,
      props: true,
      meta: {
        title: { tr: "Hasar Detayı", en: "Claim Detail" },
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
        title: { tr: "Ödeme Detayı", en: "Payment Detail" },
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
        title: { tr: "Yenileme Detayı", en: "Renewal Detail" },
        section: { tr: "Sigorta Operasyonları", en: "Insurance Operations" },
      },
    },
    {
      path: "/communication",
      name: "communication-center",
      component: CommunicationCenter,
      meta: {
        title: { tr: "İletişim Merkezi", en: "Communication Center" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
      },
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
      path: "/reports",
      name: "reports",
      component: Reports,
      meta: {
        title: { tr: "Raporlar", en: "Reports" },
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
        title: { tr: "Müşteri Detayı", en: "Customer Detail" },
        section: { tr: "Müşteri", en: "Customer" },
      },
    },
    ...AUX_WORKBENCH_ROUTE_DEFS.flatMap((def) => [
      {
        path: def.listPath,
        name: def.listName,
        component: AuxWorkbench,
        props: { screenKey: def.key },
        meta: def.meta,
      },
      {
        path: def.detailPath,
        name: def.detailName,
        component: AuxRecordDetail,
        props: (route) => ({ screenKey: def.key, name: route.params.name }),
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
