import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("../app-shell/EmptyState.vue", () => ({ default: { template: `<div class="empty-state-stub">empty</div>` } }));
vi.mock("../app-shell/EntityPreviewCard.vue", () => ({ default: { template: `<div><slot /><slot name="trailing" /></div>` } }));
vi.mock("../app-shell/MetaListCard.vue", () => ({ default: { template: `<div><slot /><slot name="trailing" /></div>` } }));
vi.mock("../app-shell/MiniFactList.vue", () => ({ default: { template: `<div class="mini-fact-list-stub"></div>` } }));
vi.mock("../app-shell/PreviewPager.vue", () => ({ default: { template: `<div class="preview-pager-stub"></div>` } }));
vi.mock("../app-shell/SaaSMetricCard.vue", () => ({ default: { props: ["label", "value"], template: `<div>{{ label }} {{ value }}</div>` } }));
vi.mock("../app-shell/SectionPanel.vue", () => ({ default: { props: ["title", "count"], template: `<section><h3>{{ title }}</h3><span>{{ count }}</span><slot /></section>` } }));
vi.mock("../ui/StatusBadge.vue", () => ({ default: { template: `<div class="status-badge-stub"></div>` } }));
vi.mock("./DashboardQuickActions.vue", () => ({ default: { template: `<div class="dashboard-quick-actions-stub"></div>` } }));

import DashboardDailyTab from "./DashboardDailyTab.vue";

function t(key) {
  const translations = {
    followUpSlaTitle: "Öncelikli Takipler",
    followUpSlaHint: "Geciken, bugün yapılması gereken ve yaklaşan takip kayıtlarını tek listede izleyin.",
    followUpSettingsLead: "Aktif ayar:",
    followUpWindowInfoLabel: "Yaklaşan pencere",
    followUpPreviewInfoLabel: "Önizleme",
    followUpDaysUnit: "gün",
    followUpRecordsUnit: "kayıt",
    followUpOverdue: "Geciken",
    followUpToday: "Bugün",
    followUpSoon: "Yaklaşan",
    renewalAlertTitle: "Yenileme Uyarıları",
    renewalAlertHint: "hint",
    todayTasksTitle: "Bugünün Görevleri",
    myTasksHint: "hint",
    recentActivitiesTitle: "Son Aktiviteler",
    openClaimsTitle: "Açık Hasarlar",
    recentPolicies: "Son Poliçeler",
    loading: "Yükleniyor",
    viewAllItems: "Tümünü Gör",
  };
  return translations[key] || key;
}

describe("DashboardDailyTab", () => {
  it("renders the visible follow-up settings hint when meta is provided", () => {
    const wrapper = mount(DashboardDailyTab, {
      props: {
        activityFacts: () => [],
        dashboardLoading: false,
        displayRecentPolicies: [],
        displayRenewalAlertItems: [],
        followUpDescription: () => "desc",
        followUpFacts: () => [],
        followUpLoading: false,
        followUpMeta: { settings: { follow_up_due_soon_days: 7, follow_up_preview_limit: 8 } },
        followUpSummary: { overdue: 1, due_today: 2, due_soon: 3 },
        followUpTitle: () => "Takip",
        formatCurrencyBy: () => "0",
        formatDaysToDue: () => "0 gün",
        formatNumber: (value) => String(value),
        isDailyTab: true,
        myActivitiesLoading: false,
        myTaskSummary: { overdue: 0, due_today: 0, due_soon: 0 },
        myTasksLoading: false,
        openActivityItem: () => {},
        openClaimItem: () => {},
        openClaimsPreviewRows: [],
        openFollowUpItem: () => {},
        openPage: () => {},
        openPolicyItem: () => {},
        openPreviewList: () => {},
        openRenewalTaskItem: () => {},
        openTaskItem: () => {},
        pagedPreviewItems: (items) => items,
        prioritizedFollowUpItems: [],
        priorityTaskItems: [],
        previewPageCount: () => 1,
        previewResolvedPage: () => 1,
        recentActivityItems: [],
        recentPolicyFacts: () => [],
        renewalAlertFacts: () => [],
        setPreviewPage: () => {},
        shouldShowViewAll: () => false,
        claimFacts: () => [],
        taskFacts: () => [],
        t,
        locale: "tr",
        visibleQuickActions: [],
      },
    });

    expect(wrapper.text()).toContain("Aktif ayar: Yaklaşan pencere: 7 gün");
    expect(wrapper.text()).toContain("Önizleme: 8 kayıt");
  });
});