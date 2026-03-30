import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

function formatDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildFilters(days) {
  const to = new Date();
  const from = new Date(to);
  const compareTo = new Date(from);
  const compareFrom = new Date(compareTo);

  from.setDate(to.getDate() - days);
  compareTo.setDate(from.getDate() - 1);
  compareFrom.setDate(compareTo.getDate() - days);

  return {
    from_date: formatDate(from),
    to_date: formatDate(to),
    compare_from_date: formatDate(compareFrom),
    compare_to_date: formatDate(compareTo),
    months: 6,
  };
}

test("debug sales payload", async ({ page }) => {
  await ensureAuthenticated(page);
  const response = await page.request.get(
    "/api/method/acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_tab_payload",
    {
      params: {
        tab: "sales",
        filters: JSON.stringify(buildFilters(7)),
      },
    }
  );
  const text = await response.text();
  console.log("STATUS", response.status());
  console.log("BODY", text.slice(0, 2000));
});
