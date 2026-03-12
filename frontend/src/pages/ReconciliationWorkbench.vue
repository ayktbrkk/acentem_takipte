<template>
  <section class="space-y-4">
    <article class="surface-card rounded-2xl p-5">
      <PageToolbar
        :title="t('title')"
        :subtitle="t('subtitle')"
        :show-refresh="true"
        :busy="workbenchResource.loading || syncing || reconciling"
        :refresh-label="t('refresh')"
        @refresh="reloadWorkbench"
      >
        <template #actions>
          <ActionButton variant="secondary" size="sm" @click="openImportDialog">
            {{ t("importStatement") }}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" :disabled="bulkActionLoading || openRowCount === 0" @click="runBulkResolution('Matched')">
            {{ bulkActionLoading ? t("bulkResolving") : t("bulkResolve") }}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" :disabled="bulkActionLoading || openRowCount === 0" @click="runBulkResolution('Ignored')">
            {{ bulkActionLoading ? t("bulkIgnoring") : t("bulkIgnore") }}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" :disabled="syncing" @click="runSync">
            {{ syncing ? t("syncing") : t("sync") }}
          </ActionButton>
          <ActionButton variant="primary" size="sm" :disabled="reconciling" @click="runReconciliation">
            {{ reconciling ? t("reconciling") : t("reconcile") }}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" @click="reloadWorkbench">
            {{ t("refresh") }}
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="sm"
            :disabled="workbenchResource.loading"
            @click="downloadReconciliationExport('xlsx')"
          >
            {{ t("exportXlsx") }}
          </ActionButton>
          <ActionButton
            variant="primary"
            size="sm"
            :disabled="workbenchResource.loading"
            @click="downloadReconciliationExport('pdf')"
          >
            {{ t("exportPdf") }}
          </ActionButton>
        </template>
        <template #filters>
          <WorkbenchFilterToolbar
            v-model="presetKey"
            :advanced-label="t('advancedFilters')"
            :collapse-label="t('hideAdvancedFilters')"
            :active-count="activeFilterCount"
            :active-count-label="t('activeFilters')"
            :preset-label="t('presetLabel')"
            :preset-options="presetOptions"
            :can-delete-preset="canDeletePreset"
            :save-label="t('savePreset')"
            :delete-label="t('deletePreset')"
            :apply-label="t('applyFilters')"
            :reset-label="t('clearFilters')"
            @preset-change="onPresetChange"
            @preset-save="savePreset"
            @preset-delete="deletePreset"
            @apply="applyWorkbenchFilters"
            @reset="resetWorkbenchFilters"
          >
            <select v-model="filters.status" class="input">
              <option value="Open">{{ t("statusOpen") }}</option>
              <option value="Resolved">{{ t("statusResolved") }}</option>
              <option value="Ignored">{{ t("statusIgnored") }}</option>
              <option value="">{{ t("allStatuses") }}</option>
            </select>
            <select v-model="filters.mismatchType" class="input">
              <option value="">{{ t("allTypes") }}</option>
              <option v-for="option in mismatchOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <template #advanced>
              <input
                v-model.trim="filters.sourceQuery"
                class="input"
                type="search"
                :placeholder="t('sourceSearchPlaceholder')"
                @keyup.enter="applyWorkbenchFilters"
              />
              <select v-model="filters.sourceDoctype" class="input">
                <option value="">{{ t("allSources") }}</option>
                <option v-for="option in sourceDoctypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <select v-model.number="filters.limit" class="input">
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </template>
          </WorkbenchFilterToolbar>
        </template>
      </PageToolbar>
    </article>

    <div v-if="operationError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ operationError }}
    </div>

    <Dialog v-model="showImportDialog" :options="{ title: t('importStatementTitle'), size: 'xl' }">
      <template #body-content>
        <QuickCreateDialogShell
          :error="importError"
          :subtitle="t('importStatementSubtitle')"
          :loading="importLoading"
          :show-save-and-open="false"
          :labels="importDialogLabels"
          @cancel="closeImportDialog"
          @save="previewStatementImport"
        >
          <div class="space-y-3">
            <textarea
              v-model="statementImportCsv"
              class="input min-h-[180px] font-mono text-xs"
              :placeholder="t('importStatementPlaceholder')"
              :disabled="importLoading"
            />
            <div class="grid gap-3 md:grid-cols-3">
              <input v-model.trim="statementImportInsuranceCompany" class="input" type="text" :placeholder="t('insuranceCompany')" />
              <input v-model.trim="statementImportDelimiter" class="input" type="text" maxlength="1" :placeholder="t('delimiter')" />
              <input v-model.number="statementImportLimit" class="input" type="number" min="1" max="500" />
            </div>
            <div v-if="statementImportSummary.total_rows" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article class="at-metric-card">
                <p class="at-metric-label">{{ t("importTotalRows") }}</p>
                <p class="at-metric-value">{{ statementImportSummary.total_rows || 0 }}</p>
              </article>
              <article class="at-metric-card">
                <p class="at-metric-label">{{ t("importMatchedRows") }}</p>
                <p class="at-metric-value !text-emerald-700">{{ statementImportSummary.matched_rows || 0 }}</p>
              </article>
              <article class="at-metric-card">
                <p class="at-metric-label">{{ t("importUnmatchedRows") }}</p>
                <p class="at-metric-value !text-amber-700">{{ statementImportSummary.unmatched_rows || 0 }}</p>
              </article>
              <article class="at-metric-card">
                <p class="at-metric-label">{{ t("importAmount") }}</p>
                <p class="at-metric-value !text-sky-700">{{ formatMoney(statementImportSummary.total_amount_try || 0) }}</p>
              </article>
            </div>
            <div v-if="statementImportRows.length" class="flex justify-end">
              <ActionButton variant="primary" size="sm" :disabled="importLoading" @click="importStatementPreviewRows">
                {{ importLoading ? t("importingStatement") : t("importStatementRows") }}
              </ActionButton>
            </div>
            <div v-if="statementImportRows.length" class="rounded-xl border border-slate-200 bg-white">
              <div class="grid grid-cols-5 gap-2 border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>{{ t("externalRef") }}</span>
                <span>{{ t("policy") }}</span>
                <span>{{ t("payment") }}</span>
                <span>{{ t("metricOverdueAmount") }}</span>
                <span>{{ t("status") }}</span>
              </div>
              <div
                v-for="row in statementImportRows"
                :key="`${row.external_ref}-${row.policy_no}-${row.payment_no}`"
                class="grid grid-cols-5 gap-2 px-3 py-2 text-sm text-slate-700"
              >
                <span>{{ row.external_ref || "-" }}</span>
                <span>{{ row.policy_no || "-" }}</span>
                <span>{{ row.payment_no || "-" }}</span>
                <span>{{ formatMoney(row.amount_try || 0) }}</span>
                <span :class="row.match_status === 'Matched' ? 'text-emerald-700' : 'text-amber-700'">{{ row.match_status || "-" }}</span>
              </div>
            </div>
          </div>
        </QuickCreateDialogShell>
      </template>
    </Dialog>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricOpen") }}</p>
        <p class="at-metric-value !text-amber-700">{{ metrics.open || 0 }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricResolved") }}</p>
        <p class="at-metric-value !text-emerald-700">{{ metrics.resolved || 0 }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricIgnored") }}</p>
        <p class="at-metric-value">{{ metrics.ignored || 0 }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricFailed") }}</p>
        <p class="at-metric-value !text-rose-700">{{ metrics.failed_entries || 0 }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricOverdueCollections") }}</p>
        <p class="at-metric-value !text-amber-700">{{ metrics.overdue_collections || 0 }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricOverdueAmount") }}</p>
        <p class="at-metric-value !text-rose-700">{{ formatMoney(metrics.overdue_amount_try || 0) }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricCommissionAçcrual") }}</p>
        <p class="at-metric-value !text-sky-700">{{ metrics.commission_accrual_count || 0 }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricCommissionAçcrualAmount") }}</p>
        <p class="at-metric-value !text-emerald-700">{{ formatMoney(metrics.commission_accrual_amount_try || 0) }}</p>
      </article>
    </div>

    <article class="surface-card rounded-2xl p-5">
      <SectionCardHeader :title="t('collectionPreviewTitle')" :count="collectionPreviewRows.length" />
      <div v-if="workbenchResource.loading" class="text-sm text-slate-500">{{ t("loading") }}</div>
      <div v-else-if="collectionPreviewRows.length === 0" class="at-empty-block">{{ t("emptyCollectionPreview") }}</div>
      <ul v-else class="space-y-2 text-sm">
        <MetaListCard
          v-for="row in collectionPreviewRows"
          :key="row.name"
          :title="row.payment_no || row.name"
          :description="`${row.customer || '-'} / ${row.policy || '-'}`"
          :meta="formatMoney(row.amount_try || row.amount)"
        >
          <template #trailing>
            <div class="text-right">
              <p class="text-xs text-slate-500">{{ t("dueDate") }}: {{ row.due_date || "-" }}</p>
              <p class="text-xs text-amber-700">{{ row.status || "-" }}</p>
            </div>
          </template>
        </MetaListCard>
      </ul>
    </article>

    <article class="surface-card rounded-2xl p-5">
      <SectionCardHeader :title="t('commissionPreviewTitle')" :count="commissionPreviewRows.length" />
      <div v-if="workbenchResource.loading" class="text-sm text-slate-500">{{ t("loading") }}</div>
      <div v-else-if="commissionPreviewRows.length === 0" class="at-empty-block">{{ t("emptyCommissionPreview") }}</div>
      <ul v-else class="space-y-2 text-sm">
        <MetaListCard
          v-for="row in commissionPreviewRows"
          :key="row.name"
          :title="row.policy_no || row.name"
          :description="`${row.customer || '-'} / ${row.insurance_company || '-'}`"
          :meta="formatMoney(row.commission_amount_try || row.commission_amount)"
        >
          <template #trailing>
            <div class="text-right">
              <p class="text-xs text-slate-500">{{ row.office_branch || "-" }}</p>
              <p class="text-xs text-sky-700">{{ row.status || "-" }}</p>
            </div>
          </template>
        </MetaListCard>
      </ul>
    </article>

    <DataTableShell
      :loading="workbenchResource.loading"
      :error="workbenchErrorText"
      :empty="rows.length === 0"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty-title="t('emptyTitle')"
      :empty-description="t('empty')"
    >
      <template #default>
        <div class="overflow-auto">
        <table class="at-table">
          <thead>
            <tr class="at-table-head-row">
              <th class="at-table-head-cell">{{ t("source") }}</th>
              <th class="at-table-head-cell">{{ t("type") }}</th>
              <th class="at-table-head-cell">{{ t("status") }}</th>
              <th class="at-table-head-cell">{{ t("localTry") }}</th>
              <th class="at-table-head-cell">{{ t("externalTry") }}</th>
              <th class="at-table-head-cell">{{ t("difference") }}</th>
              <th class="at-table-head-cell">{{ t("actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.name" class="at-table-row">
              <td class="at-table-cell">
                <TableEntityCell
                  :title="`${row.source_doctype} / ${row.source_name}`"
                  :facts="sourceRowFacts(row)"
                >
                  <InlineActionRow v-if="canOpenSourcePanel(row)">
                    <ActionButton variant="link" size="xs" trailing-icon=">" @click="openSourcePanel(row)">
                      {{ sourcePanelLabel(row) }}
                    </ActionButton>
                  </InlineActionRow>
                </TableEntityCell>
              </td>
              <TableFactsCell :items="mismatchTypeFacts(row)" />
              <td class="at-table-cell">
                <StatusBadge type="reconciliation" :status="row.status" />
              </td>
              <td class="at-table-cell">
                <FormattedCurrencyValue :value="row.local_amount_try" :locale="localeCode" :maximum-fraction-digits="2" />
              </td>
              <td class="at-table-cell">
                <FormattedCurrencyValue :value="row.external_amount_try" :locale="localeCode" :maximum-fraction-digits="2" />
              </td>
              <td class="at-table-cell">
                <FormattedCurrencyValue :value="row.difference_try" :locale="localeCode" :maximum-fraction-digits="2" />
              </td>
              <td class="at-table-cell">
                <InlineActionRow>
                  <ActionButton v-if="row.status === 'Open'" variant="secondary" size="xs" @click="openReconciliationActionDialog(row, 'Matched')">
                    {{ t("resolve") }}
                  </ActionButton>
                  <ActionButton v-if="row.status === 'Open'" variant="secondary" size="xs" @click="openReconciliationActionDialog(row, 'Ignored')">
                    {{ t("ignore") }}
                  </ActionButton>
                  <ActionButton variant="secondary" size="xs" @click="openReconciliationActionDialog(row, 'Note')">
                    {{ t("addNote") }}
                  </ActionButton>
                </InlineActionRow>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </template>
    </DataTableShell>

    <Dialog v-model="showActionDialog" :options="{ title: reconciliationActionDialogTitle, size: 'lg' }">
      <template #body-content>
        <QuickCreateDialogShell
          :error="actionDialogError"
          :subtitle="reconciliationActionDialogSubtitle"
          :loading="actionDialogLoading"
          :show-save-and-open="false"
          :labels="actionDialogLabels"
          @cancel="closeReconciliationActionDialog"
          @save="submitReconciliationActionDialog"
        >
          <div class="space-y-3">
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p class="font-medium text-slate-700">
                {{ actionDialogRow?.source_doctype || "-" }} / {{ actionDialogRow?.source_name || "-" }}
              </p>
              <p class="mt-1">
                {{ t("difference") }}:
                {{ formatMoney(actionDialogRow?.difference_try) }}
              </p>
              <p v-if="actionDialogRow?.notes" class="mt-1">
                {{ t("currentNote") }}: {{ actionDialogRow.notes }}
              </p>
            </div>
            <label class="block text-xs font-medium uppercase tracking-wide text-slate-500">
              {{ t("noteLabel") }}
            </label>
            <textarea
              v-model="actionDialogNotes"
              class="input min-h-[120px]"
              :placeholder="t('notePlaceholder')"
              :disabled="actionDialogLoading"
            />
          </div>
        </QuickCreateDialogShell>
      </template>
    </Dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, unref, watch } from "vue";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useAccountingStore } from "../stores/accounting";
import { navigateToSameOriginPath } from "../utils/safeNavigation";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import FormattedCurrencyValue from "../components/app-shell/FormattedCurrencyValue.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateDialogShell from "../components/app-shell/QuickCreateDialogShell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import StatusBadge from "../components/StatusBadge.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { mutedFact, subtleFact } from "../utils/factItems";
import { getSourcePanelConfig } from "../utils/sourcePanel";
import { openTabularExport } from "../utils/listExport";

const copy = {
  tr: {
    title: "Mutabakat Masasi",
    subtitle: "Muhasebe uyumsuzluklarını izleyin, eşleştirin ve kapatın",
    importStatement: "Ekstre Ice Aktar",
    importStatementTitle: "Ekstre Ice Aktarma Önizlemesi",
    importStatementSubtitle: "CSV icerigini yapistir, policy veya payment eslesmelerini onizle.",
    importStatementPlaceholder: "external_ref,policy_no,payment_no,customer,amount_try",
    importStatementRows: "Eşleşenleri Ice Aktar",
    importingStatement: "Ice Aktariliyor...",
    importTotalRows: "Toplam Satir",
    importMatchedRows: "Eşleşen",
    importUnmatchedRows: "Eslesmeyen",
    importAmount: "Toplam Tutar",
    insuranceCompany: "Sigorta Şirketi",
    delimiter: "Ayirac",
    policy: "Poliçe",
    payment: "Ödeme",
    sync: "Sync Çalıştır",
    syncing: "Sync...",
    bulkResolve: "Açıkları Toplu Çöz",
    bulkResolving: "Toplu Çözülüyor...",
    bulkIgnore: "Açıkları Toplu Yoksay",
    bulkIgnoring: "Toplu Yoksayılıyor...",
    bulkResolveConfirm: "Görünen açık mutabakat kayıtları çözülmüş olarak işaretlensin mi?",
    bulkIgnoreConfirm: "Görünen açık mutabakat kayıtları yoksayılsın mı?",
    reconcile: "Mutabakat Çalıştır",
    reconciling: "Çalışıyor...",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    statusOpen: "Açık",
    statusResolved: "Çözüldü",
    statusIgnored: "Yoksayıldı",
    allStatuses: "Tüm durumlar",
    allTypes: "Tüm uyumsuzluk tipleri",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    presetDefault: "Standart",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    sourceSearchPlaceholder: "Kaynak kayıt / ref ara",
    allSources: "Tüm kaynak tipleri",
    metricOpen: "Açık Fark",
    metricResolved: "Çözülen",
    metricIgnored: "Yoksayılan",
    metricFailed: "Başarısız Kayıt",
    metricOverdueCollections: "Geciken Tahsilat",
    metricOverdueAmount: "Geciken Tutar",
    metricCommissionAçcrual: "Komisyon Tahakkuk",
    metricCommissionAçcrualAmount: "Tahakkuk Tutarı",
    collectionPreviewTitle: "Geciken Tahsilat Önizleme",
    emptyCollectionPreview: "Geciken tahsilat kaydı bulunamadı.",
    commissionPreviewTitle: "Komisyon Tahakkuk Önizleme",
    emptyCommissionPreview: "Komisyon tahakkuk kaydı bulunamadı.",
    loading: "Yükleniyor...",
    loadErrorTitle: "Mutabakat Verileri Yüklenemedi",
    loadError: "Mutabakat masası verileri yüklenirken bir hata oluştu.",
    permissionDeniedRead: "Mutabakat verilerini görmek için yetkiniz yok.",
    permissionDeniedAction: "Bu mutabakat islemini yapmaya yetkiniz yok.",
    emptyTitle: "Mutabakat Kaydı Yok",
    empty: "Gösterilecek mutabakat kaydı bulunamadı.",
    source: "Kaynak",
    type: "Uyumsuzluk",
    status: "Durum",
    dueDate: "Vade",
    localTry: "Yerel TRY",
    externalTry: "Harici TRY",
    difference: "Fark",
    accountingEntry: "Muhasebe Kaydı",
    resolution: "Çözüm",
    actions: "Aksiyon",
    resolve: "Çöz",
    ignore: "Yoksay",
    addNote: "Açıklama",
    open: "Aç",
    noteLabel: "Açıklama",
    notePlaceholder: "Mutabakat notu / açıklama girin",
    currentNote: "Mevcut Not",
    actionNoteTitle: "Mutabakat Açıklamasi",
    actionResolveTitle: "Mutabakat Çöz",
    actionIgnoreTitle: "Mutabakat Yoksay",
    actionNoteSubtitle: "Kayıt için açıklama notu güncelle",
    actionResolveSubtitle: "Kaydı not ile birlikte çözülmüş olarak işaretle",
    actionIgnoreSubtitle: "Kaydı not ile birlikte yoksayılmış olarak işaretle",
    actionSaveNote: "Açıklamayi Kaydet",
    actionSaveResolve: "Çöz ve Kaydet",
    actionSaveIgnore: "Yoksay ve Kaydet",
    actionFailed: "Mutabakat aksiyonu tamamlanamadı.",
    openPanel: "Panel",
    openPolicyPanel: "Poliçeyi Aç",
    openCustomerPanel: "Müşteriyi Aç",
    openOffersPanel: "Teklif Panosu",
    openClaimsPanel: "Hasar Panosu",
    openPaymentsPanel: "Ödeme Panosu",
    openRenewalsPanel: "Yenileme Panosu",
    openReconciliationPanel: "Mutabakat Panosu",
    openCommunicationPanel: "İletişim Kaydı",
    openMasterDataPanel: "Ana Veri Kaydı",
    externalRef: "Harici Ref",
    mismatchAmount: "Tutar",
    mismatchCurrency: "Para Birimi",
    mismatchMissingExternal: "Harici Kayıt Eksik",
    mismatchMissingLocal: "Yerel Kayıt Eksik",
    mismatchStatus: "Durum Uyumsuzlugu",
    mismatchOther: "Diğer",
  },
  en: {
    title: "Reconciliation Workbench",
    subtitle: "Track, match and close accounting mismatches",
    importStatement: "Import Statement",
    importStatementTitle: "Statement Import Preview",
    importStatementSubtitle: "Paste CSV content and preview policy or payment matches.",
    importStatementPlaceholder: "external_ref,policy_no,payment_no,customer,amount_try",
    importStatementRows: "Import Matched Rows",
    importingStatement: "Importing...",
    importTotalRows: "Total Rows",
    importMatchedRows: "Matched",
    importUnmatchedRows: "Unmatched",
    importAmount: "Total Amount",
    insuranceCompany: "Insurance Company",
    delimiter: "Delimiter",
    policy: "Policy",
    payment: "Payment",
    sync: "Run Sync",
    syncing: "Syncing...",
    bulkResolve: "Resolve Visible Open Items",
    bulkResolving: "Resolving...",
    bulkIgnore: "Ignore Visible Open Items",
    bulkIgnoring: "Ignoring...",
    bulkResolveConfirm: "Mark visible open reconciliation rows as resolved?",
    bulkIgnoreConfirm: "Ignore visible open reconciliation rows?",
    reconcile: "Run Reconciliation",
    reconciling: "Running...",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    statusOpen: "Open",
    statusResolved: "Resolved",
    statusIgnored: "Ignored",
    allStatuses: "All statuses",
    allTypes: "All mismatch types",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    presetLabel: "Filter Preset",
    presetDefault: "Standard",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    sourceSearchPlaceholder: "Search source record / external ref",
    allSources: "All source types",
    metricOpen: "Open Items",
    metricResolved: "Resolved",
    metricIgnored: "Ignored",
    metricFailed: "Failed Entries",
    metricOverdueCollections: "Overdue Collections",
    metricOverdueAmount: "Overdue Amount",
    metricCommissionAçcrual: "Commission Açcruals",
    metricCommissionAçcrualAmount: "Açcrual Amount",
    collectionPreviewTitle: "Overdue Collection Preview",
    emptyCollectionPreview: "No overdue collection found.",
    commissionPreviewTitle: "Commission Açcrual Preview",
    emptyCommissionPreview: "No commission accrual found.",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Reconciliation Data",
    loadError: "An error occurred while loading reconciliation workbench data.",
    permissionDeniedRead: "You do not have permission to view reconciliation data.",
    permissionDeniedAction: "You do not have permission to perform this reconciliation action.",
    emptyTitle: "No Reconciliation Rows",
    empty: "No reconciliation rows found.",
    source: "Source",
    type: "Mismatch",
    status: "Status",
    dueDate: "Due Date",
    localTry: "Local TRY",
    externalTry: "External TRY",
    difference: "Difference",
    accountingEntry: "Accounting Entry",
    resolution: "Resolution",
    actions: "Actions",
    resolve: "Resolve",
    ignore: "Ignore",
    addNote: "Note",
    open: "Open",
    noteLabel: "Note",
    notePlaceholder: "Enter reconciliation note / comment",
    currentNote: "Current Note",
    actionNoteTitle: "Reconciliation Note",
    actionResolveTitle: "Resolve Reconciliation Item",
    actionIgnoreTitle: "Ignore Reconciliation Item",
    actionNoteSubtitle: "Update a note for this reconciliation row",
    actionResolveSubtitle: "Resolve this row and save an optional note",
    actionIgnoreSubtitle: "Ignore this row and save an optional note",
    actionSaveNote: "Save Note",
    actionSaveResolve: "Resolve & Save",
    actionSaveIgnore: "Ignore & Save",
    actionFailed: "Reconciliation action could not be completed.",
    openPanel: "Open Panel",
    openPolicyPanel: "Open Policy",
    openCustomerPanel: "Open Customer",
    openOffersPanel: "Open Offers Board",
    openClaimsPanel: "Open Claims Board",
    openPaymentsPanel: "Open Payments Board",
    openRenewalsPanel: "Open Renewals Board",
    openReconciliationPanel: "Open Reconciliation",
    openCommunicationPanel: "Communication Record",
    openMasterDataPanel: "Master Data Record",
    externalRef: "External Ref",
    mismatchAmount: "Amount",
    mismatchCurrency: "Currency",
    mismatchMissingExternal: "Missing External",
    mismatchMissingLocal: "Missing Local",
    mismatchStatus: "Status",
    mismatchOther: "Other",
  },
};
const authStore = useAuthStore();
const branchStore = useBranchStore();
const accountingStore = useAccountingStore();

function t(key) {
  const locale = unref(authStore.locale) || "en";
  return copy[locale]?.[key] || copy.en[key] || key;
}

const filters = accountingStore.state.filters;

const syncing = ref(false);
const reconciling = ref(false);
const operationError = ref("");
const bulkActionLoading = ref(false);
const showImportDialog = ref(false);
const importLoading = ref(false);
const importError = ref("");
const statementImportCsv = ref("");
const statementImportInsuranceCompany = ref("");
const statementImportDelimiter = ref(",");
const statementImportLimit = ref(100);
const statementImportPreview = ref({ rows: [], summary: {} });

const workbenchResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.get_reconciliation_workbench",
  params: buildParams(),
  auto: true,
});

const syncResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.run_sync",
});

const runReconciliationResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.run_reconciliation_job",
});
const bulkResolveResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.bulk_resolve_items",
});

const resolveResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.resolve_item",
});
const setValueResource = createResource({
  url: "frappe.client.set_value",
});
const previewStatementImportResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.preview_statement_import",
});
const importStatementPreviewResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.import_statement_preview",
});

const workbenchData = computed(() => accountingStore.state.workbench || {});
const activeFilterCount = computed(() => accountingStore.activeFilterCount);
const {
  presetKey,
  presetOptions,
  canDeletePreset,
  applyPreset,
  onPresetChange,
  savePreset,
  deletePreset,
  persistPresetStateToServer,
  hydratePresetStateFromServer,
} = useCustomFilterPresets({
  screen: "reconciliation_workbench",
  presetStorageKey: "at:reconciliation-workbench:preset",
  presetListStorageKey: "at:reconciliation-workbench:preset-list",
  t,
  getCurrentPayload: currentWorkbenchPresetPayload,
  setFilterStateFromPayload: setWorkbenchFilterStateFromPayload,
  resetFilterState: resetWorkbenchFilterState,
  refresh: reloadWorkbench,
  getSortLocale: () => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"),
});
const sourceDoctypeOptions = computed(() => accountingStore.sourceDoctypeOptions);
const rows = computed(() => accountingStore.rows);
const openRowCount = computed(() => rows.value.filter((row) => String(row?.status || "") === "Open").length);
const metrics = computed(() => accountingStore.metrics);
const collectionPreviewRows = computed(() => workbenchData.value.collection_preview?.overdue_rows || []);
const commissionPreviewRows = computed(() => workbenchData.value.commission_preview?.rows || []);
const statementImportRows = computed(() => statementImportPreview.value?.rows || []);
const statementImportSummary = computed(() => statementImportPreview.value?.summary || {});
const localeCode = computed(() => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"));
const workbenchErrorText = computed(() => {
  if (accountingStore.state.error) return accountingStore.state.error;
  const err = workbenchResource.error;
  if (!err) return "";
  if (isPermissionDeniedError(err)) return t("permissionDeniedRead");
  return err?.messages?.join(" ") || err?.message || t("loadError");
});
const mismatchOptions = computed(() => [
  { value: "Amount", label: t("mismatchAmount") },
  { value: "Currency", label: t("mismatchCurrency") },
  { value: "Missing External", label: t("mismatchMissingExternal") },
  { value: "Missing Local", label: t("mismatchMissingLocal") },
  { value: "Status", label: t("mismatchStatus") },
  { value: "Other", label: t("mismatchOther") },
]);
const showActionDialog = ref(false);
const actionDialogMode = ref("Note");
const actionDialogRow = ref(null);
const actionDialogNotes = ref("");
const actionDialogLoading = ref(false);
const actionDialogError = ref("");
const actionDialogLabels = computed(() => ({
  cancel: unref(authStore.locale) === "tr" ? "Vazgeç" : "Cancel",
  save:
    actionDialogMode.value === "Matched"
      ? t("actionSaveResolve")
      : actionDialogMode.value === "Ignored"
        ? t("actionSaveIgnore")
        : t("actionSaveNote"),
}));
const reconciliationActionDialogTitle = computed(() => {
  if (actionDialogMode.value === "Matched") return t("actionResolveTitle");
  if (actionDialogMode.value === "Ignored") return t("actionIgnoreTitle");
  return t("actionNoteTitle");
});
const reconciliationActionDialogSubtitle = computed(() => {
  if (actionDialogMode.value === "Matched") return t("actionResolveSubtitle");
  if (actionDialogMode.value === "Ignored") return t("actionIgnoreSubtitle");
  return t("actionNoteSubtitle");
});
const importDialogLabels = computed(() => ({
  cancel: unref(authStore.locale) === "tr" ? "Vazgeç" : "Cancel",
  save: unref(authStore.locale) === "tr" ? "Önizleme Oluştur" : "Build Preview",
}));

function buildParams() {
  const officeBranch = branchStore.requestBranch;
  return {
    status: filters.status || null,
    mismatch_type: filters.mismatchType || null,
    office_branch: officeBranch,
    limit: filters.limit,
  };
}

function reloadWorkbench() {
  operationError.value = "";
  workbenchResource.params = buildParams();
  accountingStore.setLocaleCode(localeCode.value);
  accountingStore.setLoading(true);
  accountingStore.clearError();
  return workbenchResource
    .reload()
    .then((result) => {
      accountingStore.setWorkbench(result || {});
      accountingStore.setLoading(false);
      return result;
    })
    .catch((error) => {
      const message = isPermissionDeniedError(error)
        ? t("permissionDeniedRead")
        : error?.messages?.join(" ") || error?.message || t("loadError");
      accountingStore.setWorkbench({});
      accountingStore.setError(message);
      accountingStore.setLoading(false);
      throw error;
    });
}

function downloadReconciliationExport(format) {
  openTabularExport({
    permissionDoctypes: ["AT Reconciliation Item"],
    exportKey: "reconciliation_workbench",
    title: t("title"),
    columns: [
      t("source"),
      t("type"),
      t("status"),
      t("localTry"),
      t("externalTry"),
      t("difference"),
      t("accountingEntry"),
      t("resolution"),
      t("noteLabel"),
    ],
    rows: rows.value.map((row) => ({
      [t("source")]: `${row.source_doctype || "-"} / ${row.source_name || "-"}`,
      [t("type")]: row.mismatch_type || "-",
      [t("status")]: row.status || "-",
      [t("localTry")]: formatMoney(row.local_amount_try || 0),
      [t("externalTry")]: formatMoney(row.external_amount_try || 0),
      [t("difference")]: formatMoney(row.difference_try || 0),
      [t("accountingEntry")]: row.accounting_entry || "-",
      [t("resolution")]: row.resolution_action || "-",
      [t("noteLabel")]: row.notes || "-",
    })),
    filters: currentWorkbenchPresetPayload(),
    format,
  });
}

function applyWorkbenchFilters() {
  return reloadWorkbench();
}

function resetWorkbenchFilterState() {
  accountingStore.resetFilters();
}

function currentWorkbenchPresetPayload() {
  return {
    status: filters.status,
    mismatchType: filters.mismatchType,
    sourceQuery: filters.sourceQuery,
    sourceDoctype: filters.sourceDoctype,
    limit: Number(filters.limit) || 50,
  };
}

function setWorkbenchFilterStateFromPayload(payload) {
  filters.status = String(payload?.status || "Open");
  filters.mismatchType = String(payload?.mismatchType || "");
  filters.sourceQuery = String(payload?.sourceQuery || "");
  filters.sourceDoctype = String(payload?.sourceDoctype || "");
  filters.limit = Number(payload?.limit || 50) || 50;
}

function resetWorkbenchFilters() {
  applyPreset("default", { refresh: false });
  void persistPresetStateToServer();
  return reloadWorkbench();
}

async function runSync() {
  syncing.value = true;
  operationError.value = "";
  try {
    await syncResource.submit({ limit: 250 });
    await reloadWorkbench();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("actionFailed");
  } finally {
    syncing.value = false;
  }
}

async function runReconciliation() {
  reconciling.value = true;
  operationError.value = "";
  try {
    await runReconciliationResource.submit({ limit: 400 });
    await reloadWorkbench();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("actionFailed");
  } finally {
    reconciling.value = false;
  }
}

async function runBulkResolution(resolutionAction) {
  const itemNames = rows.value
    .filter((row) => String(row?.status || "") === "Open")
    .map((row) => row.name)
    .filter(Boolean);
  if (!itemNames.length) return;

  const confirmText =
    resolutionAction === "Ignored"
      ? t("bulkIgnoreConfirm")
      : t("bulkResolveConfirm");
  if (!globalThis.confirm?.(confirmText)) return;

  bulkActionLoading.value = true;
  operationError.value = "";
  try {
    await bulkResolveResource.submit({
      item_names: itemNames,
      resolution_action: resolutionAction,
    });
    await reloadWorkbench();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("actionFailed");
  } finally {
    bulkActionLoading.value = false;
  }
}

function openImportDialog() {
  showImportDialog.value = true;
  importError.value = "";
}

function closeImportDialog() {
  if (importLoading.value) return;
  showImportDialog.value = false;
  importError.value = "";
}

async function previewStatementImport() {
  importLoading.value = true;
  importError.value = "";
  try {
    const result = await previewStatementImportResource.submit({
      csv_text: statementImportCsv.value,
      office_branch: branchStore.requestBranch || null,
      insurance_company: statementImportInsuranceCompany.value || null,
      delimiter: statementImportDelimiter.value || ",",
      limit: statementImportLimit.value || 100,
    });
    statementImportPreview.value = result || { rows: [], summary: {} };
  } catch (error) {
    importError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("actionFailed");
  } finally {
    importLoading.value = false;
  }
}

async function importStatementPreviewRows() {
  importLoading.value = true;
  importError.value = "";
  try {
    await importStatementPreviewResource.submit({
      csv_text: statementImportCsv.value,
      office_branch: branchStore.requestBranch || null,
      insurance_company: statementImportInsuranceCompany.value || null,
      delimiter: statementImportDelimiter.value || ",",
      limit: statementImportLimit.value || 100,
    });
    showImportDialog.value = false;
    statementImportPreview.value = { rows: [], summary: {} };
    await reloadWorkbench();
  } catch (error) {
    importError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("actionFailed");
  } finally {
    importLoading.value = false;
  }
}

async function resolveRow(row, action) {
  operationError.value = "";
  await resolveResource.submit({
    item_name: row.name,
    resolution_action: action,
  });
  await reloadWorkbench();
}

function openReconciliationActionDialog(row, mode = "Note") {
  actionDialogRow.value = row || null;
  actionDialogMode.value = mode || "Note";
  actionDialogNotes.value = row?.notes || "";
  actionDialogError.value = "";
  showActionDialog.value = true;
}

function closeReconciliationActionDialog(force = false) {
  if (!force && actionDialogLoading.value) return;
  showActionDialog.value = false;
  actionDialogError.value = "";
  actionDialogRow.value = null;
  actionDialogMode.value = "Note";
  actionDialogNotes.value = "";
}

async function submitReconciliationActionDialog() {
  if (!actionDialogRow.value?.name || actionDialogLoading.value) return;
  actionDialogLoading.value = true;
  actionDialogError.value = "";
  try {
    if (actionDialogMode.value === "Matched" || actionDialogMode.value === "Ignored") {
      await resolveResource.submit({
        item_name: actionDialogRow.value.name,
        resolution_action: actionDialogMode.value,
        notes: String(actionDialogNotes.value || "").trim() || null,
      });
    } else {
      await setValueResource.submit({
        doctype: "AT Reconciliation Item",
        name: actionDialogRow.value.name,
        fieldname: "notes",
        value: String(actionDialogNotes.value || "").trim() || null,
      });
    }
    await reloadWorkbench();
    closeReconciliationActionDialog(true);
  } catch (error) {
    actionDialogError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("actionFailed");
  } finally {
    actionDialogLoading.value = false;
  }
}

function isPermissionDeniedError(error) {
  const status = Number(
    error?.statusCode ??
      error?.status ??
      error?.httpStatus ??
      error?.response?.status ??
      0
  );
  const text = String(error?.message || error?.messages?.join(" ") || error?.exc_type || "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    text.includes("permission") ||
    text.includes("not permitted") ||
    text.includes("not authorized")
  );
}

function sourcePanelUrl(row) {
  return getSourcePanelConfig(row?.source_doctype, row?.source_name)?.url || "";
}

function canOpenSourcePanel(row) {
  return Boolean(sourcePanelUrl(row));
}

function openSourcePanel(row) {
  const url = sourcePanelUrl(row);
  if (!url) return;
  navigateToSameOriginPath(url);
}

function sourcePanelLabel(row) {
  const labelKey = getSourcePanelConfig(row?.source_doctype, row?.source_name)?.labelKey;
  return labelKey ? t(labelKey) : t("openPanel");
}

function mismatchTypeLabel(type) {
  if (type === "Amount") return t("mismatchAmount");
  if (type === "Currency") return t("mismatchCurrency");
  if (type === "Missing External") return t("mismatchMissingExternal");
  if (type === "Missing Local") return t("mismatchMissingLocal");
  if (type === "Status") return t("mismatchStatus");
  if (type === "Other") return t("mismatchOther");
  return type || "-";
}

function sourceRowFacts(row) {
  return [
    subtleFact("externalRef", t("externalRef"), row?.accounting?.external_ref || "-"),
  ];
}

function mismatchTypeFacts(row) {
  return [
    mutedFact("mismatchType", t("type"), mismatchTypeLabel(row?.mismatch_type)),
  ];
}

function formatMoney(value) {
  try {
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return String(value ?? 0);
  }
}

onMounted(() => {
  accountingStore.setLocaleCode(localeCode.value);
  applyPreset(presetKey.value, { refresh: false });
  if (String(presetKey.value || "default") !== "default") void reloadWorkbench();
  void hydratePresetStateFromServer();
});

watch(
  () => branchStore.selected,
  () => {
    accountingStore.setLocaleCode(localeCode.value);
    void reloadWorkbench();
  }
);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
