import { computed, unref } from "vue";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useUiStore } from "../stores/ui";
import { translateText } from "@/utils/i18n";

export function useSidebarNavigation() {
  const authStore = useAuthStore();
  const branchStore = useBranchStore();
  const uiStore = useUiStore();

  const copy = {
    tr: {
      menu: "Menü",
      brand: "Acentem Takipte",
      title: "Sigorta CRM",
      miniTitle: "CRM",
      subtitle: "Fırsat, poliçe, hasar ve tahsilat operasyonları",
      sectionOverview: "Genel",
      sectionSalesPortfolio: "Satış & Portföy",
      sectionOperations: "Operasyonlar",
      sectionCommunication: "İletişim & Takip",
      sectionMaster: "Ana Veri",
      sectionFinance: "Finans & Kontrol",
      dashboard: "Pano",
      leads: "Fırsatlar",
      offers: "Teklifler",
      policies: "Poliçeler",
      customers: "Müşteriler",
      customerSearch: "Müşteri Ara",
      claims: "Hasarlar",
      payments: "Ödemeler",
      renewals: "Yenilemeler",
      reconciliation: "Mutabakat",
      communication: "İletişim Merkezi",
      reports: "Raporlar",
      breakGlassRequest: "Acil Erişim Talebi",
      breakGlassApprovals: "Acil Erişim Onayları",
      dataImport: "Veri İçe Aktarma",
      dataExport: "Veri Dışa Aktarma",
      tasks: "Görevler",
      notificationDrafts: "Bildirim Taslakları",
      notificationOutbox: "Gönderilen Bildirimler",
      companies: "Sigorta Şirketleri",
      branches: "Şubeler",
      salesEntities: "Satış Birimleri",
      templates: "Bildirim Şablonları",
      accountingEntries: "Muhasebe Kayıtları",
      reconciliationItems: "Mutabakat Kalemleri",
      collapseSidebar: "Kenar Çubuğunu Daralt",
      expandSidebar: "Kenar Çubuğunu Genişlet",
      collapseShort: "Daralt",
      expandShort: "Genişlet",
    },
    en: {
      menu: "Menu",
      brand: "Acentem Takipte",
      title: "Insurance CRM",
      miniTitle: "CRM",
      subtitle: "Lead, policy, claim, and collections operations",
      sectionOverview: "Overview",
      sectionSalesPortfolio: "Sales & Portfolio",
      sectionOperations: "Operations",
      sectionCommunication: "Communication & Follow-up",
      sectionMaster: "Master Data",
      sectionFinance: "Finance & Control",
      dashboard: "Dashboard",
      leads: "Leads",
      offers: "Offers",
      policies: "Policies",
      customers: "Customers",
      customerSearch: "Search Customers",
      claims: "Claims",
      payments: "Payments",
      renewals: "Renewals",
      reconciliation: "Reconciliation",
      communication: "Communication Center",
      reports: "Reports",
      breakGlassRequest: "Break-Glass Request",
      breakGlassApprovals: "Break-Glass Approvals",
      dataImport: "Data Import",
      dataExport: "Data Export",
      tasks: "Tasks",
      notificationDrafts: "Notification Drafts",
      notificationOutbox: "Sent Notifications",
      companies: "Insurance Companies",
      branches: "Branches",
      salesEntities: "Sales Entities",
      templates: "Notification Templates",
      accountingEntries: "Accounting Entries",
      reconciliationItems: "Reconciliation Items",
      collapseSidebar: "Collapse Sidebar",
      expandSidebar: "Expand Sidebar",
      collapseShort: "Collapse",
      expandShort: "Expand",
    },
  };

  function t(key) {
    const locale = authStore.locale || "en";
    return translateText(copy[locale]?.[key] || copy.en[key] || key, locale);
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
      items: [{ key: "dashboard", label: t("dashboard"), to: "/", short: "DB", badgeClass: "text-emerald-700" }],
    },
    {
      title: t("sectionSalesPortfolio"),
      items: [
        { key: "leads", label: t("leads"), to: "/leads", short: "LD", badgeClass: "text-fuchsia-700" },
        { key: "offers", label: t("offers"), to: "/offers", short: "OF", badgeClass: "text-teal-700" },
        { key: "policies", label: t("policies"), to: "/policies", short: "PL", badgeClass: "text-sky-700" },
        { key: "customers", label: t("customers"), to: "/customers", short: "CU", badgeClass: "text-cyan-700" },
        { key: "customer-search", label: t("customerSearch"), to: "/customer-search", short: "CS", badgeClass: "text-teal-700" },
      ],
    },
    {
      title: t("sectionOperations"),
      items: [
        { key: "claims", label: t("claims"), to: "/claims", short: "CL", badgeClass: "text-amber-700" },
        { key: "payments", label: t("payments"), to: "/payments", short: "PM", badgeClass: "text-indigo-700" },
        { key: "renewals", label: t("renewals"), to: "/renewals", short: "RN", badgeClass: "text-amber-700" },
        { key: "reconciliation", label: t("reconciliation"), to: "/reconciliation", short: "RC", badgeClass: "text-cyan-700" },
        { key: "reports", label: t("reports"), to: "/reports", short: "RP", badgeClass: "text-sky-700" },
        { key: "data-import", label: t("dataImport"), to: "/data-import", short: "IM", badgeClass: "text-emerald-700" },
        { key: "data-export", label: t("dataExport"), to: "/data-export", short: "EX", badgeClass: "text-indigo-700" },
      ],
    },
    {
      title: t("sectionCommunication"),
      items: [
        { key: "communication", label: t("communication"), to: "/communication", short: "CM", badgeClass: "text-violet-700" },
        { key: "tasks", label: t("tasks"), to: "/tasks", short: "TS", badgeClass: "text-slate-700" },
        { key: "notification-drafts", label: t("notificationDrafts"), to: "/notification-drafts", short: "ND", badgeClass: "text-blue-700" },
        { key: "notification-outbox", label: t("notificationOutbox"), to: "/notification-outbox", short: "NO", badgeClass: "text-green-700" },
      ],
    },
    {
      title: t("sectionMaster"),
      items: [
        { key: "companies", label: t("companies"), to: "/insurance-companies", short: "IC", badgeClass: "text-violet-700" },
        { key: "branches", label: t("branches"), to: "/branches", short: "BR", badgeClass: "text-orange-700" },
        { key: "sales-entities", label: t("salesEntities"), to: "/sales-entities", short: "SE", badgeClass: "text-lime-700" },
        { key: "templates", label: t("templates"), to: "/notification-templates", short: "NT", badgeClass: "text-pink-700" },
      ],
    },
    {
      title: t("sectionFinance"),
      items: [
        { key: "break-glass-request", label: t("breakGlassRequest"), to: "/break-glass", short: "BG", badgeClass: "text-rose-700" },
        ...(isSystemManager.value
          ? [{ key: "break-glass-approvals", label: t("breakGlassApprovals"), to: "/break-glass/approvals", short: "BA", badgeClass: "text-rose-700" }]
          : []),
        { key: "accounting-entries", label: t("accountingEntries"), to: "/accounting-entries", short: "AC", badgeClass: "text-slate-700" },
        { key: "reconciliation-items", label: t("reconciliationItems"), to: "/reconciliation-items", short: "RI", badgeClass: "text-cyan-700" },
      ],
    },
  ]);

  return {
    t,
    isCollapsed,
    userDisplayName,
    userInitials,
    branchLabel,
    navSections,
    toggleSidebarCollapsedDesktop,
    linkClass,
  };
}
