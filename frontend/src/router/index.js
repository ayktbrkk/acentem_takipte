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
const PaymentsBoard = () => import("../pages/PaymentsBoard.vue");
const RenewalsBoard = () => import("../pages/RenewalsBoard.vue");
const CommunicationCenter = () => import("../pages/CommunicationCenter.vue");
const ReconciliationWorkbench = () =>
  import("../pages/ReconciliationWorkbench.vue");
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
        section: { tr: "Genel Bakis", en: "Overview" },
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
        title: { tr: "Lead Yonetimi", en: "Lead Workbench" },
        section: { tr: "Satis ve Portfoy", en: "Sales & Portfolio" },
      },
    },
    {
      path: "/leads/:name",
      name: "lead-detail",
      component: LeadDetail,
      props: true,
      meta: {
        title: { tr: "Lead Detay", en: "Lead Detail" },
        section: { tr: "Satis ve Portfoy", en: "Sales & Portfolio" },
      },
    },
    {
      path: "/offers",
      name: "offer-board",
      component: OfferBoard,
      meta: {
        title: { tr: "Teklif Panosu", en: "Offer Board" },
        section: { tr: "Sigorta Operasyonlari", en: "Insurance Ops" },
      },
    },
    {
      path: "/offers/:name",
      name: "offer-detail",
      component: OfferDetail,
      props: true,
      meta: {
        title: { tr: "Teklif Detay", en: "Offer Detail" },
        section: { tr: "Sigorta Operasyonlari", en: "Insurance Ops" },
      },
    },
    {
      path: "/policies",
      name: "policy-list",
      component: PolicyList,
      meta: {
        title: { tr: "Police Yonetimi", en: "Policy Management" },
        section: { tr: "Sigorta Operasyonlari", en: "Insurance Ops" },
      },
    },
    {
      path: "/policies/:name",
      name: "policy-detail",
      component: PolicyDetail,
      props: true,
      meta: {
        title: { tr: "Police Detay", en: "Policy Detail" },
        section: { tr: "Sigorta Operasyonlari", en: "Insurance Ops" },
      },
    },
    {
      path: "/customers",
      name: "customer-list",
      component: CustomerList,
      meta: {
        title: { tr: "Musteri Yonetimi", en: "Customer Workbench" },
        section: { tr: "Satis ve Portfoy", en: "Sales & Portfolio" },
      },
    },
    {
      path: "/claims",
      name: "claims-board",
      component: ClaimsBoard,
      meta: {
        title: { tr: "Hasar Masasi", en: "Claim Desk" },
        section: { tr: "Sigorta Operasyonlari", en: "Insurance Ops" },
      },
    },
    {
      path: "/payments",
      name: "payments-board",
      component: PaymentsBoard,
      meta: {
        title: { tr: "Odeme Operasyonlari", en: "Payment Operations" },
        section: { tr: "Sigorta Operasyonlari", en: "Insurance Ops" },
      },
    },
    {
      path: "/renewals",
      name: "renewals-board",
      component: RenewalsBoard,
      meta: {
        title: { tr: "Yenileme Panosu", en: "Renewal Board" },
        section: { tr: "Sigorta Operasyonlari", en: "Insurance Ops" },
      },
    },
    {
      path: "/communication",
      name: "communication-center",
      component: CommunicationCenter,
      meta: {
        title: { tr: "Iletisim Merkezi", en: "Communication Center" },
        section: { tr: "Kontrol Merkezi", en: "Control Center" },
      },
    },
    {
      path: "/reconciliation",
      name: "reconciliation-workbench",
      component: ReconciliationWorkbench,
      meta: {
        title: { tr: "Mutabakat Masasi", en: "Reconciliation Workbench" },
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
      path: "/customers/:name",
      name: "customer-detail",
      component: CustomerDetail,
      props: true,
      meta: {
        title: { tr: "Musteri Detay", en: "Customer Detail" },
        section: { tr: "Musteri", en: "Customer" },
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
