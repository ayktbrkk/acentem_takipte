import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("../app-shell/EmptyState.vue", () => ({ default: { template: `<div class="empty-state-stub">empty</div>` } }));
vi.mock("../app-shell/EntityPreviewCard.vue", () => ({ default: { props: ["title"], template: `<div>{{ title }}<slot name="caption" /><slot /><slot name="footer" /><slot name="trailing" /><slot name="date" /></div>` } }));
vi.mock("../app-shell/MetaListCard.vue", () => ({ default: { props: ["title", "description", "meta"], template: `<div>{{ title }}{{ description }}{{ meta }}<slot name="caption" /><slot /><slot name="trailing" /><slot name="date" /></div>` } }));
vi.mock("../app-shell/PreviewPager.vue", () => ({ default: { template: `<div class="preview-pager-stub"></div>` } }));
vi.mock("../app-shell/ProgressMetricRow.vue", () => ({ default: { template: `<div class="progress-row-stub"></div>` } }));
vi.mock("../app-shell/SaaSMetricCard.vue", () => ({ default: { props: ["label", "value"], template: `<div>{{ label }} {{ value }}</div>` } }));
vi.mock("../app-shell/SectionPanel.vue", () => ({ default: { props: ["title", "count"], template: `<section><h3>{{ title }}</h3><span>{{ count }}</span><slot /></section>` } }));
vi.mock("../ui/StatusBadge.vue", () => ({ default: { template: `<div class="status-badge-stub"></div>` } }));

import DashboardCollectionsTab from "./DashboardCollectionsTab.vue";

function t(key) {
  const translations = {
    todayCollectionsTitle: "Bugün Vadesi Gelen Tahsilatlar",
    overdueCollectionsTitle: "Gecikmiş Tahsilatlar",
    reconciliationPreview: "Açık Mutabakat Farkları",
    openDifference: "Toplam Fark",
    noTodayCollections: "empty",
    noOverdueCollections: "empty",
    noCollectionsRisk: "empty",
    noReconciliationPreview: "empty",
    noCollectionPerformance: "empty",
    collectionsPerformanceTitle: "Tahsilat Performansı",
    collectionsRiskTitle: "Riskli Müşteriler / Poliçeler",
    paymentStatusBreakdownTitle: "Duruma Göre Ödemeler",
    paymentDirectionBreakdownTitle: "Yöne Göre Ödemeler",
    paymentPaidAmount: "Ödenen Tutar",
    collectionsRiskHint: "hint",
    viewAllItems: "Tümünü Gör",
    followUpDeltaDays: "gün",
    dashboardBadgeReconciliation: "Mutabakat",
    reconciliationSourcePolicy: "Poliçe",
    reconciliationSourceClaim: "Hasar",
    reconciliationSourceCustomer: "Müşteri",
    reconciliationMismatchAmount: "Tutar",
    reconciliationMismatchStatus: "Durum",
  };
  return translations[key] || key;
}

describe("DashboardCollectionsTab", () => {
  it("localizes reconciliation preview labels", () => {
    const wrapper = mount(DashboardCollectionsTab, {
      props: {
        collectionPaymentDirectionSummary: [],
        collectionPaymentStatusSummary: [],
        collectionRiskFacts: () => [],
        collectionRiskRows: [],
        dashboardLoading: false,
        dashboardPaymentFacts: () => [],
        dashboardReconciliationFacts: () => [],
        dueTodayCollectionPayments: [],
        formatCurrency: (value) => `₺${value}`,
        formatNumber: (value) => String(value),
        isCollectionsTab: true,
        locale: "tr",
        openCollectionRiskItem: () => {},
        openPaymentItem: () => {},
        openPreviewList: () => {},
        openReconciliationItem: () => {},
        overdueCollectionPayments: [],
        pagedPreviewItems: (items) => items,
        previewPageCount: () => 1,
        previewResolvedPage: () => 1,
        reconciliationPreviewMetrics: {},
        reconciliationPreviewOpenDifference: 0,
        reconciliationPreviewRows: [
          {
            name: "AT-REC-2026-00007",
            source_doctype: "AT Claim",
            source_name: "AT-CLM-2026-00003",
            mismatch_type: "Status",
            status: "Open",
          },
        ],
        setPreviewPage: () => {},
        shouldShowViewAll: () => false,
        t,
      },
    });

    expect(wrapper.text()).toContain("Mutabakat");
    expect(wrapper.text()).toContain("Hasar");
    expect(wrapper.text()).toContain("Durum");
    expect(wrapper.text()).not.toContain("AT Claim");
    expect(wrapper.text()).not.toContain("Status");
  });
});
