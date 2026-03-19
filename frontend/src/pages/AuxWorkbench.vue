<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <h1 class="detail-title">{{ label('list') }}</h1>
        <p class="detail-subtitle">{{ subtitleLabel }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-outline btn-sm" type="button" :disabled="isLoading" @click="refreshList">
          {{ t('refresh') }}
        </button>
        <button
          v-if="canExportSnapshotRows"
          class="btn btn-outline btn-sm"
          type="button"
          @click="exportSnapshotRows"
        >
          {{ t('exportCsv') }}
        </button>
        <button class="btn btn-outline btn-sm" type="button" :disabled="isLoading" @click="downloadAuxExport('xlsx')">
          {{ t('exportXlsx') }}
        </button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="isLoading" @click="downloadAuxExport('pdf')">
          {{ t('exportPdf') }}
        </button>
        <QuickCreateLauncher
          v-if="auxQuickCreate && canLaunchAuxQuickCreate"
          variant="primary"
          size="sm"
          :label="localize(auxQuickCreate.label) || t('newRecord')"
          @launch="showAuxQuickCreateDialog = true"
        />
        <ActionButton
          v-for="action in visibleToolbarActions"
          :key="action.key || action.routeName || localize(action.label)"
          variant="secondary"
          size="sm"
          @click="runToolbarAction(action)"
        >
          {{ localize(action.label) || t('panel') }}
        </ActionButton>
      </div>
    </div>

    <article class="surface-card rounded-2xl p-5">
      <WorkbenchFilterToolbar
        :model-value="presetKey"
        :show-preset="true"
        :advanced-label="t('advanced')"
        :collapse-label="t('hideAdvanced')"
        :active-count="activeFilterCount"
        :active-count-label="t('activeFilters')"
        :preset-label="t('preset')"
        :preset-options="presetOptions"
        :can-delete-preset="canDeletePreset"
        :save-label="t('savePreset')"
        :delete-label="t('deletePreset')"
        :apply-label="t('apply')"
        :reset-label="t('reset')"
        :disabled="isLoading"
        @update:modelValue="onPresetModelValue"
        @presetChange="onPresetChange"
        @presetSave="savePreset"
        @presetDelete="deletePreset"
        @apply="applyFilters"
        @reset="resetFilters"
      >
        <input v-model.trim="draft.query" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" :placeholder="t('searchPlaceholder')" />

        <template v-for="fd in quickFilterDefs" :key="'q-'+fd.key">
          <component
            :is="fd.type === 'select' ? 'select' : 'input'"
            v-model="draft[fd.key]"
            :type="fd.type === 'select' ? undefined : fd.type === 'number' ? 'number' : 'text'"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <template v-if="fd.type === 'select'">
              <option v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
                {{ optionLabel(fd, opt) }}
              </option>
            </template>
          </component>
        </template>

        <select v-model="draft.sort" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <select v-model.number="draft.pageLength" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option v-for="n in [10,20,50]" :key="n" :value="n">{{ n }}</option>
        </select>

        <template #advanced>
          <template v-for="fd in advancedFilterDefs" :key="'a-'+fd.key">
            <component
              :is="fd.type === 'select' ? 'select' : 'input'"
              v-model="draft[fd.key]"
              :type="fd.type === 'select' ? undefined : fd.type === 'number' ? 'number' : 'text'"
              class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              :placeholder="fieldLabel(fd.field)"
            >
              <template v-if="fd.type === 'select'">
                <option v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
                  {{ optionLabel(fd, opt) }}
                </option>
              </template>
            </component>
          </template>
        </template>
      </WorkbenchFilterToolbar>
    </article>

    <div class="space-y-3">
      <div
        v-if="snapshotSummaryCards.length"
        class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <article
          v-for="card in snapshotSummaryCards"
          :key="card.key"
          class="mini-metric"
        >
          <p class="mini-metric-label">{{ card.label }}</p>
          <p class="mini-metric-value">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
        </article>
      </div>
      <div
        v-if="reminderSummaryCards.length"
        class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <article
          v-for="card in reminderSummaryCards"
          :key="card.key"
          class="mini-metric"
        >
          <p class="mini-metric-label">{{ card.label }}</p>
          <p class="mini-metric-value">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
        </article>
      </div>
      <div
        v-if="accessLogSummaryCards.length"
        class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <article
          v-for="card in accessLogSummaryCards"
          :key="card.key"
          class="mini-metric"
        >
          <p class="mini-metric-label">{{ card.label }}</p>
          <p class="mini-metric-value">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
        </article>
      </div>
      <div
        v-if="fileSummaryCards.length"
        class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <article
          v-for="card in fileSummaryCards"
          :key="card.key"
          class="mini-metric"
        >
          <p class="mini-metric-label">{{ card.label }}</p>
          <p class="mini-metric-value">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
        </article>
      </div>
      <article
        v-if="snapshotTrendRows.length"
        class="surface-card rounded-2xl p-5"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("snapshotTrendTitle") }}</p>
            <p class="text-sm text-slate-500">{{ t("snapshotTrendHint") }}</p>
          </div>
          <span class="text-xs text-slate-400">{{ t("showing") }} {{ snapshotTrendRows.length }}</span>
        </div>
        <div class="mt-4 grid gap-3 md:grid-cols-3">
          <article
            v-for="row in snapshotTrendRows"
            :key="row.snapshotDate"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p class="text-sm font-semibold text-slate-900">{{ row.snapshotDateLabel }}</p>
            <div class="mt-2 space-y-1 text-xs text-slate-600">
              <p>{{ t("totalSnapshots") }}: {{ row.total }}</p>
              <p>{{ t("averageScore") }}: {{ row.averageScore }}</p>
              <p>{{ t("highRiskSnapshots") }}: {{ row.highRisk }}</p>
            </div>
          </article>
        </div>
      </article>
    </div>

    <article class="surface-card rounded-2xl p-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ label("list") }}</p>
          <p class="text-sm text-slate-500">{{ subtitleLabel }}</p>
        </div>
        <p class="text-xs text-slate-500">{{ t("showing") }} {{ startRow }}-{{ endRow }} / {{ pagination.total }}</p>
      </div>

      <div v-if="isLoading && rows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
        {{ t("loading") }}
      </div>
      <div v-else-if="loadError.text" class="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-700">
        <p class="text-sm font-semibold">{{ t("loadErrorTitle") }}</p>
        <p class="mt-1 text-sm">{{ loadError.text }}</p>
      </div>
      <div v-else-if="rows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <EmptyState :title="t('emptyTitle')" :description="t('emptyDescription')" />
      </div>
      <template v-else>
        <div class="at-table-wrap mt-4">
          <table class="at-table w-full min-w-[980px]">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t("record") }}</th>
                <th class="at-table-head-cell">{{ t("details") }}</th>
                <th class="at-table-head-cell">{{ t("status") }}</th>
                <th class="at-table-head-cell">{{ t("info") }}</th>
                <th class="at-table-head-cell">{{ t("actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.name"
                class="at-table-row cursor-pointer"
                @click="openDetail(row)"
              >
                <DataTableCell>
                  <TableEntityCell :title="rowTitle(row)" :facts="factItems(row, config.primaryFields)">
                    <p class="text-xs text-slate-500">{{ fieldLabel('modified') }}: {{ formatField(row.modified, 'modified') }}</p>
                  </TableEntityCell>
                </DataTableCell>

                <TableFactsCell :items="factItems(row, config.detailFields)" />

                <DataTableCell>
                  <div class="flex flex-wrap items-center gap-2">
                    <StatusBadge v-if="config.statusField && row[config.statusField] !== undefined && row[config.statusField] !== null && row[config.statusField] !== ''" :domain="config.statusType || 'policy'" :status="statusValue(row, config.statusField, config.statusType)" />
                    <StatusBadge v-if="config.secondaryStatusField && row[config.secondaryStatusField]" :domain="config.secondaryStatusType || 'policy'" :status="statusValue(row, config.secondaryStatusField, config.secondaryStatusType)" />
                    <span v-if="!config.statusField && !config.secondaryStatusField" class="text-xs text-slate-400">-</span>
                  </div>
                </DataTableCell>

                <TableFactsCell :items="factItems(row, config.metricFields)" />

                <DataTableCell>
                  <InlineActionRow>
                    <ActionButton
                      v-if="canSendDraftNowRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="sendDraftNowRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("sendNow") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canRetryOutboxRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="retryOutboxRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("retry") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canRequeueOutboxRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="requeueOutboxRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("requeue") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canOpenCommunicationContextRow(row)"
                      variant="secondary"
                      size="xs"
                      @click.stop="openCommunicationContextRow(row)"
                    >
                      {{ t("openCommunication") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canStartTaskRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="startTaskRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("startTask") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canBlockTaskRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="blockTaskRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("blockTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCompleteTaskRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="completeTaskRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("completeTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCancelTaskRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="cancelTaskRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("cancelTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCompleteReminderRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="completeReminderRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("completeTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCancelReminderRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="cancelReminderRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("cancelTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canStartOwnershipAssignmentRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="startOwnershipAssignmentRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("startTask") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canBlockOwnershipAssignmentRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="blockOwnershipAssignmentRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("blockTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCompleteOwnershipAssignmentRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="completeOwnershipAssignmentRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("completeTaskAction") }}
                    </ActionButton>
                    <ActionButton variant="secondary" size="xs" @click.stop="openDetail(row)">{{ t("openDetail") }}</ActionButton>
                    <ActionButton v-if="panelCfgForRow(row)" variant="link" size="xs" trailing-icon=">" @click.stop="openPanel(row)">{{ t("panel") }}</ActionButton>
                  </InlineActionRow>
                </DataTableCell>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4">
          <TablePagerFooter
            :page="pagination.page"
            :total-pages="totalPages"
            :page-label="t('page')"
            :previous-label="t('prev')"
            :next-label="t('next')"
            :prev-disabled="pagination.page <= 1 || isLoading"
            :next-disabled="!hasNextPage || isLoading"
            @previous="previousPage"
            @next="nextPage"
          />
        </div>
      </template>
    </article>

    <QuickCreateManagedDialog
      v-if="auxQuickCreate && canLaunchAuxQuickCreate"
      v-model="showAuxQuickCreateDialog"
      :config-key="auxQuickCreate.registryKey"
      :locale="activeLocale"
      :options-map="auxQuickOptionsMap"
      :show-save-and-open="auxQuickCreate.showSaveAndOpen !== false"
      :before-open="prepareAuxQuickCreateDialog"
      :after-submit="handleAuxQuickCreateAfterSubmit"
      :success-handlers="auxQuickCreateSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { getAuxWorkbenchConfig } from "../config/auxWorkbenchConfigs";
import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { getSourcePanelConfig } from "../utils/sourcePanel";
import { navigateToSameOriginPath } from "../utils/safeNavigation";
import {
  extractCustomFilterPresetId,
  isCustomFilterPresetValue,
  makeCustomFilterPresetValue,
  readFilterPresetKey,
  readFilterPresetList,
  writeFilterPresetKey,
  writeFilterPresetList,
} from "../utils/filterPresetState";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import TablePagerFooter from "../components/app-shell/TablePagerFooter.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import EmptyState from "../components/app-shell/EmptyState.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import { openTabularExport } from "../utils/listExport";

const props = defineProps({
  screenKey: { type: String, required: true },
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const config = getAuxWorkbenchConfig(props.screenKey);

if (!config) {
  throw new Error(`Unknown aux workbench screen: ${props.screenKey}`);
}

const copy = {
  tr: {
    refresh: "Yenile",
    advanced: "Gelişmiş Filtreler",
    hideAdvanced: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    preset: "Filtre Şablonu",
    presetDefault: "Standart",
    apply: "Uygula",
    reset: "Temizle",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Şablon adı",
    deletePresetConfirm: "Bu özel şablon silinsin mi?",
    searchPlaceholder: "Kayıtlarda ara...",
    loading: "Kayıtlar yükleniyor...",
    loadErrorTitle: "Kayıtlar Yüklenemedi",
    emptyTitle: "Kayıt bulunamadı",
    emptyDescription: "Filtreleri güncelleyip tekrar deneyin.",
    showing: "Gösterilen",
    record: "Kayıt",
    details: "Detaylar",
    status: "Durum",
    info: "Bilgiler",
    actions: "Aksiyon",
    exportCsv: "CSV Dışa Aktar",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    totalSnapshots: "Toplam Snapshot",
    highRiskSnapshots: "Yüksek Risk",
    highValueSnapshots: "Yüksek Değer",
    averageScore: "Ortalama Skor",
    totalAuditEvents: "Toplam Kayıt",
    totalReminders: "Toplam Hatırlatıcı",
    openReminders: "Açık",
    overdueReminders: "Geciken",
    highPriorityReminders: "Yüksek Öncelik",
    createEvents: "Oluşturma",
    editEvents: "Düzenleme",
    deleteEvents: "Silme",
    runEvents: "Çalıştırma",
    totalFiles: "Toplam Dosya",
    pdfFiles: "PDF",
    imageFiles: "Görseller",
    spreadsheetFiles: "E-Tablolar",
    attachedCustomers: "Müşteri Ekleri",
    attachedPolicies: "Poliçe Ekleri",
    attachedClaims: "Hasar Ekleri",
    snapshotTrendTitle: "Snapshot Eğilimi",
    snapshotTrendHint: "Görünen kayıtlardaki son üç snapshot gününü özetler",
    snapshotWindowHint: "Geçerli filtre penceresindeki kayıtlar",
    highRiskHint: "Hasar riski yüksek kayıtlar",
    highValueHint: "Yüksek veya premium değer bandındaki kayıtlar",
    averageScoreHint: "Filtrelenen kayıtların ortalama skoru",
    auditWindowHint: "Geçerli filtre penceresindeki audit kayıtları",
    reminderWindowHint: "Geçerli filtre penceresindeki hatırlatıcılar",
    openRemindersHint: "Açık durumundaki hatırlatıcılar",
    overdueRemindersHint: "Hatırlatma zamanı geçmiş açık kayıtlar",
    highPriorityRemindersHint: "Yüksek öncelikli açık hatırlatıcılar",
    createEventsHint: "Oluşturma aksiyonları",
    editEventsHint: "Düzenleme aksiyonları",
    deleteEventsHint: "Silme aksiyonları",
    runEventsHint: "Çalıştırma aksiyonları",
    filesWindowHint: "Geçerli filtre penceresindeki dosyalar",
    pdfFilesHint: "PDF biçimindeki belgeler",
    imageFilesHint: "Görsel dosyalar",
    spreadsheetFilesHint: "E-tablo belgeleri",
    attachedCustomersHint: "AT Customer kayıtlarına ekli dosyalar",
    attachedPoliciesHint: "AT Policy kayıtlarına ekli dosyalar",
    attachedClaimsHint: "AT Claim kayıtlarına ekli dosyalar",
    newRecord: "Yeni Kayıt",
    openDetail: "Detay",
    openDesk: "Yönetim Ekranında Aç",
    panel: "Panel",
    openCommunication: "İletişim Merkezi",
    sendNow: "Hemen Gönder",
    retry: "Tekrar Dene",
    requeue: "Kuyruğa Al",
    startTask: "Takibe Al",
    blockTaskAction: "Bloke Et",
    completeTaskAction: "Tamamla",
    cancelTaskAction: "İptal Et",
    running: "Çalışıyor...",
    page: "Sayfa",
    prev: "Önceki",
    next: "Sonraki",
  },
  en: {
    refresh: "Refresh",
    advanced: "Advanced Filters",
    hideAdvanced: "Hide Advanced",
    activeFilters: "active filters",
    preset: "Filter Preset",
    presetDefault: "Standard",
    apply: "Apply",
    reset: "Reset",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Preset name",
    deletePresetConfirm: "Delete this custom preset?",
    searchPlaceholder: "Search records...",
    loading: "Loading records...",
    loadErrorTitle: "Failed to Load",
    emptyTitle: "No records found",
    emptyDescription: "Adjust filters and try again.",
    showing: "Showing",
    record: "Record",
    details: "Details",
    status: "Status",
    info: "Info",
    actions: "Actions",
    exportCsv: "Export CSV",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    totalSnapshots: "Total Snapshots",
    highRiskSnapshots: "High Risk",
    highValueSnapshots: "High Value",
    averageScore: "Average Score",
    totalAuditEvents: "Total Audit Events",
    totalReminders: "Total Reminders",
    openReminders: "Open",
    overdueReminders: "Overdue",
    highPriorityReminders: "High Priority",
    createEvents: "Create",
    editEvents: "Edit",
    deleteEvents: "Delete",
    runEvents: "Run",
    totalFiles: "Total Files",
    pdfFiles: "PDF",
    imageFiles: "Images",
    spreadsheetFiles: "Spreadsheets",
    attachedCustomers: "Customer Attached",
    attachedPolicies: "Policy Attached",
    attachedClaims: "Claim Attached",
    snapshotTrendTitle: "Snapshot Trend",
    snapshotTrendHint: "Summarizes the latest three snapshot days from visible records",
    snapshotWindowHint: "Records in the current filtered window",
    highRiskHint: "Records where claim risk is High",
    highValueHint: "Records with High or Premium value band",
    averageScoreHint: "Average score for filtered records",
    auditWindowHint: "Audit events in the current filtered window",
    reminderWindowHint: "Reminders in the current filtered window",
    openRemindersHint: "Reminders with Open status",
    overdueRemindersHint: "Open reminders whose remind time has passed",
    highPriorityRemindersHint: "Open reminders with High priority",
    createEventsHint: "Create actions",
    editEventsHint: "Edit actions",
    deleteEventsHint: "Delete actions",
    runEventsHint: "Run actions",
    filesWindowHint: "Files in the current filtered window",
    pdfFilesHint: "Documents in PDF format",
    imageFilesHint: "Image files",
    spreadsheetFilesHint: "Spreadsheet documents",
    attachedCustomersHint: "Files attached to AT Customer records",
    attachedPoliciesHint: "Files attached to AT Policy records",
    attachedClaimsHint: "Files attached to AT Claim records",
    newRecord: "New Record",
    openDetail: "Detail",
    openDesk: "Desk",
    panel: "Panel",
    openCommunication: "Communication Center",
    sendNow: "Send Now",
    retry: "Retry",
    requeue: "Requeue",
    startTask: "Start",
    blockTaskAction: "Block",
    completeTaskAction: "Mark Done",
    cancelTaskAction: "Cancel",
    running: "Running...",
    page: "Page",
    prev: "Previous",
    next: "Next",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

function localize(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v[activeLocale.value] || v.en || v.tr || "";
}

const activeLocale = computed(() => unref(authStore.locale) || "en");

const draft = reactive({ query: "", sort: config.defaultSort || "modified desc", pageLength: 20 });
const filters = reactive({ query: "", sort: config.defaultSort || "modified desc" });
for (const fd of config.filterDefs || []) {
  draft[fd.key] = "";
  filters[fd.key] = "";
}

const pagination = reactive({ page: 1, pageLength: 20, total: 0 });
const loadError = reactive({ text: "" });
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

const PRESET_STORAGE_KEY = `at:aux:${config.key}:preset`;
const PRESET_LIST_STORAGE_KEY = `at:aux:${config.key}:preset-list`;
const presetKey = ref(readFilterPresetKey(PRESET_STORAGE_KEY, "default"));
const customPresets = ref(readFilterPresetList(PRESET_LIST_STORAGE_KEY));
const showAuxQuickCreateDialog = ref(false);
const rowActionBusyName = ref("");

const listResource = createResource({ url: "frappe.client.get_list", auto: false });
const countResource = createResource({ url: "frappe.client.get_count", auto: false });
const presetServerReadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
  auto: false,
});
const presetServerWriteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
  auto: false,
});
const sendDraftNowRowResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.send_draft_now",
  auto: false,
});
const retryOutboxRowResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.retry_outbox_item",
  auto: false,
});
const requeueOutboxRowResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.requeue_outbox_item",
  auto: false,
});
const taskRowMutationResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
  auto: false,
});
const auxQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const auxQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Policy",
    fields: ["name", "policy_no", "customer"],
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const auxQuickTemplateResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Notification Template",
    fields: ["name", "template_key", "event_key", "channel", "language", "is_active"],
    filters: { is_active: 1 },
    order_by: "template_key asc",
    limit_page_length: 500,
  },
});
const auxQuickInsuranceCompanyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Insurance Company",
    fields: ["name", "company_name", "company_code"],
    filters: { is_active: 1 },
    order_by: "company_name asc",
    limit_page_length: 500,
  },
});
const auxQuickSalesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Sales Entity",
    fields: ["name", "full_name", "entity_type"],
    order_by: "full_name asc",
    limit_page_length: 500,
  },
});
const auxQuickAccountingEntryResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Accounting Entry",
    fields: ["name", "source_doctype", "source_name", "status"],
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const OFFICE_BRANCH_FILTER_DOCTYPES = new Set([
  "AT Renewal Task",
  "AT Accounting Entry",
  "AT Notification Draft",
  "AT Notification Outbox",
]);
const OFFICE_BRANCH_LOOKUP_DOCTYPES = new Set(["AT Customer", "AT Policy", "AT Accounting Entry"]);

const resourceValue = (resource, fallback = null) => {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
};
const asArray = (value) => (Array.isArray(value) ? value : []);
const rows = computed(() => asArray(resourceValue(listResource, [])));
const snapshotRows = computed(() => (config.key === "customer-segment-snapshots" ? rows.value : []));
const accessLogRows = computed(() => (config.key === "access-logs" ? rows.value : []));
const fileRows = computed(() => (config.key === "files" ? rows.value : []));
const reminderRows = computed(() => (config.key === "reminders" ? rows.value : []));
const canExportSnapshotRows = computed(() => config.key === "customer-segment-snapshots" && snapshotRows.value.length > 0);
const isLoading = computed(() => Boolean(unref(listResource.loading) || unref(countResource.loading)));
const auxQuickCreate = computed(() => config.quickCreate || null);
const canLaunchAuxQuickCreate = computed(() => {
  const registryKey = auxQuickCreate.value?.registryKey;
  if (!registryKey) return false;
  return authStore.can(["quickCreate", registryKey]);
});
const toolbarActions = computed(() => (Array.isArray(config.toolbarActions) ? config.toolbarActions : []));
const visibleToolbarActions = computed(() =>
  toolbarActions.value.filter((action) => {
    const capabilityPath = action?.capabilityPath;
    if (!capabilityPath) return true;
    return authStore.can(capabilityPath);
  })
);
const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / (pagination.pageLength || 1))));
const hasNextPage = computed(() => pagination.page < totalPages.value);
const startRow = computed(() => (pagination.total ? (pagination.page - 1) * pagination.pageLength + 1 : 0));
const endRow = computed(() => (pagination.total ? Math.min(pagination.total, pagination.page * pagination.pageLength) : 0));
const activeFilterCount = computed(() => {
  let count = filters.query ? 1 : 0;
  for (const fd of config.filterDefs || []) if (String(filters[fd.key] ?? "").trim() !== "") count += 1;
  return count;
});
const snapshotSummaryCards = computed(() => {
  if (config.key !== "customer-segment-snapshots") return [];
  const total = snapshotRows.value.length;
  const highRisk = snapshotRows.value.filter((row) => String(row?.claim_risk || "").toLowerCase() === "high").length;
  const highValue = snapshotRows.value.filter((row) => {
    const valueBand = String(row?.value_band || "").toLowerCase();
    return valueBand === "high" || valueBand === "premium";
  }).length;
  const scored = snapshotRows.value
    .map((row) => Number(row?.score))
    .filter((value) => Number.isFinite(value));
  const averageScore = scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length) : 0;
  return [
    { key: "total", label: t("totalSnapshots"), value: String(total), hint: t("snapshotWindowHint") },
    { key: "high-risk", label: t("highRiskSnapshots"), value: String(highRisk), hint: t("highRiskHint") },
    { key: "high-value", label: t("highValueSnapshots"), value: String(highValue), hint: t("highValueHint") },
    { key: "avg-score", label: t("averageScore"), value: String(averageScore), hint: t("averageScoreHint") },
  ];
});
const snapshotTrendRows = computed(() => {
  if (config.key !== "customer-segment-snapshots") return [];
  const grouped = new Map();
  for (const row of snapshotRows.value) {
    const snapshotDate = String(row?.snapshot_date || "").trim();
    if (!snapshotDate) continue;
    if (!grouped.has(snapshotDate)) {
      grouped.set(snapshotDate, { total: 0, highRisk: 0, scoreSum: 0, scoreCount: 0 });
    }
    const bucket = grouped.get(snapshotDate);
    bucket.total += 1;
    if (String(row?.claim_risk || "").toLowerCase() === "high") bucket.highRisk += 1;
    const score = Number(row?.score);
    if (Number.isFinite(score)) {
      bucket.scoreSum += score;
      bucket.scoreCount += 1;
    }
  }
  return [...grouped.entries()]
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .slice(0, 3)
    .map(([snapshotDate, bucket]) => ({
      snapshotDate,
      snapshotDateLabel: formatField(snapshotDate, "snapshot_date"),
      total: bucket.total,
      highRisk: bucket.highRisk,
      averageScore: bucket.scoreCount ? Math.round(bucket.scoreSum / bucket.scoreCount) : 0,
    }));
});
const accessLogSummaryCards = computed(() => {
  if (config.key !== "access-logs") return [];
  const actions = accessLogRows.value.map((row) => String(row?.action || "").trim().toLowerCase());
  const countByAction = (action) => actions.filter((value) => value === action).length;
  return [
    { key: "total-audit", label: t("totalAuditEvents"), value: String(accessLogRows.value.length), hint: t("auditWindowHint") },
    { key: "create-audit", label: t("createEvents"), value: String(countByAction("create")), hint: t("createEventsHint") },
    { key: "edit-audit", label: t("editEvents"), value: String(countByAction("edit")), hint: t("editEventsHint") },
    { key: "delete-audit", label: t("deleteEvents"), value: String(countByAction("delete")), hint: t("deleteEventsHint") },
    { key: "run-audit", label: t("runEvents"), value: String(countByAction("run")), hint: t("runEventsHint") },
  ];
});
const reminderSummaryCards = computed(() => {
  if (config.key !== "reminders") return [];
  const openRows = reminderRows.value.filter((row) => String(row?.status || "").trim() === "Open");
  const now = Date.now();
  const overdueRows = openRows.filter((row) => {
    const remindAt = row?.remind_at;
    if (!remindAt) return false;
    const value = new Date(remindAt).getTime();
    return Number.isFinite(value) && value < now;
  });
  const highPriorityRows = openRows.filter((row) => String(row?.priority || "").trim() === "High");
  return [
    { key: "total-reminders", label: t("totalReminders"), value: String(reminderRows.value.length), hint: t("reminderWindowHint") },
    { key: "open-reminders", label: t("openReminders"), value: String(openRows.length), hint: t("openRemindersHint") },
    { key: "overdue-reminders", label: t("overdueReminders"), value: String(overdueRows.length), hint: t("overdueRemindersHint") },
    { key: "high-reminders", label: t("highPriorityReminders"), value: String(highPriorityRows.length), hint: t("highPriorityRemindersHint") },
  ];
});
const fileSummaryCards = computed(() => {
  if (config.key !== "files") return [];
  const total = fileRows.value.length;
  const byType = (matcher) => fileRows.value.filter((row) => matcher(String(row?.file_type || "").toLowerCase())).length;
  const byDoctype = (doctype) => fileRows.value.filter((row) => String(row?.attached_to_doctype || "").trim() === doctype).length;
  return [
    { key: "total-files", label: t("totalFiles"), value: String(total), hint: t("filesWindowHint") },
    { key: "pdf-files", label: t("pdfFiles"), value: String(byType((v) => v.includes("pdf"))), hint: t("pdfFilesHint") },
    { key: "image-files", label: t("imageFiles"), value: String(byType((v) => v.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].some((token) => v.includes(token)))), hint: t("imageFilesHint") },
    { key: "spreadsheet-files", label: t("spreadsheetFiles"), value: String(byType((v) => ["sheet", "excel", "csv", "xls", "xlsx"].some((token) => v.includes(token)))), hint: t("spreadsheetFilesHint") },
    { key: "customer-files", label: t("attachedCustomers"), value: String(byDoctype("AT Customer")), hint: t("attachedCustomersHint") },
    { key: "policy-files", label: t("attachedPolicies"), value: String(byDoctype("AT Policy")), hint: t("attachedPoliciesHint") },
    { key: "claim-files", label: t("attachedClaims"), value: String(byDoctype("AT Claim")), hint: t("attachedClaimsHint") },
  ];
});

const subtitleLabel = computed(() => localize(config.subtitle));
const quickFilterDefs = computed(() => (config.filterDefs || []).slice(0, 2));
const advancedFilterDefs = computed(() => (config.filterDefs || []).slice(2));
const sortOptions = computed(() =>
  (config.sortOptions || ["modified desc"]).map((value) =>
    typeof value === "string" ? { value, label: sortLabel(value) } : { value: value.value, label: localize(value.label) }
  )
);
const presetOptions = computed(() => [
  { value: "default", label: t("presetDefault") },
  ...(config.presetDefs || []).map((preset) => ({
    value: preset.key,
    label: localize(preset.label),
  })),
  ...customPresets.value.map((preset) => ({
    value: makeCustomFilterPresetValue(preset.id),
    label: preset.label,
  })),
]);
const canDeletePreset = computed(() => isCustomFilterPresetValue(presetKey.value));
const auxQuickOptionsMap = computed(() => ({
  customers: asArray(resourceValue(auxQuickCustomerResource, [])).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
  })),
  policies: asArray(resourceValue(auxQuickPolicyResource, [])).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  notificationTemplates: asArray(resourceValue(auxQuickTemplateResource, [])).map((row) => ({
    value: row.name,
    label: `${row.template_key || row.name}${row.channel ? ` (${row.channel})` : ""}`,
  })),
  insuranceCompanies: asArray(resourceValue(auxQuickInsuranceCompanyResource, [])).map((row) => ({
    value: row.name,
    label: `${row.company_name || row.name}${row.company_code ? ` (${row.company_code})` : ""}`,
  })),
  salesEntities: asArray(resourceValue(auxQuickSalesEntityResource, [])).map((row) => ({
    value: row.name,
    label: `${row.full_name || row.name}${row.entity_type ? ` (${row.entity_type})` : ""}`,
  })),
  accountingEntries: asArray(resourceValue(auxQuickAccountingEntryResource, [])).map((row) => ({
    value: row.name,
    label: `${row.name}${row.source_doctype ? ` (${row.source_doctype})` : ""}`,
  })),
}));
const auxQuickCreateSuccessHandlers = {
  aux_list: async () => {
    await refreshList();
  },
  notification_draft_list: async () => {
    if (config.key === "notification-drafts") await refreshList();
  },
  renewal_list: async () => {
    if (config.key === "tasks") await refreshList();
  },
};

function label(kind) {
  return localize(config.labels?.[kind]);
}

function sortLabel(orderBy) {
  const [field, dir] = String(orderBy || "").split(/\s+/);
  const base = fieldLabel(field);
  const suffix = String(dir || "").toLowerCase() === "asc" ? (activeLocale.value === "tr" ? "artan" : "asc") : (activeLocale.value === "tr" ? "azalan" : "desc");
  return `${base} (${suffix})`;
}

function humanizeField(field) {
  return String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

const AUX_FIELD_VALUE_LABELS = {
  tr: {
    Synced: "Senkron",
    Draft: "Taslak",
    Failed: "Başarısız",
    Claim: "Hasar",
    Policy: "Poliçe",
    Payment: "Ödeme",
    Resolved: "Çözüldü",
    Open: "Açık",
    Ignored: "Yoksayıldı",
    Amount: "Tutar",
    Currency: "Döviz",
    "Missing External": "Harici Kayıt Eksik",
    "Missing Local": "Yerel Kayıt Eksik",
    Status: "Durum",
    Other: "Diğer",
    Matched: "Eşleşti",
    Adjusted: "Düzeltildi",
    "Manual Override": "Manuel Geçersiz Kılma",
    "AT Policy": "Poliçe",
    "AT Claim": "Hasar",
    "AT Payment": "Ödeme",
    "AT Customer": "Müşteri",
    "AT Accounting Entry": "Muhasebe Kaydı",
    Agency: "Acente",
    Representative: "Temsilci",
    "Sub-Account": "Alt Hesap",
    Both: "Her İkisi",
    tr: "Türkçe",
    en: "İngilizce",
  },
  en: {},
};

function translateFieldValue(value) {
  const key = String(value ?? "");
  return AUX_FIELD_VALUE_LABELS[activeLocale.value]?.[key] || key;
}

const AUX_FIELD_LABELS = {
  "notification-outbox": {
    tr: { name: "Kayıt", customer: "Müşteri", recipient: "Alıcı", provider: "Sağlayıcı", reference_name: "Referans Kayıt", attempt_count: "Deneme Sayısı", next_retry_on: "Sonraki Deneme", owner: "Kayıt Sahibi", modified: "Güncellendi" },
    en: { name: "Record", customer: "Customer", recipient: "Recipient", provider: "Provider", reference_name: "Reference Record", attempt_count: "Attempt Count", next_retry_on: "Next Retry", owner: "Owner", modified: "Modified" },
  },
  companies: {
    tr: { name: "Kayıt", company_code: "Şirket Kodu", owner: "Oluşturan", modified: "Güncellendi" },
    en: { name: "Record", company_code: "Company Code", owner: "Owner", modified: "Modified" },
  },
  branches: {
    tr: { name: "Kayıt", branch_code: "Branş Kodu", insurance_company: "Sigorta Şirketi", modified: "Güncellendi" },
    en: { name: "Record", branch_code: "Branch Code", insurance_company: "Insurance Company", modified: "Modified" },
  },
  "sales-entities": {
    tr: { name: "Kayıt", parent_entity: "Üst Birim", entity_type: "Birim Türü", modified: "Güncellendi" },
    en: { name: "Record", parent_entity: "Parent Entity", entity_type: "Entity Type", modified: "Modified" },
  },
  templates: {
    tr: { name: "Kayıt", event_key: "Olay Anahtarı", subject: "Konu", language: "Dil", modified: "Güncellendi" },
    en: { name: "Record", event_key: "Event Key", subject: "Subject", language: "Language", modified: "Modified" },
  },
  "accounting-entries": {
    tr: { name: "Kayıt", source_doctype: "Kaynak Tipi", source_name: "Kaynak Kaydı", policy: "Poliçe", customer: "Müşteri", local_amount_try: "Yerel Tutar (TRY)", external_amount_try: "Harici Tutar (TRY)", difference_try: "Fark (TRY)", local_amount: "Yerel Tutar", external_amount: "Harici Tutar", status: "Durum", entry_type: "Kayıt Türü", insurance_company: "Sigorta Şirketi", external_ref: "Harici Referans", needs_reconciliation: "Mutabakat Gerekli", last_synced_on: "Son Senkron", sync_attempt_count: "Senkron Denemesi", payload_json: "Payload (JSON)", error_message: "Hata Mesajı", currency: "Döviz", accounting_entry: "Muhasebe Kaydı", owner: "Kayıt Sahibi", modified: "Güncellendi" },
    en: { name: "Record", source_doctype: "Source DocType", source_name: "Source Record", policy: "Policy", customer: "Customer", local_amount_try: "Local Amount (TRY)", external_amount_try: "External Amount (TRY)", difference_try: "Difference (TRY)", local_amount: "Local Amount", external_amount: "External Amount", status: "Status", entry_type: "Entry Type", insurance_company: "Insurance Company", external_ref: "External Reference", needs_reconciliation: "Needs Reconciliation", last_synced_on: "Last Synced", sync_attempt_count: "Sync Attempts", payload_json: "Payload (JSON)", error_message: "Error Message", currency: "Currency", accounting_entry: "Accounting Entry", owner: "Owner", modified: "Modified" },
  },
  "reconciliation-items": {
    tr: { name: "Kayıt", accounting_entry: "Muhasebe Kaydı", source_doctype: "Kaynak Tipi", source_name: "Kaynak Kaydı", mismatch_type: "Uyumsuzluk Tipi", difference_try: "Fark (TRY)", local_amount_try: "Yerel Tutar (TRY)", external_amount_try: "Harici Tutar (TRY)", resolution_action: "Çözüm İşlemi", resolved_by: "Çözen Kullanıcı", resolved_on: "Çözüm Tarihi", unique_key: "Benzersiz Anahtar", notes: "Notlar", details_json: "Detay JSON", status: "Durum", owner: "Kayıt Sahibi", modified: "Güncellendi" },
    en: { name: "Record", accounting_entry: "Accounting Entry", source_doctype: "Source DocType", source_name: "Source Record", mismatch_type: "Mismatch Type", difference_try: "Difference (TRY)", local_amount_try: "Local Amount (TRY)", external_amount_try: "External Amount (TRY)", resolution_action: "Resolution Action", resolved_by: "Resolved By", resolved_on: "Resolved On", unique_key: "Unique Key", notes: "Notes", details_json: "Details JSON", status: "Status", owner: "Owner", modified: "Modified" },
  },
};

function fieldLabel(field) {
  const localized = AUX_FIELD_LABELS[config.key]?.[activeLocale.value]?.[field] || AUX_FIELD_LABELS[config.key]?.en?.[field];
  return localized || humanizeField(field);
}

function optionLabel(fd, opt) {
  if (opt === "") return activeLocale.value === "tr" ? "Tümü" : "All";
  if (fd.field === "is_active") {
    if (String(opt) === "1") return activeLocale.value === "tr" ? "Aktif" : "Active";
    if (String(opt) === "0") return activeLocale.value === "tr" ? "Pasif" : "Inactive";
  }
  return translateFieldValue(opt);
}

function normalizeBoolStatus(v) {
  if (v === true || String(v) === "1") return "1";
  if (v === false || String(v) === "0") return "0";
  return String(v ?? "");
}

function statusValue(row, field, type) {
  const raw = row?.[field];
  if (type === "boolean_active") return normalizeBoolStatus(raw);
  return String(raw ?? "");
}

function isFieldType(field, typeName) {
  const list = config[`${typeName}Fields`] || [];
  return list.includes(field);
}

function formatField(value, field) {
  if (value == null || value === "") return "-";
  if (["strengths_json", "risks_json", "score_reason_json"].includes(field)) {
    return formatSignalSummary(value, field);
  }
  if (isFieldType(field, "bool")) {
    const active = value === true || String(value) === "1";
    return active ? (activeLocale.value === "tr" ? "Evet" : "Yes") : (activeLocale.value === "tr" ? "Hayır" : "No");
  }
  if (isFieldType(field, "currency")) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return new Intl.NumberFormat(localeCode.value, { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
  }
  if (isFieldType(field, "number")) {
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat(localeCode.value).format(n) : String(value);
  }
  if (isFieldType(field, "date")) {
    try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short" }).format(new Date(value)); } catch { return String(value); }
  }
  if (isFieldType(field, "dateTime")) {
    try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return String(value); }
  }
  if (["modified", "creation", "resolved_on", "sent_at", "next_retry_on", "last_attempt_on"].includes(field)) {
    try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
  }
  if (["due_date", "renewal_date", "policy_end_date"].includes(field)) {
    try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
  }
  if (["status", "entry_type", "source_doctype", "mismatch_type", "resolution_action"].includes(field)) {
    return translateFieldValue(value);
  }
  return String(value);
}

function parseSignalEntries(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      return parseSignalEntries(JSON.parse(value));
    } catch {
      return value
        .split(/\r?\n/)
        .map((entry) => entry.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
    }
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => `${humanizeField(key)}: ${entry}`)
      .filter(Boolean);
  }
  return [String(value)];
}

function formatSignalSummary(value, field) {
  const entries = parseSignalEntries(value);
  if (!entries.length) return "-";
  const first = entries[0];
  const count = entries.length;
  if (field === "score_reason_json") {
    return count > 1 ? `${first} (+${count - 1})` : first;
  }
  const prefix =
    field === "strengths_json"
      ? activeLocale.value === "tr" ? "Güçlü" : "Strengths"
      : activeLocale.value === "tr" ? "Risk" : "Risks";
  return `${prefix}: ${count}`;
}

function toCsvValue(value) {
  const normalized = value == null ? "" : String(value);
  if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }
  return normalized;
}

function exportSnapshotRows() {
  if (!canExportSnapshotRows.value) return;
  const columns = [
    ["customer", "Customer"],
    ["snapshot_date", "Snapshot Date"],
    ["segment", "Segment"],
    ["value_band", "Value Band"],
    ["claim_risk", "Claim Risk"],
    ["score", "Score"],
    ["source_version", "Source Version"],
    ["strengths_json", "Strength Summary"],
    ["risks_json", "Risk Summary"],
    ["score_reason_json", "Score Reason Summary"],
  ];
  const lines = [
    columns.map(([, label]) => toCsvValue(label)).join(","),
    ...snapshotRows.value.map((row) =>
      columns
        .map(([field]) => toCsvValue(formatField(row?.[field], field)))
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `customer-segment-snapshots-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadAuxExport(format) {
  const exportFields = Array.from(
    new Set([
      config.titleField,
      ...(config.listFields || []),
    ].filter(Boolean))
  );
  const columns = exportFields.map((field) => fieldLabel(field));
  const exportedRows = rows.value.map((row) =>
    Object.fromEntries(
      exportFields.map((field) => [fieldLabel(field), formatField(row?.[field], field)])
    )
  );
  openTabularExport({
    permissionDoctypes: [config.doctype],
    exportKey: `aux_${config.key}`,
    title: label("list"),
    columns,
    rows: exportedRows,
    filters: currentPresetPayload(),
    format,
  });
}

function factItems(row, fields) {
  return (fields || [])
    .filter((field) => row?.[field] !== undefined && row?.[field] !== null && row?.[field] !== "")
    .map((field) => ({ label: fieldLabel(field), value: formatField(row[field], field) }));
}

function rowTitle(row) {
  return String(row?.[config.titleField] || row?.name || "-");
}

function buildOrFilters() {
  const q = String(filters.query || "").trim();
  if (!q || !Array.isArray(config.searchFields) || !config.searchFields.length) return null;
  const like = `%${q}%`;
  return config.searchFields.map((f) => [config.doctype, f, "like", like]);
}

function buildFilters() {
  const out = {};
  const officeBranch = branchStore.requestBranch || "";
  if (officeBranch && OFFICE_BRANCH_FILTER_DOCTYPES.has(config.doctype)) {
    out.office_branch = officeBranch;
  }
  for (const fd of config.filterDefs || []) {
    const raw = draftToAppliedValue(filters[fd.key]);
    if (raw === "") continue;
    if (fd.mode === "like") out[fd.field] = ["like", `%${raw}%`];
    else if (fd.type === "number") out[fd.field] = Number(raw);
    else if (fd.type === "select" && fd.field === "is_active") out[fd.field] = Number(raw);
    else out[fd.field] = raw;
  }
  return out;
}

function buildOfficeBranchLookupFilters(doctype) {
  const officeBranch = branchStore.requestBranch || "";
  if (!officeBranch || !OFFICE_BRANCH_LOOKUP_DOCTYPES.has(String(doctype || "").trim())) {
    return {};
  }
  return { office_branch: officeBranch };
}

function draftToAppliedValue(v) {
  return v == null ? "" : String(v).trim();
}

function buildListParams() {
  return {
    doctype: config.doctype,
    fields: config.listFields,
    filters: buildFilters(),
    or_filters: buildOrFilters() || undefined,
    order_by: filters.sort || config.defaultSort || "modified desc",
    limit_start: (pagination.page - 1) * pagination.pageLength,
    limit_page_length: pagination.pageLength,
  };
}

function buildCountParams() {
  return {
    doctype: config.doctype,
    filters: buildFilters(),
    or_filters: buildOrFilters() || undefined,
  };
}

function setFilterStateFromPayload(payload = {}) {
  filters.query = String(payload.query || "");
  draft.query = filters.query;

  const sortValue = String(payload.sort || config.defaultSort || "modified desc");
  filters.sort = sortValue;
  draft.sort = sortValue;

  const pageLength = Number(payload.pageLength || 20) || 20;
  pagination.pageLength = pageLength;
  draft.pageLength = pageLength;

  for (const fd of config.filterDefs || []) {
    const nextValue = payload[fd.key];
    const normalized =
      fd.type === "number" && nextValue !== "" && nextValue != null
        ? String(nextValue)
        : nextValue == null
          ? ""
          : String(nextValue);
    filters[fd.key] = normalized;
    draft[fd.key] = normalized;
  }
}

function syncRouteFilters({ refresh = true } = {}) {
  const payload = currentPresetPayload();
  let changed = false;

  if (route.query.query != null) {
    const queryValue = String(route.query.query || "").trim();
    if (payload.query !== queryValue) {
      payload.query = queryValue;
      changed = true;
    }
  }

  for (const fd of config.filterDefs || []) {
    if (route.query[fd.key] == null) continue;
    const nextValue = String(route.query[fd.key] || "").trim();
    if (String(payload[fd.key] || "") !== nextValue) {
      payload[fd.key] = nextValue;
      changed = true;
    }
  }

  if (!changed) return;
  setFilterStateFromPayload(payload);
  pagination.page = 1;
  if (refresh) refreshList();
}

async function refreshList() {
  loadError.text = "";
  const listParams = buildListParams();
  const countParams = buildCountParams();
  const [rowsResult, countResult] = await Promise.allSettled([
    listResource.reload(listParams),
    countResource.reload(countParams),
  ]);
  if (rowsResult.status === "fulfilled") {
    const payload = rowsResult.value?.message ?? rowsResult.value;
    listResource.setData(Array.isArray(payload) ? payload : []);
  } else {
    listResource.setData([]);
    loadError.text = rowsResult.reason?.messages?.[0] || rowsResult.reason?.message || String(rowsResult.reason || "");
  }
  if (countResult.status === "fulfilled") {
    const c = Number(countResult.value?.message ?? countResult.value ?? 0);
    pagination.total = Number.isFinite(c) ? c : rows.value.length;
  } else {
    pagination.total = rows.value.length;
  }
}

function applyFilters() {
  filters.query = draft.query || "";
  filters.sort = draft.sort || config.defaultSort || "modified desc";
  pagination.pageLength = Number(draft.pageLength || 20);
  for (const fd of config.filterDefs || []) filters[fd.key] = draft[fd.key] || "";
  pagination.page = 1;
  refreshList();
}

function resetFilters() {
  presetKey.value = "default";
  writeFilterPresetKey(PRESET_STORAGE_KEY, "default");
  setFilterStateFromPayload({});
  pagination.page = 1;
  void persistPresetStateToServer();
  refreshList();
}

function previousPage() {
  if (pagination.page <= 1) return;
  pagination.page -= 1;
  refreshList();
}
function nextPage() {
  if (!hasNextPage.value) return;
  pagination.page += 1;
  refreshList();
}

async function ensureAuxQuickOptionSources() {
  const registryKey = auxQuickCreate.value?.registryKey;
  if (!registryKey) return;
  auxQuickCustomerResource.params = {
    ...auxQuickCustomerResource.params,
    filters: buildOfficeBranchLookupFilters("AT Customer"),
  };
  auxQuickPolicyResource.params = {
    ...auxQuickPolicyResource.params,
    filters: buildOfficeBranchLookupFilters("AT Policy"),
  };
  auxQuickAccountingEntryResource.params = {
    ...auxQuickAccountingEntryResource.params,
    filters: buildOfficeBranchLookupFilters("AT Accounting Entry"),
  };
  if (["renewal_task", "notification_draft", "communication_message", "accounting_entry"].includes(registryKey)) {
    await Promise.allSettled([auxQuickCustomerResource.reload(), auxQuickPolicyResource.reload()]);
  }
  if (["notification_draft", "communication_message"].includes(registryKey)) {
    await auxQuickTemplateResource.reload().catch(() => {});
  }
  if (["branch_master", "accounting_entry"].includes(registryKey)) {
    await auxQuickInsuranceCompanyResource.reload().catch(() => {});
  }
  if (["sales_entity_master", "accounting_entry"].includes(registryKey)) {
    await auxQuickSalesEntityResource.reload().catch(() => {});
  }
  if (["reconciliation_item"].includes(registryKey)) {
    await auxQuickAccountingEntryResource.reload().catch(() => {});
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

async function prepareAuxQuickCreateDialog({ form }) {
  await ensureAuxQuickOptionSources();
  if (auxQuickCreate.value?.registryKey === "renewal_task") {
    if (!form.renewal_date) form.renewal_date = addDaysIso(30);
    if (!form.due_date) form.due_date = addDaysIso(15);
  }
  if (auxQuickCreate.value?.registryKey === "notification_draft") {
    if (!form.language) form.language = "tr";
    if (!form.status) form.status = "Draft";
  }
}

async function handleAuxQuickCreateAfterSubmit({ recordName, openAfter }) {
  if (!openAfter || !recordName) return;
  const registryCfg = getQuickCreateConfig(auxQuickCreate.value?.registryKey || "");
  if (registryCfg?.openRouteName) return;
  await router.push({ name: `${config.key}-detail`, params: { name: recordName } }).catch(() => {});
}

async function runRowQuickAction(rowName, resource, payloadBuilder) {
  if (!rowName || !resource || typeof payloadBuilder !== "function") return;
  if (rowActionBusyName.value) return;
  rowActionBusyName.value = rowName;
  try {
    await resource.submit(payloadBuilder(rowName));
    await refreshList();
  } finally {
    rowActionBusyName.value = "";
  }
}

function canSendDraftNowRow(row) {
  return (
    config.key === "notification-drafts" &&
    authStore.can(["actions", "communication", "sendDraftNow"]) &&
    row?.name &&
    row?.status !== "Sent"
  );
}
function canRetryOutboxRow(row) {
  return (
    config.key === "notification-outbox" &&
    authStore.can(["actions", "communication", "retryOutbox"]) &&
    row?.name &&
    ["Failed", "Dead"].includes(String(row.status || ""))
  );
}
function canRequeueOutboxRow(row) {
  return (
    config.key === "notification-outbox" &&
    authStore.can(["actions", "communication", "requeueOutbox"]) &&
    row?.name &&
    ["Queued", "Processing"].includes(String(row.status || ""))
  );
}
function canOpenCommunicationContextRow(row) {
  return ["notification-drafts", "notification-outbox", "reminders", "tasks", "ownership-assignments"].includes(config.key) && row?.name;
}
function canStartTaskRow(row) {
  return config.key === "tasks" && row?.name && String(row.status || "") === "Open";
}
function canBlockTaskRow(row) {
  return config.key === "tasks" && row?.name && ["Open", "In Progress"].includes(String(row.status || ""));
}
function canCompleteTaskRow(row) {
  return config.key === "tasks" && row?.name && ["Open", "In Progress", "Blocked"].includes(String(row.status || ""));
}
function canCancelTaskRow(row) {
  return config.key === "tasks" && row?.name && ["Open", "In Progress", "Blocked"].includes(String(row.status || ""));
}
function canCompleteReminderRow(row) {
  return config.key === "reminders" && row?.name && String(row.status || "") === "Open";
}
function canCancelReminderRow(row) {
  return config.key === "reminders" && row?.name && String(row.status || "") === "Open";
}
function canStartOwnershipAssignmentRow(row) {
  return config.key === "ownership-assignments" && row?.name && String(row.status || "") === "Open";
}
function canBlockOwnershipAssignmentRow(row) {
  return config.key === "ownership-assignments" && row?.name && ["Open", "In Progress"].includes(String(row.status || ""));
}
function canCompleteOwnershipAssignmentRow(row) {
  return config.key === "ownership-assignments" && row?.name && ["Open", "In Progress", "Blocked"].includes(String(row.status || ""));
}
async function sendDraftNowRow(row) {
  if (!authStore.can(["actions", "communication", "sendDraftNow"])) return;
  await runRowQuickAction(row?.name, sendDraftNowRowResource, (name) => ({ draft_name: name }));
}
async function retryOutboxRow(row) {
  if (!authStore.can(["actions", "communication", "retryOutbox"])) return;
  await runRowQuickAction(row?.name, retryOutboxRowResource, (name) => ({ outbox_name: name }));
}
async function requeueOutboxRow(row) {
  if (!authStore.can(["actions", "communication", "requeueOutbox"])) return;
  await runRowQuickAction(row?.name, requeueOutboxRowResource, (name) => ({ outbox_name: name }));
}
function openCommunicationContextRow(row) {
  if (!canOpenCommunicationContextRow(row)) return;
  router.push({
    name: "communication-center",
    query: {
      reference_doctype: config.doctype,
      reference_name: row.name,
      reference_label: row.event_key || row.name,
      return_to: route.fullPath || route.path,
    },
  });
}
async function startTaskRow(row) {
  await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
    doctype: "AT Task",
    name,
    data: { status: "In Progress" },
  }));
}
async function blockTaskRow(row) {
  await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
    doctype: "AT Task",
    name,
    data: { status: "Blocked" },
  }));
}
async function completeTaskRow(row) {
  await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
    doctype: "AT Task",
    name,
    data: { status: "Done" },
  }));
}
async function cancelTaskRow(row) {
  await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
    doctype: "AT Task",
    name,
    data: { status: "Cancelled" },
  }));
}
async function completeReminderRow(row) {
  await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
    doctype: "AT Reminder",
    name,
    data: { status: "Done" },
  }));
}
async function cancelReminderRow(row) {
  await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
    doctype: "AT Reminder",
    name,
    data: { status: "Cancelled" },
  }));
}
async function startOwnershipAssignmentRow(row) {
  await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
    doctype: "AT Ownership Assignment",
    name,
    data: { status: "In Progress" },
  }));
}
async function blockOwnershipAssignmentRow(row) {
  await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
    doctype: "AT Ownership Assignment",
    name,
    data: { status: "Blocked" },
  }));
}
async function completeOwnershipAssignmentRow(row) {
  await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
    doctype: "AT Ownership Assignment",
    name,
    data: { status: "Done" },
  }));
}

function openDetail(row) {
  router.push({ name: `${config.key}-detail`, params: { name: row.name } });
}
function panelCfg(row) {
  if (!config.panelRef) return null;
  return getSourcePanelConfig(row?.[config.panelRef.doctypeField], row?.[config.panelRef.nameField]);
}
function panelCfgForRow(row) {
  if (config.key === "access-logs") {
    return getSourcePanelConfig(row?.reference_doctype, row?.reference_name);
  }
  return panelCfg(row);
}
function openPanel(row) {
  const cfg = panelCfgForRow(row);
  if (!cfg?.url) return;
  navigateToSameOriginPath(cfg.url);
}

function runToolbarAction(action) {
  if (!action || typeof action !== "object") return;
  if (action.capabilityPath && !authStore.can(action.capabilityPath)) return;

  if (action.type === "route" || action.routeName) {
    router.push({
      name: action.routeName,
      params: action.params || undefined,
      query: action.query || undefined,
    }).catch(() => {});
    return;
  }

  if (typeof action.href === "string" && action.href.trim()) {
    navigateToSameOriginPath(action.href);
  }
}

function currentPresetPayload() {
  const payload = {
    query: filters.query,
    sort: filters.sort,
    pageLength: pagination.pageLength,
  };
  for (const fd of config.filterDefs || []) {
    payload[fd.key] = filters[fd.key] ?? "";
  }
  return payload;
}

function applyPreset(key, { refresh = true } = {}) {
  const requested = String(key || "default");

  if (isCustomFilterPresetValue(requested)) {
    const customId = extractCustomFilterPresetId(requested);
    const presetRow = customPresets.value.find((item) => item.id === customId);
    if (!presetRow) {
      applyPreset("default", { refresh });
      return;
    }
    presetKey.value = requested;
    writeFilterPresetKey(PRESET_STORAGE_KEY, requested);
    setFilterStateFromPayload(presetRow.payload || {});
    pagination.page = 1;
    if (refresh) refreshList();
    return;
  }

  presetKey.value = "default";
  writeFilterPresetKey(PRESET_STORAGE_KEY, requested);
  const builtInPreset = (config.presetDefs || []).find((item) => item.key === requested);
  presetKey.value = requested;
  setFilterStateFromPayload(builtInPreset?.payload || {});
  pagination.page = 1;
  if (refresh) refreshList();
}

function onPresetChange() {
  applyPreset(presetKey.value, { refresh: true });
  void persistPresetStateToServer();
}

function onPresetModelValue(value) {
  presetKey.value = String(value || "default");
}

function savePreset() {
  const currentCustomId = extractCustomFilterPresetId(presetKey.value);
  const currentCustom = currentCustomId ? customPresets.value.find((item) => item.id === currentCustomId) : null;
  const initialName = currentCustom?.label || "";
  const name = String(window.prompt(t("savePresetPrompt"), initialName) || "").trim();
  if (!name) return;

  const existing = customPresets.value.find((item) => item.label.toLowerCase() === name.toLowerCase());
  const targetId = currentCustomId || existing?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const nextList = customPresets.value.filter((item) => item.id !== targetId);
  nextList.push({ id: targetId, label: name, payload: currentPresetPayload() });
  customPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, localeCode.value));
  writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
  presetKey.value = makeCustomFilterPresetValue(targetId);
  writeFilterPresetKey(PRESET_STORAGE_KEY, presetKey.value);
  void persistPresetStateToServer();
}

function deletePreset() {
  if (!canDeletePreset.value) return;
  if (!window.confirm(t("deletePresetConfirm"))) return;
  const customId = extractCustomFilterPresetId(presetKey.value);
  if (!customId) return;
  customPresets.value = customPresets.value.filter((item) => item.id !== customId);
  writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
  applyPreset("default", { refresh: true });
  void persistPresetStateToServer();
}

function hasMeaningfulPresetState(selectedKey, presets) {
  return String(selectedKey || "default") !== "default" || (Array.isArray(presets) && presets.length > 0);
}

async function persistPresetStateToServer() {
  try {
    await presetServerWriteResource.submit({
      screen: config.key,
      selected_key: presetKey.value,
      custom_presets: customPresets.value,
    });
  } catch {
    // local fallback
  }
}

async function hydratePresetStateFromServer() {
  try {
    const remote = await presetServerReadResource.reload({ screen: config.key });
    const remoteSelectedKey = String(remote?.selected_key || "default");
    const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];

    const localHasState = hasMeaningfulPresetState(presetKey.value, customPresets.value);
    const remoteHasState = hasMeaningfulPresetState(remoteSelectedKey, remoteCustomPresets);
    if (!remoteHasState) {
      if (localHasState) void persistPresetStateToServer();
      return;
    }

    const localSnapshot = JSON.stringify({ selected_key: presetKey.value, custom_presets: customPresets.value });
    const remoteSnapshot = JSON.stringify({ selected_key: remoteSelectedKey, custom_presets: remoteCustomPresets });
    if (localSnapshot === remoteSnapshot) return;

    customPresets.value = remoteCustomPresets;
    writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
    applyPreset(remoteSelectedKey, { refresh: true });
  } catch {
    // local fallback
  }
}

onMounted(() => {
  applyPreset(presetKey.value, { refresh: false });
  syncRouteFilters({ refresh: false });
  refreshList();
  void hydratePresetStateFromServer();
});

watch(
  () => route.query,
  () => {
    syncRouteFilters();
  },
  { deep: true }
);

watch(
  () => branchStore.selected,
  () => {
    pagination.page = 1;
    void refreshList();
  }
);
</script>
