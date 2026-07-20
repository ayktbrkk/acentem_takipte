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

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useUiStore } from "../stores/ui";
import { SIDEBAR_TRANSLATIONS } from "../config/sidebar_translations";
import { translateText } from "@/utils/i18n";

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
          { key: "dashboard", label: t("dashboard"), to: "/dashboard", short: "DB", icon: shallowRef(IconLucideLayoutDashboard), badgeClass: "text-emerald-700", roles: ROLE_MANAGER },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_ACCOUNTANT)
      ? [{
        title: t("sectionSalesPortfolio"),
        items: filterByRoles([
          { key: "leads", label: t("leads"), to: "/leads", short: "LD", icon: shallowRef(IconLucideTarget), badgeClass: "text-fuchsia-700", roles: ROLE_ACCOUNTANT },
          { key: "offers", label: t("offers"), to: "/offers", short: "OF", icon: shallowRef(IconLucideFileText), badgeClass: "text-teal-700", roles: ROLE_ACCOUNTANT },
          { key: "policies", label: t("policies"), to: "/policies", short: "PL", icon: shallowRef(IconLucideShield), badgeClass: "text-sky-700", roles: ROLE_ACCOUNTANT },
          { key: "customers", label: t("customers"), to: "/customers", short: "CU", icon: shallowRef(IconLucideUsers), badgeClass: "text-cyan-700", roles: ROLE_ACCOUNTANT },
          { key: "customer-relations", label: t("customerRelations"), to: "/customer-relations", short: "CR", icon: shallowRef(IconLucideShare2), badgeClass: "text-blue-700", roles: ROLE_ACCOUNTANT },
          { key: "insured-assets", label: t("insuredAssets"), to: "/insured-assets", short: "IA", icon: shallowRef(IconLucidePackage), badgeClass: "text-emerald-700", roles: ROLE_ACCOUNTANT },
          { key: "customer-segment-snapshots", label: t("customerSegmentSnapshots"), to: "/customer-segment-snapshots", short: "SS", icon: shallowRef(IconLucidePieChart), badgeClass: "text-indigo-700", roles: ROLE_ACCOUNTANT },
          { key: "customer-search", label: t("customerSearch"), to: "/customer-search", short: "CS", icon: shallowRef(IconLucideSearch), badgeClass: "text-teal-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_ACCOUNTANT)
      ? [{
        title: t("sectionOperations"),
        items: filterByRoles([
          { key: "claims", label: t("claims"), to: "/claims", short: "CL", icon: shallowRef(IconLucideAlertTriangle), badgeClass: "text-amber-700", roles: ROLE_ACCOUNTANT },
          { key: "payments", label: t("payments"), to: "/payments", short: "PM", icon: shallowRef(IconLucideCreditCard), badgeClass: "text-indigo-700", roles: ROLE_ACCOUNTANT },
          { key: "renewals", label: t("renewals"), to: "/renewals", short: "RN", icon: shallowRef(IconLucideCalendarClock), badgeClass: "text-amber-700", roles: ROLE_ACCOUNTANT },
          { key: "reconciliation", label: t("reconciliation"), to: "/reconciliation", short: "RC", icon: shallowRef(IconLucideCheckSquare), badgeClass: "text-cyan-700", roles: ROLE_SYSTEM },
          { key: "at-documents", label: t("documentCenter"), to: "/at-documents", short: "DC", icon: shallowRef(IconLucideFolderOpen), badgeClass: "text-violet-700", roles: ROLE_ACCOUNTANT },
          { key: "files", label: t("files"), to: "/files", short: "FL", icon: shallowRef(IconLucidePaperclip), badgeClass: "text-slate-700", roles: ROLE_ACCOUNTANT },
          { key: "reports", label: t("reports"), to: "/reports", short: "RP", icon: shallowRef(IconLucideBarChart2), badgeClass: "text-sky-700", roles: ROLE_ACCOUNTANT },
          { key: "data-import", label: t("dataImport"), to: "/data-import", short: "IM", icon: shallowRef(IconLucideDownload), badgeClass: "text-emerald-700", roles: ROLE_SYSTEM },
          { key: "data-export", label: t("dataExport"), to: "/data-export", short: "EX", icon: shallowRef(IconLucideUpload), badgeClass: "text-indigo-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_ACCOUNTANT)
      ? [{
        title: t("sectionCommunication"),
        items: filterByRoles([
          { key: "communication", label: t("communication"), to: "/communication", short: "CM", icon: shallowRef(IconLucideMessageSquare), badgeClass: "text-violet-700", roles: ROLE_ACCOUNTANT },
          { key: "call-notes", label: t("callNotes"), to: "/call-notes", short: "CN", icon: shallowRef(IconLucidePhone), badgeClass: "text-blue-700", roles: ROLE_ACCOUNTANT },
          { key: "segments", label: t("segments"), to: "/segments", short: "SG", icon: shallowRef(IconLucideLayers), badgeClass: "text-indigo-700", roles: ROLE_ACCOUNTANT },
          { key: "campaigns", label: t("campaigns"), to: "/campaigns", short: "CP", icon: shallowRef(IconLucideMegaphone), badgeClass: "text-fuchsia-700", roles: ROLE_ACCOUNTANT },
          { key: "tasks", label: t("tasks"), to: "/tasks", short: "TS", icon: shallowRef(IconLucideCheckCircle), badgeClass: "text-slate-700", roles: ROLE_ACCOUNTANT },
          { key: "reminders", label: t("reminders"), to: "/reminders", short: "RM", icon: shallowRef(IconLucideBell), badgeClass: "text-amber-700", roles: ROLE_ACCOUNTANT },
          { key: "activities", label: t("activities"), to: "/activities", short: "AC", icon: shallowRef(IconLucideActivity), badgeClass: "text-teal-700", roles: ROLE_ACCOUNTANT },
          { key: "ownership-assignments", label: t("ownershipAssignments"), to: "/ownership-assignments", short: "OA", icon: shallowRef(IconLucideUserCheck), badgeClass: "text-violet-700", roles: ROLE_ACCOUNTANT },
          { key: "notification-drafts", label: t("notificationDrafts"), to: "/notification-drafts", short: "ND", icon: shallowRef(IconLucideEdit3), badgeClass: "text-blue-700", roles: ROLE_SYSTEM },
          { key: "notification-outbox", label: t("notificationOutbox"), to: "/notification-outbox", short: "NO", icon: shallowRef(IconLucideSend), badgeClass: "text-green-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_SYSTEM)
      ? [{
        title: t("sectionMaster"),
        items: filterByRoles([
          { key: "companies", label: t("companies"), to: "/insurance-companies", short: "IC", icon: shallowRef(IconLucideBuilding), badgeClass: "text-violet-700", roles: ROLE_SYSTEM },
          { key: "branches", label: t("branches"), to: "/branches", short: "BR", icon: shallowRef(IconLucideMapPin), badgeClass: "text-orange-700", roles: ROLE_SYSTEM },
          { key: "sales-entities", label: t("salesEntities"), to: "/sales-entities", short: "SE", icon: shallowRef(IconLucideBriefcase), badgeClass: "text-lime-700", roles: ROLE_SYSTEM },
          { key: "templates", label: t("templates"), to: "/notification-templates", short: "NT", icon: shallowRef(IconLucideFileSignature), badgeClass: "text-pink-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_SYSTEM)
      ? [{
        title: t("sectionFinance"),
        items: filterByRoles([
          { key: "accounting-entries", label: t("accountingEntries"), to: "/accounting-entries", short: "AC", icon: shallowRef(IconLucideReceipt), badgeClass: "text-slate-700", roles: ROLE_SYSTEM },
          { key: "reconciliation-items", label: t("reconciliationItems"), to: "/reconciliation-items", short: "RI", icon: shallowRef(IconLucideListChecks), badgeClass: "text-cyan-700", roles: ROLE_SYSTEM },
          { key: "access-logs", label: t("accessLogs"), to: "/access-logs", short: "LG", icon: shallowRef(IconLucideScrollText), badgeClass: "text-indigo-700", roles: ROLE_SYSTEM },
        ]),
      }]
      : []),
    ...(visibleWithRoles(ROLE_SYSTEM)
      ? [{
        title: t("sectionAdminSettings"),
        items: filterByRoles([
          { key: "general-settings", label: t("generalSettings"), to: "/admin/general-settings", short: "GS", icon: shallowRef(IconLucideBriefcase), badgeClass: "text-slate-700", roles: ROLE_SYSTEM },
          { key: "alert-channels", label: t("alertChannelsSettings"), to: "/admin/alert-channels", short: "AL", icon: shallowRef(IconLucideMessageSquare), badgeClass: "text-sky-700", roles: ROLE_SYSTEM },
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
    userDisplayName,
    userInitials,
    branchLabel,
    navSections,
    toggleSidebarCollapsedDesktop,
    linkClass,
  };
}
