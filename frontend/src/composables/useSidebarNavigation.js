import { computed, shallowRef } from "vue";
import IconLucideLayoutDashboard from '~icons/lucide/layout-dashboard';
import IconLucideTarget from '~icons/lucide/target';
import IconLucideFileText from '~icons/lucide/file-text';
import IconLucideShield from '~icons/lucide/shield';
import IconLucideUsers from '~icons/lucide/users';
import IconLucideSearch from '~icons/lucide/search';
import IconLucideAlertTriangle from '~icons/lucide/alert-triangle';
import IconLucideCreditCard from '~icons/lucide/credit-card';
import IconLucideCalendarClock from '~icons/lucide/calendar-clock';
import IconLucideCheckSquare from '~icons/lucide/check-square';
import IconLucideFolderOpen from '~icons/lucide/folder-open';
import IconLucideBarChart2 from '~icons/lucide/bar-chart-2';
import IconLucideDownload from '~icons/lucide/download';
import IconLucideUpload from '~icons/lucide/upload';
import IconLucideMessageSquare from '~icons/lucide/message-square';
import IconLucideCheckCircle from '~icons/lucide/check-circle';
import IconLucideEdit3 from '~icons/lucide/edit-3';
import IconLucideSend from '~icons/lucide/send';
import IconLucideBuilding from '~icons/lucide/building';
import IconLucideMapPin from '~icons/lucide/map-pin';
import IconLucideBriefcase from '~icons/lucide/briefcase';
import IconLucideFileSignature from '~icons/lucide/file-signature';
import IconLucideKey from '~icons/lucide/key';
import IconLucideReceipt from '~icons/lucide/receipt';
import IconLucideListChecks from '~icons/lucide/list-checks';

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useUiStore } from "../stores/ui";
import { translateText } from "@/utils/i18n";

export function useSidebarNavigation() {
  const authStore = useAuthStore();
  const branchStore = useBranchStore();
  const uiStore = useUiStore();

  function t(key) {
    return translateText(key, authStore.locale);
  }

  function upper(value) {
    const text = value == null ? "" : String(value);
    if (!text) return text;
    const locale = String(authStore.locale || "en").toLowerCase();
    return locale.startsWith("tr") ? text.toLocaleUpperCase("tr-TR") : text.toUpperCase();
  }

  const isCollapsed = computed(() => uiStore.sidebarCollapsed);
  const userDisplayName = computed(() => String(authStore.user || authStore.userId || "-").trim() || "-");
  const userInitials = computed(() => {
    const parts = userDisplayName.value.split(/\s+/).filter(Boolean);
    if (!parts.length) return "AT";
    return parts.slice(0, 2).map((part) => String(part[0] || "")).join("").toUpperCase();
  });
  const branchLabel = computed(() => String(branchStore.requestBranch || authStore.defaultOfficeBranch || "-").trim() || "-");
  const isSystemManager = computed(() => Boolean(authStore.isDeskUser));

  function toggleSidebarCollapsedDesktop() {
    uiStore.toggleSidebarCollapsed();
  }

  function linkClass(item) {
    if (isCollapsed.value) {
      return "justify-center px-2";
    }
    if (item.indent) {
      return "pl-8 pr-3";
    }
    return "px-3";
  }

  const navSections = computed(() => [
    {
      title: t("sectionOverview"),
      items: [{ key: "dashboard", label: t("dashboard"), to: "/", short: "DB", icon: shallowRef(IconLucideLayoutDashboard), badgeClass: "text-emerald-700" }],
    },
    {
      title: t("sectionSalesPortfolio"),
      items: [
        { key: "leads", label: t("leads"), to: "/leads", short: "LD", icon: shallowRef(IconLucideTarget), badgeClass: "text-fuchsia-700" },
        { key: "offers", label: t("offers"), to: "/offers", short: "OF", icon: shallowRef(IconLucideFileText), badgeClass: "text-teal-700" },
        { key: "policies", label: t("policies"), to: "/policies", short: "PL", icon: shallowRef(IconLucideShield), badgeClass: "text-sky-700" },
        { key: "customers", label: t("customers"), to: "/customers", short: "CU", icon: shallowRef(IconLucideUsers), badgeClass: "text-cyan-700" },
        { key: "customer-search", label: t("customerSearch"), to: "/customer-search", short: "CS", icon: shallowRef(IconLucideSearch), badgeClass: "text-teal-700" },
      ],
    },
    {
      title: t("sectionOperations"),
      items: [
        { key: "claims", label: t("claims"), to: "/claims", short: "CL", icon: shallowRef(IconLucideAlertTriangle), badgeClass: "text-amber-700" },
        { key: "payments", label: t("payments"), to: "/payments", short: "PM", icon: shallowRef(IconLucideCreditCard), badgeClass: "text-indigo-700" },
        { key: "renewals", label: t("renewals"), to: "/renewals", short: "RN", icon: shallowRef(IconLucideCalendarClock), badgeClass: "text-amber-700" },
        { key: "reconciliation", label: t("reconciliation"), to: "/reconciliation", short: "RC", icon: shallowRef(IconLucideCheckSquare), badgeClass: "text-cyan-700" },
        { key: "at-documents", label: t("documentCenter"), to: "/at-documents", short: "DC", icon: shallowRef(IconLucideFolderOpen), badgeClass: "text-violet-700" },
        { key: "reports", label: t("reports"), to: "/reports", short: "RP", icon: shallowRef(IconLucideBarChart2), badgeClass: "text-sky-700" },
        { key: "data-import", label: t("dataImport"), to: "/data-import", short: "IM", icon: shallowRef(IconLucideDownload), badgeClass: "text-emerald-700" },
        { key: "data-export", label: t("dataExport"), to: "/data-export", short: "EX", icon: shallowRef(IconLucideUpload), badgeClass: "text-indigo-700" },
      ],
    },
    {
      title: t("sectionCommunication"),
      items: [
        { key: "communication", label: t("communication"), to: "/communication", short: "CM", icon: shallowRef(IconLucideMessageSquare), badgeClass: "text-violet-700" },
        { key: "tasks", label: t("tasks"), to: "/tasks", short: "TS", icon: shallowRef(IconLucideCheckCircle), badgeClass: "text-slate-700" },
        { key: "notification-drafts", label: t("notificationDrafts"), to: "/notification-drafts", short: "ND", icon: shallowRef(IconLucideEdit3), badgeClass: "text-blue-700" },
        { key: "notification-outbox", label: t("notificationOutbox"), to: "/notification-outbox", short: "NO", icon: shallowRef(IconLucideSend), badgeClass: "text-green-700" },
      ],
    },
    {
      title: t("sectionMaster"),
      items: [
        { key: "companies", label: t("companies"), to: "/insurance-companies", short: "IC", icon: shallowRef(IconLucideBuilding), badgeClass: "text-violet-700" },
        { key: "branches", label: t("branches"), to: "/branches", short: "BR", icon: shallowRef(IconLucideMapPin), badgeClass: "text-orange-700" },
        { key: "sales-entities", label: t("salesEntities"), to: "/sales-entities", short: "SE", icon: shallowRef(IconLucideBriefcase), badgeClass: "text-lime-700" },
        { key: "templates", label: t("templates"), to: "/notification-templates", short: "NT", icon: shallowRef(IconLucideFileSignature), badgeClass: "text-pink-700" },
      ],
    },
    {
      title: t("sectionFinance"),
      items: [
        { key: "break-glass-request", label: t("breakGlassRequest"), to: "/break-glass", short: "BG", icon: shallowRef(IconLucideKey), badgeClass: "text-rose-700" },
        ...(isSystemManager.value
          ? [{ key: "break-glass-approvals", label: t("breakGlassApprovals"), to: "/break-glass/approvals", short: "BA", icon: shallowRef(IconLucideKey), badgeClass: "text-rose-700" }]
          : []),
        { key: "accounting-entries", label: t("accountingEntries"), to: "/accounting-entries", short: "AC", icon: shallowRef(IconLucideReceipt), badgeClass: "text-slate-700" },
        { key: "reconciliation-items", label: t("reconciliationItems"), to: "/reconciliation-items", short: "RI", icon: shallowRef(IconLucideListChecks), badgeClass: "text-cyan-700" },
      ],
    },
  ]);

  return {
    t,
    upper,
    isCollapsed,
    userDisplayName,
    userInitials,
    branchLabel,
    navSections,
    toggleSidebarCollapsedDesktop,
    linkClass,
  };
}
