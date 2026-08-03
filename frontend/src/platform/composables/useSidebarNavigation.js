import { computed } from "vue";
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
import IconLucideReceipt from '~icons/lucide/receipt';
import IconLucideListChecks from '~icons/lucide/list-checks';
import IconLucideScrollText from '~icons/lucide/scroll-text';
import IconLucideBell from '~icons/lucide/bell';
import IconLucideActivity from '~icons/lucide/activity';
import IconLucideUserCheck from '~icons/lucide/user-check';
import IconLucidePhone from '~icons/lucide/phone';
import IconLucideLayers from '~icons/lucide/layers';
import IconLucideMegaphone from '~icons/lucide/megaphone';
import IconLucideShare2 from '~icons/lucide/share-2';
import IconLucidePackage from '~icons/lucide/package';
import IconLucidePieChart from '~icons/lucide/pie-chart';
import IconLucidePaperclip from '~icons/lucide/paperclip';
import IconLucidePercent from '~icons/lucide/percent';

import { useAuthStore } from "../state/authStore";
import { useBranchStore } from "../state/branchStore";
import { useUiStore } from "../state/uiStore";
import { SIDEBAR_TRANSLATIONS } from "../i18n/sidebar";
import { translateText } from "@/platform/i18n";

export function useSidebarNavigation() {
  const authStore = useAuthStore();
  const branchStore = useBranchStore();
  const uiStore = useUiStore();

  function t(key) {
    const locale = String(authStore.locale || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
    return SIDEBAR_TRANSLATIONS[locale]?.[key] || SIDEBAR_TRANSLATIONS.en?.[key] || translateText(key, authStore.locale);
  }

  function upper(value) {
    const text = value == null ? "" : String(value);
    if (!text) return text;
    const locale = String(authStore.locale || "en").toLowerCase();
    return locale.startsWith("tr") ? text.toLocaleUpperCase("tr-TR") : text.toUpperCase();
  }

  const isCollapsed = computed(() => uiStore.sidebarCollapsed);
  const collapseMenuLabel = computed(() => t("collapseMenu"));
  const expandMenuLabel = computed(() => t("expandMenu"));
  const userDisplayName = computed(() => String(authStore.user || authStore.userId || "-").trim() || "-");
  const userInitials = computed(() => {
    const parts = userDisplayName.value.split(/\s+/).filter(Boolean);
    if (!parts.length) return "AT";
    const raw = parts.slice(0, 2).map((part) => String(part[0] || "")).join("");
    const locale = String(authStore.locale || "en").toLowerCase();
    return locale.startsWith("tr") ? raw.toLocaleUpperCase("tr-TR") : raw.toUpperCase();
  });
  const branchLabel = computed(() => String(branchStore.requestBranch || authStore.defaultOfficeBranch || "-").trim() || "-");

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

  const ROLE_SYSTEM = ["AT System Manager", "System Manager", "Administrator"];
  const ROLE_MANAGER = [...ROLE_SYSTEM, "AT Manager"];
  const ROLE_AGENT = [...ROLE_MANAGER, "AT Agent"];
  const ROLE_ACCOUNTANT = [...ROLE_AGENT, "AT Accountant"];

  function visibleWithRoles(allowedRoles = ROLE_SYSTEM) {
    return authStore.hasAnyRole(...allowedRoles);
  }

  const navSections = computed(() => [
    ...(visibleWithRoles(ROLE_MANAGER)
      ? [{
        title: t("sectionOverview"),
        items: filterByRoles([
          { key: "dashboard", label: t("dashboard"), to: "/dashboard", short: "DB", icon: IconLucideLayoutDashboard, badgeClass: "text-brand-700", roles: ROLE_MANAGER },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_ACCOUNTANT)
      ? [{
        title: t("sectionSalesPortfolio"),
        items: filterByRoles([
          { key: "leads", label: t("leads"), to: "/leads", short: "LD", icon: IconLucideTarget, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "offers", label: t("offers"), to: "/offers", short: "OF", icon: IconLucideFileText, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "policies", label: t("policies"), to: "/policies", short: "PL", icon: IconLucideShield, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "customers", label: t("customers"), to: "/customers", short: "CU", icon: IconLucideUsers, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "customer-relations", label: t("customerRelations"), to: "/customer-relations", short: "CR", icon: IconLucideShare2, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "insured-assets", label: t("insuredAssets"), to: "/insured-assets", short: "IA", icon: IconLucidePackage, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "customer-segment-snapshots", label: t("customerSegmentSnapshots"), to: "/customer-segment-snapshots", short: "SS", icon: IconLucidePieChart, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "customer-search", label: t("customerSearch"), to: "/customer-search", short: "CS", icon: IconLucideSearch, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_ACCOUNTANT)
      ? [{
        title: t("sectionOperations"),
        items: filterByRoles([
          { key: "claims", label: t("claims"), to: "/claims", short: "CL", icon: IconLucideAlertTriangle, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "payments", label: t("payments"), to: "/payments", short: "PM", icon: IconLucideCreditCard, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "renewals", label: t("renewals"), to: "/renewals", short: "RN", icon: IconLucideCalendarClock, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "commissions", label: t("commissions"), to: "/commissions", short: "CM", icon: IconLucidePercent, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "reconciliation", label: t("reconciliation"), to: "/reconciliation", short: "RC", icon: IconLucideCheckSquare, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
          { key: "at-documents", label: t("documentCenter"), to: "/at-documents", short: "DC", icon: IconLucideFolderOpen, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "files", label: t("files"), to: "/files", short: "FL", icon: IconLucidePaperclip, badgeClass: "text-slate-700", roles: ROLE_ACCOUNTANT },
          { key: "reports", label: t("reports"), to: "/reports", short: "RP", icon: IconLucideBarChart2, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "data-import", label: t("dataImport"), to: "/data-import", short: "IM", icon: IconLucideDownload, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
          { key: "data-export", label: t("dataExport"), to: "/data-export", short: "EX", icon: IconLucideUpload, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_ACCOUNTANT)
      ? [{
        title: t("sectionCommunication"),
        items: filterByRoles([
          { key: "communication", label: t("communication"), to: "/communication", short: "CM", icon: IconLucideMessageSquare, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "call-notes", label: t("callNotes"), to: "/call-notes", short: "CN", icon: IconLucidePhone, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "segments", label: t("segments"), to: "/segments", short: "SG", icon: IconLucideLayers, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "campaigns", label: t("campaigns"), to: "/campaigns", short: "CP", icon: IconLucideMegaphone, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "tasks", label: t("tasks"), to: "/tasks", short: "TS", icon: IconLucideCheckCircle, badgeClass: "text-slate-700", roles: ROLE_ACCOUNTANT },
          { key: "reminders", label: t("reminders"), to: "/reminders", short: "RM", icon: IconLucideBell, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "activities", label: t("activities"), to: "/activities", short: "AC", icon: IconLucideActivity, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "ownership-assignments", label: t("ownershipAssignments"), to: "/ownership-assignments", short: "OA", icon: IconLucideUserCheck, badgeClass: "text-brand-700", roles: ROLE_ACCOUNTANT },
          { key: "notification-drafts", label: t("notificationDrafts"), to: "/notification-drafts", short: "ND", icon: IconLucideEdit3, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
          { key: "notification-outbox", label: t("notificationOutbox"), to: "/notification-outbox", short: "NO", icon: IconLucideSend, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_SYSTEM)
      ? [{
        title: t("sectionMaster"),
        items: filterByRoles([
          { key: "companies", label: t("companies"), to: "/insurance-companies", short: "IC", icon: IconLucideBuilding, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
          { key: "branches", label: t("branches"), to: "/branches", short: "BR", icon: IconLucideMapPin, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
          { key: "office-branches", label: t("officeBranches"), to: "/office-branches", short: "OB", icon: IconLucideMapPin, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
          { key: "sales-entities", label: t("salesEntities"), to: "/sales-entities", short: "SE", icon: IconLucideBriefcase, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
          { key: "templates", label: t("templates"), to: "/notification-templates", short: "NT", icon: IconLucideFileSignature, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_SYSTEM)
      ? [{
        title: t("sectionFinance"),
        items: filterByRoles([
          { key: "accounting-entries", label: t("accountingEntries"), to: "/accounting-entries", short: "AC", icon: IconLucideReceipt, badgeClass: "text-slate-700", roles: ROLE_SYSTEM },
          { key: "reconciliation-items", label: t("reconciliationItems"), to: "/reconciliation-items", short: "RI", icon: IconLucideListChecks, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
          { key: "access-logs", label: t("accessLogs"), to: "/access-logs", short: "LG", icon: IconLucideScrollText, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_SYSTEM)
      ? [{
        title: t("sectionAdminSettings"),
        items: filterByRoles([
          { key: "general-settings", label: t("generalSettings"), to: "/admin/general-settings", short: "GS", icon: IconLucideBriefcase, badgeClass: "text-slate-700", roles: ROLE_SYSTEM },
          { key: "alert-channels", label: t("alertChannelsSettings"), to: "/admin/alert-channels", short: "AL", icon: IconLucideMessageSquare, badgeClass: "text-brand-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
  ]);

  function filterByRoles(items) {
    return items.filter((item) => authStore.hasAnyRole(...item.roles));
  }

  return {
    t,
    upper,
    isCollapsed,
    collapseMenuLabel,
    expandMenuLabel,
    userDisplayName,
    userInitials,
    branchLabel,
    navSections,
    toggleSidebarCollapsedDesktop,
    linkClass,
  };
}
