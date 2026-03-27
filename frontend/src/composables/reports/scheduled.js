export function useReportsScheduled({
  t,
  frappeRequest,
  canManageScheduledReports,
  scheduledReports,
  scheduledLoading,
  scheduledRunLoading,
  snapshotRunLoading,
  errorRef,
}) {
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
      errorRef.value = String(err?.message || err || t("scheduledLoadError"));
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
      errorRef.value = String(err?.message || err || t("scheduledRunError"));
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
      errorRef.value = String(err?.message || err || t("segmentSnapshotRunError"));
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
      errorRef.value = String(err?.message || err || t("scheduledSaveError"));
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
      errorRef.value = String(err?.message || err || t("scheduledDeleteError"));
    }
  }

  return {
    loadScheduledReports,
    runScheduledReports,
    runCustomerSegmentSnapshots,
    saveScheduledReport,
    removeScheduledReport,
  };
}
