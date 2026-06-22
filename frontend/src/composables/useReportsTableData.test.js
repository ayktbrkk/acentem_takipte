import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";

import { useReportsTableData } from "./useReportsTableData";

describe("useReportsTableData", () => {
  it("formats columns and sorts rows", () => {
    const filters = ref({
      reportKey: "policy_list",
      fromDate: "",
      toDate: "",
      granularity: "",
    });
    const rows = ref([
      { name: "R2", gross_premium: 150, policy_count: 2 },
      { name: "R1", gross_premium: 50, policy_count: 1 },
    ]);
    const columns = ref(["name", "gross_premium", "policy_count"]);
    const comparisonRows = ref([]);

    const result = useReportsTableData({
      filters: filters.value,
      rows,
      columns,
      comparisonRows,
      activeLocale: ref("tr"),
      localeCode: ref("tr-TR"),
      branchScopeLabel: computed(() => "Ofis Şube: IST"),
      t: (key) => key,
    });

    expect(result.columnsSummaryLabel.value).toBe("3/3");
    result.toggleColumn("policy_count");
    expect(result.columnsSummaryLabel.value).toBe("1/3");
    result.showAllColumns();
    expect(result.columnsSummaryLabel.value).toBe("3/3");
    expect(result.getColumnLabel("name")).toBe("Kayıt No");
    expect(result.formatCellValue("gross_premium", 1200)).toContain("1");

    result.sortState.column = "gross_premium";
    result.sortState.direction = "asc";
    expect(result.sortedRows.value[0].gross_premium).toBe(50);

    result.sortState.direction = "desc";
    expect(result.sortedRows.value[0].gross_premium).toBe(150);
    expect(result.summaryItems.value).toHaveLength(4);
  });

  it("uses translated fallback labels for empty group keys", () => {
    const filters = ref({
      reportKey: "policy_list",
      fromDate: "",
      toDate: "",
      granularity: "",
    });
    const rows = ref([
      { name: "R1", branch: "", gross_premium: 50, commission_amount: 5 },
      { name: "R2", branch: null, gross_premium: 75, commission_amount: 7.5 },
    ]);
    const columns = ref(["name", "branch", "gross_premium", "commission_amount"]);

    const result = useReportsTableData({
      filters: filters.value,
      rows,
      columns,
      comparisonRows: ref([]),
      activeLocale: ref("tr"),
      localeCode: ref("tr-TR"),
      branchScopeLabel: computed(() => "Ofis Şube: IST"),
      t: (key) => (key === "notProvided" ? "Belirtilmedi" : key),
    });

    result.groupByColumn.value = "branch";

    expect(result.sortedRows.value[0]._groupTitle).toContain("Belirtilmedi");
  });

  it("translates customer segmentation values", () => {
    const filters = ref({
      reportKey: "customer_segmentation",
      fromDate: "",
      toDate: "",
      granularity: "",
    });
    const rows = ref([
      {
        name: "C1",
        claim_history_segment: "HAS_CLAIM",
        loyalty_segment: "LOYAL",
        premium_segment: "HIGH",
        policy_segment: "5+",
        claim_status: "Under Review",
      },
    ]);
    const columns = ref([
      "claim_history_segment",
      "loyalty_segment",
      "premium_segment",
      "policy_segment",
      "claim_status",
    ]);

    const translations = {
      segmentHasClaim: "Hasarlı",
      segmentLoyal: "Sadık",
      segmentPremiumHigh: "Yüksek Prim",
      segmentPolicy5Plus: "5+ Poliçe",
      claimStatusUnderReview: "İncelemede",
      notProvided: "Belirtilmedi",
    };

    const result = useReportsTableData({
      filters: filters.value,
      rows,
      columns,
      comparisonRows: ref([]),
      activeLocale: ref("tr"),
      localeCode: ref("tr-TR"),
      branchScopeLabel: computed(() => "Ofis Şube: IST"),
      t: (key) => translations[key] || key,
    });

    expect(result.formatCellValue("claim_history_segment", "HAS_CLAIM")).toBe("Hasarlı");
    expect(result.formatCellValue("loyalty_segment", "LOYAL")).toBe("Sadık");
    expect(result.formatCellValue("premium_segment", "HIGH")).toBe("Yüksek Prim");
    expect(result.formatCellValue("policy_segment", "5+")).toBe("5+ Poliçe");
    expect(result.formatCellValue("claim_status", "Under Review")).toBe("İncelemede");
  });
});
