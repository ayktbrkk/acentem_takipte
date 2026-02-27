<template>
  <div>
    <button
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
      type="button"
      @click="$emit('close')"
    />
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-[min(20rem,92vw)] flex-col border-r border-slate-200/80 bg-white/95 transition-all duration-200 lg:static lg:z-0 lg:w-[17.5rem] lg:translate-x-0"
      :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', isCollapsed ? 'lg:w-24' : 'lg:w-[17.5rem]']"
    >
      <div class="px-4 pb-4 pt-5">
        <div class="mb-4 flex items-center justify-between lg:hidden">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{{ t("menu") }}</p>
          <button class="rounded-lg border border-slate-300 px-2 py-1 text-xs" type="button" @click="$emit('close')">
            X
          </button>
        </div>

        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <p
              class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
              :class="isCollapsed ? 'text-center tracking-[0.12em]' : ''"
            >
              {{ t("brand") }}
            </p>
            <template v-if="!isCollapsed">
              <h1 class="mt-2 text-xl font-semibold text-slate-900">{{ t("title") }}</h1>
              <p class="mt-1 text-sm text-slate-500">
                {{ t("subtitle") }}
              </p>
            </template>
            <template v-else>
              <p class="mt-2 text-center text-xs font-semibold text-slate-700">{{ t("miniTitle") }}</p>
            </template>
          </div>

          <button
            class="hidden h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 lg:grid"
            type="button"
            :title="isCollapsed ? t('expandSidebar') : t('collapseSidebar')"
            @click="toggleSidebarCollapsedDesktop"
          >
            {{ isCollapsed ? ">>" : "<<" }}
          </button>
        </div>

        <div v-if="!isCollapsed" class="mt-4">
          <p class="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {{ t("quickCreate") }}
          </p>
          <div class="grid grid-cols-2 gap-2">
            <a
              v-for="action in quickActions"
              :key="action.href"
              :href="action.href"
              class="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              @click="$emit('navigate')"
            >
              {{ action.label }}
            </a>
          </div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 pb-4">
        <div v-for="section in navSections" :key="section.title" class="mb-4">
          <p
            v-if="!isCollapsed"
            class="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
          >
            {{ section.title }}
          </p>
          <div v-else class="mx-2 mb-2 border-t border-slate-200/80" />

          <template v-for="item in section.items" :key="item.key">
            <a
              v-if="item.external"
              :href="item.to"
              :title="item.label"
              class="group mb-1 flex items-center gap-3 rounded-xl py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              :class="linkClass(item)"
              @click="$emit('navigate')"
            >
              <span
                class="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold"
                :class="item.badgeClass"
              >
                {{ item.short }}
              </span>
              <div v-if="!isCollapsed" class="min-w-0 flex-1">
                <p class="truncate font-medium" :class="item.indent ? 'text-xs text-slate-500' : ''">
                  {{ item.label }}
                </p>
              </div>
            </a>

            <RouterLink
              v-else
              :to="item.to"
              :title="item.label"
              class="group mb-1 flex items-center gap-3 rounded-xl py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              :class="linkClass(item)"
              active-class="bg-slate-900 text-white hover:bg-slate-900 hover:text-white"
              @click="$emit('navigate')"
            >
              <span
                class="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold"
                :class="item.badgeClass"
              >
                {{ item.short }}
              </span>
              <div v-if="!isCollapsed" class="min-w-0 flex-1">
                <p class="truncate font-medium" :class="item.indent ? 'text-xs text-slate-500' : ''">
                  {{ item.label }}
                </p>
              </div>
            </RouterLink>
          </template>
        </div>
      </nav>

      <footer class="border-t border-slate-200/80 p-4">
        <button
          class="hidden w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 lg:flex"
          type="button"
          :title="isCollapsed ? t('expandSidebar') : t('collapseSidebar')"
          @click="toggleSidebarCollapsedDesktop"
        >
          <span class="text-[11px]">{{ isCollapsed ? t("expandShort") : t("collapseShort") }}</span>
          <span v-if="!isCollapsed">{{ t("collapseSidebar") }}</span>
        </button>
      </footer>
    </aside>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { sessionState } from "../state/session";
import { toggleSidebarCollapsed, uiState } from "../state/ui";

defineProps({
  mobileOpen: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["close", "navigate"]);

const copy = {
  tr: {
    menu: "Menu",
    brand: "Acentem Takipte",
    title: "Sigorta CRM",
    miniTitle: "CRM",
    subtitle: "Lead, police, hasar ve tahsilat operasyonlari",
    scopeTitle: "Sprint Kapsami",
    scopeValue: "Iletisim -> Muhasebe -> Mutabakat",
    quickCreate: "Hizli Olustur",
    quickOffer: "Yeni Teklif",
    quickLead: "Yeni Lead",
    quickCustomer: "Yeni Musteri",
    quickClaim: "Yeni Hasar",
    sectionOverview: "Genel Gorunum",
    sectionSalesPortfolio: "Satis ve Portfoy",
    sectionOperations: "Operasyonlar",
    sectionCommunication: "Iletisim ve Takip",
    sectionMaster: "Ana Veriler",
    sectionFinance: "Finans ve Kontrol",
    dashboard: "Pano",
    operationsDashboard: "Operasyon Panosu",
    salesDashboard: "Satis Panosu",
    collectionsDashboard: "Tahsilat Panosu",
    renewalsDashboard: "Yenileme Panosu",
    leads: "Leadler",
    offers: "Teklifler",
    policies: "Policeler",
    customers: "Musteriler",
    claims: "Hasarlar",
    payments: "Odemeler",
    renewals: "Yenilemeler",
    reconciliation: "Mutabakat",
    communication: "Iletisim Merkezi",
    tasks: "Gorevler",
    notificationDrafts: "Bildirim Taslaklari",
    notificationOutbox: "Giden Bildirimler",
    companies: "Sigorta Sirketleri",
    branches: "Branslar",
    salesEntities: "Satis Birimleri",
    templates: "Bildirim Sablonlari",
    accountingEntries: "Muhasebe Kayitlari",
    reconciliationItems: "Mutabakat Kalemleri",
    collapseSidebar: "Kenar Menusunu Daralt",
    expandSidebar: "Kenar Menusunu Genislet",
    collapseShort: "Daralt",
    expandShort: "Genislet",
  },
  en: {
    menu: "Menu",
    brand: "Acentem Takipte",
    title: "Insurance CRM",
    miniTitle: "CRM",
    subtitle: "Lead, policy, claim and collection operations",
    scopeTitle: "Sprint Scope",
    scopeValue: "Communication -> Accounting -> Reconciliation",
    quickCreate: "Quick Create",
    quickOffer: "New Offer",
    quickLead: "New Lead",
    quickCustomer: "New Customer",
    quickClaim: "New Claim",
    sectionOverview: "Overview",
    sectionSalesPortfolio: "Sales & Portfolio",
    sectionOperations: "Operations",
    sectionCommunication: "Communication & Follow-up",
    sectionMaster: "Master Data",
    sectionFinance: "Finance & Control",
    dashboard: "Dashboard",
    operationsDashboard: "Operations Dashboard",
    salesDashboard: "Sales Dashboard",
    collectionsDashboard: "Collections Dashboard",
    renewalsDashboard: "Renewals Dashboard",
    leads: "Leads",
    offers: "Offers",
    policies: "Policies",
    customers: "Customers",
    claims: "Claims",
    payments: "Payments",
    renewals: "Renewals",
    reconciliation: "Reconciliation",
    communication: "Communication Center",
    tasks: "Tasks",
    notificationDrafts: "Notification Drafts",
    notificationOutbox: "Notification Outbox",
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
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

const isCollapsed = computed(() => uiState.sidebarCollapsed);

function toggleSidebarCollapsedDesktop() {
  toggleSidebarCollapsed();
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

const quickActions = computed(() => [
  { label: t("quickOffer"), href: "/at/offers?quick_create=1" },
  { label: t("quickLead"), href: "/at/leads?quick_create=1" },
  { label: t("quickCustomer"), href: "/at/customers?quick_create=1" },
  { label: t("quickClaim"), href: "/at/claims" },
]);

const navSections = computed(() => [
  {
    title: t("sectionOverview"),
    items: [
      { key: "dashboard", label: t("dashboard"), to: "/", short: "DB", badgeClass: "text-emerald-700" },
    ],
  },
  {
    title: t("sectionSalesPortfolio"),
    items: [
      { key: "leads", label: t("leads"), to: "/leads", short: "LD", badgeClass: "text-fuchsia-700" },
      { key: "offers", label: t("offers"), to: "/offers", short: "OF", badgeClass: "text-teal-700" },
      { key: "policies", label: t("policies"), to: "/policies", short: "PL", badgeClass: "text-sky-700" },
      { key: "customers", label: t("customers"), to: "/customers", short: "CU", badgeClass: "text-cyan-700" },
    ],
  },
  {
    title: t("sectionOperations"),
    items: [
      { key: "claims", label: t("claims"), to: "/claims", short: "CL", badgeClass: "text-amber-700" },
      { key: "payments", label: t("payments"), to: "/payments", short: "PM", badgeClass: "text-indigo-700" },
      { key: "renewals", label: t("renewals"), to: "/renewals", short: "RN", badgeClass: "text-rose-700" },
      { key: "reconciliation", label: t("reconciliation"), to: "/reconciliation", short: "RC", badgeClass: "text-cyan-700" },
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
      { key: "accounting-entries", label: t("accountingEntries"), to: "/accounting-entries", short: "AC", badgeClass: "text-slate-700" },
      { key: "reconciliation-items", label: t("reconciliationItems"), to: "/reconciliation-items", short: "RI", badgeClass: "text-cyan-700" },
    ],
  },
]);
</script>
