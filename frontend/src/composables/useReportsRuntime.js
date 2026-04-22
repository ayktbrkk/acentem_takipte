import { onBeforeUnmount, ref } from "vue";
import { frappeRequest } from "frappe-ui";

export function useReportsRuntime({
  filters,
  rows,
  columns,
  comparisonRows,
  reportCatalog,
  t,
  buildFiltersPayload,
  buildPreviousPeriodFiltersPayload,
  canManageScheduledReports,
  filtersSectionRef,
  visibleColumnKeys,
  groupByColumn,
}) {
  const loading = ref(false);
  const error = ref("");
  const exportLoading = ref(false);
  const scheduledReports = ref([]);
  const scheduledLoading = ref(false);
  const scheduledRunLoading = ref(false);
  const snapshotRunLoading = ref(false);

  const REPORT_LOAD_DEBOUNCE_MS = 300;
  let reportLoadTimer = null;

  async function loadReport() {
    loading.value = true;
    error.value = "";
    try {
      const payload = await frappeRequest({
        url: `/api/method/${reportCatalog[filters.reportKey].readMethod}`,
        method: "GET",
        params: {
          filters: JSON.stringify(buildFiltersPayload()),
          limit: 500,
        },
      });
      const message = payload?.message || payload || {};
      columns.value = message.columns || [];
      rows.value = message.rows || [];
      comparisonRows.value = [];

      const previousFilters = buildPreviousPeriodFiltersPayload();
      if (previousFilters) {
        const comparisonPayload = await frappeRequest({
          url: `/api/method/${reportCatalog[filters.reportKey].readMethod}`,
          method: "GET",
          params: {
            filters: JSON.stringify(previousFilters),
            limit: 500,
          },
        });
        const comparisonMessage = comparisonPayload?.message || comparisonPayload || {};
        comparisonRows.value = Array.isArray(comparisonMessage.rows) ? comparisonMessage.rows : [];
      }
    } catch (err) {
      const errorMessage =
        err?.response?.message
        || (Array.isArray(err?.messages) && err.messages[0])
        || err?.message
        || t("loadErrorTitle");
      error.value = String(errorMessage);
      columns.value = [];
      rows.value = [];
      comparisonRows.value = [];
    } finally {
      loading.value = false;
    }
  }

  function scheduleReportLoad({ immediate = false } = {}) {
    const runLoad = () => {
      reportLoadTimer = null;
      void loadReport();
    };

    if (immediate) {
      if (reportLoadTimer) {
        window.clearTimeout(reportLoadTimer);
        reportLoadTimer = null;
      }
      runLoad();
      return;
    }

    if (reportLoadTimer) {
      window.clearTimeout(reportLoadTimer);
    }
    reportLoadTimer = window.setTimeout(runLoad, REPORT_LOAD_DEBOUNCE_MS);
  }

  async function downloadReport(format) {
    exportLoading.value = true;
    try {
      const method = reportCatalog[filters.reportKey].exportMethod;
      const params = new URLSearchParams({
        filters: JSON.stringify(buildFiltersPayload()),
        export_format: format,
        limit: "1000",
      });
      const popup = window.open(`/api/method/${method}?${params.toString()}`, "_blank", "noopener");
      if (!popup) {
        throw new Error("Popup blocked");
      }
    } catch (err) {
      error.value = String(err?.message || err || t("exportError"));
    } finally {
      exportLoading.value = false;
    }
  }

  async function enqueueBackgroundExport(format) {
    exportLoading.value = true;
    try {
      await frappeRequest({
        url: "/api/method/acentem_takipte.acentem_takipte.services.async_reports.enqueue_report_export",
        method: "POST",
        params: {
          report_key: filters.reportKey,
          filters: buildFiltersPayload(),
          export_format: format,
        },
      });
      // In a real app, we'd show a "Job Enqueued" toast here
    } catch (err) {
      error.value = String(err?.message || err || t("exportError"));
    } finally {
      exportLoading.value = false;
    }
  }

  async function loadScheduledReports() {
    if (!canManageScheduledReports.value) {
      scheduledReports.value = [];
      return;
    }

    scheduledLoading.value = true;
    try {
      const payload = await frappeRequest({
        url: "/api/method/acentem_takipte.acentem_takipte.api.reports.get_scheduled_report_configs",
        method: "GET",
      });
      const message = payload?.message || payload || {};
      scheduledReports.value = Array.isArray(message.items) ? message.items : [];
    } catch (err) {
      error.value = String(err?.message || err || t("scheduledLoadError"));
      scheduledReports.value = [];
    } finally {
      scheduledLoading.value = false;
    }
  }

  async function runScheduledReports() {
    scheduledRunLoading.value = true;
    try {
      await frappeRequest({
        url: "/api/method/acentem_takipte.acentem_takipte.api.admin_jobs.run_scheduled_reports_job",
        method: "POST",
        params: {
          frequency: "daily",
          limit: 10,
        },
      });
      await loadScheduledReports();
    } catch (err) {
      error.value = String(err?.message || err || t("scheduledRunError"));
    } finally {
      scheduledRunLoading.value = false;
    }
  }

  async function runCustomerSegmentSnapshots() {
    snapshotRunLoading.value = true;
    try {
      await frappeRequest({
        url: "/api/method/acentem_takipte.acentem_takipte.api.admin_jobs.run_customer_segment_snapshot_job",
        method: "POST",
        params: {
          limit: 250,
        },
      });
    } catch (err) {
      error.value = String(err?.message || err || t("segmentSnapshotRunError"));
    } finally {
      snapshotRunLoading.value = false;
    }
  }

  async function saveScheduledReport({ index, config }) {
    try {
      await frappeRequest({
        url: "/api/method/acentem_takipte.acentem_takipte.api.reports.save_scheduled_report_config",
        method: "POST",
        params: {
          index: index || "",
          config,
        },
      });
      await loadScheduledReports();
    } catch (err) {
      error.value = String(err?.message || err || t("scheduledSaveError"));
    }
  }

  async function removeScheduledReport(index) {
    try {
      await frappeRequest({
        url: "/api/method/acentem_takipte.acentem_takipte.api.reports.remove_scheduled_report_config",
        method: "POST",
        params: { index },
      });
      await loadScheduledReports();
    } catch (err) {
      error.value = String(err?.message || err || t("scheduledDeleteError"));
    }
  }

  function focusFilters() {
    const root = filtersSectionRef.value?.$el || filtersSectionRef.value;
    if (root && typeof root.scrollIntoView === "function") {
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  onBeforeUnmount(() => {
    if (reportLoadTimer) {
      window.clearTimeout(reportLoadTimer);
      reportLoadTimer = null;
    }
  });

  return {
    loading,
    error,
    exportLoading,
    scheduledReports,
    scheduledLoading,
    scheduledRunLoading,
    snapshotRunLoading,
    loadReport,
    scheduleReportLoad,
    downloadReport,
    enqueueBackgroundExport,
    loadScheduledReports,
    runScheduledReports,
    runCustomerSegmentSnapshots,
    saveScheduledReport,
    removeScheduledReport,
    focusFilters,
  };
}
