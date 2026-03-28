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
    });

    expect(result.columnsSummaryLabel.value).toBe("3/3");
    result.toggleColumn("policy_count");
    expect(result.columnsSummaryLabel.value).toBe("1/3");
    result.showAllColumns();
    expect(result.columnsSummaryLabel.value).toBe("3/3");
    expect(result.getColumnLabel("name")).toBe("Kayıt No");
    expect(result.formatCellValue("gross_premium", 1200)).toContain("1");

    result.toggleSort("gross_premium");
    expect(result.sortedRows.value[0].gross_premium).toBe(50);

    result.toggleSort("gross_premium");
    expect(result.sortedRows.value[0].gross_premium).toBe(150);
    expect(result.summaryItems.value).toHaveLength(4);
  });
});
