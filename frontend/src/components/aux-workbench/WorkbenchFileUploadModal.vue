<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">{{ t("uploadDocument") }}</h2>
          <button class="modal-close-btn" type="button" :aria-label="t('close')" @click="$emit('close')">✕</button>
        </div>

        <div
          class="drop-zone"
          :class="{ 'drop-zone-active': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
          @click="fileInput.click()"
        >
          <input
            ref="fileInput"
            type="file"
            class="hidden-input"
            @change="onFileChange"
          />
          <p v-if="!selectedFile" class="drop-zone-text">{{ t("chooseFile") }}</p>
          <p v-else class="drop-zone-selected">
            {{ selectedFile.name }}
            <span class="drop-zone-size">{{ fmtFileSize(selectedFile.size) }}</span>
          </p>
        </div>

        <p v-if="errorMessage" class="upload-error">{{ errorMessage }}</p>

        <!-- P3.5: prop boşsa bağlantı seçici göster -->
        <div v-if="!props.attachedToDoctype" class="link-section">
          <label class="field-row">
            <span class="field-label">{{ t('linkDoctypeLabel') }}</span>
            <select v-model="linkDoctype" class="field-input" @change="onLinkDoctypeChange">
              <option value="">—</option>
              <option value="AT Customer">{{ t('linkCustomer') }}</option>
              <option value="AT Policy">{{ t('linkPolicy') }}</option>
              <option value="AT Claim">{{ t('linkClaim') }}</option>
            </select>
          </label>
          <div v-if="linkDoctype" class="field-row">
            <span class="field-label">{{ t('linkNameLabel') }}</span>
            <div class="link-input-wrap">
              <input
                v-model="linkSearch"
                type="text"
                class="field-input"
                :placeholder="t('linkSearchPlaceholder')"
                @input="onLinkSearch"
                autocomplete="off"
              />
              <ul v-if="linkResults.length" class="link-results">
                <li
                  v-for="r in linkResults"
                  :key="r.name"
                  class="link-result-item"
                  @mousedown.prevent="selectLinkResult(r)"
                >
                  <span class="link-result-name">{{ r.label || r.name }}</span>
                  <span v-if="r.label" class="link-result-id">{{ r.name }}</span>
                </li>
              </ul>
              <p v-if="linkSearching" class="link-searching">{{ t('linkSearching') }}</p>
            </div>
            <span v-if="linkName" class="link-selected">✓ {{ linkName }}</span>
          </div>
        </div>

        <div class="meta-fields">
          <label class="field-row">
            <span class="field-label">{{ t("documentKind") }}</span>
            <select v-model="documentKind" class="field-input">
              <option value="">—</option>
              <option value="Policy">{{ t("kindPolicy") }}</option>
              <option value="Endorsement">{{ t("kindEndorsement") }}</option>
              <option value="Claim">{{ t("kindClaim") }}</option>
              <option value="Other">{{ t("kindOther") }}</option>
            </select>
          </label>
          <label class="field-row">
            <span class="field-label">{{ t("documentSubType") }}</span>
            <select v-model="documentSubType" class="field-input">
              <option value="">—</option>
              <option value="Ruhsat">{{ t("subRuhsat") }}</option>
              <option value="Kimlik">{{ t("subKimlik") }}</option>
              <option value="Poliçe Kopyası">{{ t("subPoliceCopyasi") }}</option>
              <option value="Hasar Fotoğrafı">{{ t("subHasarFotografi") }}</option>
              <option value="Diğer">{{ t("subDiger") }}</option>
            </select>
          </label>
          <label class="field-row">
            <span class="field-label">{{ t("documentDate") }}</span>
            <input v-model="documentDate" type="date" class="field-input" />
          </label>
          <label class="field-row field-row-check">
            <input v-model="isSensitive" type="checkbox" class="field-checkbox" />
            <span class="field-label">{{ t("isSensitive") }}</span>
          </label>
          <label class="field-row">
            <span class="field-label">{{ t("notes") }}</span>
            <textarea v-model="notes" class="field-input field-textarea" rows="2" />
          </label>
        </div>

        <div class="modal-actions">
          <button
            class="btn btn-sm btn-secondary"
            type="button"
            :disabled="uploading"
            @click="$emit('close')"
          >
            {{ t("cancel") }}
          </button>
          <button
            class="btn btn-sm btn-primary"
            type="button"
            :disabled="!selectedFile || uploading"
            @click="submit"
          >
            <span v-if="uploading">{{ t("uploading") }}</span>
            <span v-else>{{ t("upload") }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref } from "vue";
import { useAuthStore } from "../../stores/auth";

const props = defineProps({
  open: { type: Boolean, required: true },
  attachedToDoctype: { type: String, default: "" },
  attachedToName: { type: String, default: "" },
});

const emit = defineEmits(["close", "uploaded"]);

const authStore = useAuthStore();
const locale = computed(() => authStore.locale || "en");

const copy = {
  tr: {
    uploadDocument: "Belge Yükle",
    chooseFile: "Dosya seçin veya buraya sürükleyin",
    uploadError: "Yükleme başarısız. Lütfen tekrar deneyin.",
    fileTooLarge: "Dosya çok büyük (maks. 10 MB)",
    cancel: "İptal",
    upload: "Yükle",
    uploading: "Yükleniyor...",
    documentKind: "Belge Türü",
    documentSubType: "Belge Alt Türü",
    documentDate: "Belge Tarihi",
    isSensitive: "Hassas Veri",
    notes: "Notlar",
    kindPolicy: "Poliçe",
    kindEndorsement: "Zeyilname",
    kindClaim: "Hasar",
    kindOther: "Diğer",
    subRuhsat: "Ruhsat",
    subKimlik: "Kimlik",
    subPoliceCopyasi: "Poliçe Kopyası",
    subHasarFotografi: "Hasar Fotoğrafı",
    subDiger: "Diğer",
    linkDoctypeLabel: "Bağlantı Türü",
    linkNameLabel: "Bağlı Kayıt",
    linkCustomer: "Müşteri",
    linkPolicy: "Poliçe",
    linkClaim: "Hasar",
    linkSearchPlaceholder: "Kayıt ara...",
    linkSearching: "Aranıyor...",
  },
  en: {
    uploadDocument: "Upload Document",
    chooseFile: "Choose a file or drag it here",
    uploadError: "Upload failed. Please try again.",
    fileTooLarge: "File is too large (max 10 MB)",
    cancel: "Cancel",
    upload: "Upload",
    uploading: "Uploading...",
    documentKind: "Document Kind",
    documentSubType: "Document Sub Type",
    documentDate: "Document Date",
    isSensitive: "Sensitive Data",
    notes: "Notes",
    kindPolicy: "Policy",
    kindEndorsement: "Endorsement",
    kindClaim: "Claim",
    kindOther: "Other",
    subRuhsat: "Registration Certificate",
    subKimlik: "ID / Passport",
    subPoliceCopyasi: "Policy Copy",
    subHasarFotografi: "Damage Photo",
    subDiger: "Other",
    linkDoctypeLabel: "Link Type",
    linkNameLabel: "Linked Record",
    linkCustomer: "Customer",
    linkPolicy: "Policy",
    linkClaim: "Claim",
    linkSearchPlaceholder: "Search record...",
    linkSearching: "Searching...",
  },
};

function t(key) {
  const lang = locale.value;
  return copy[lang]?.[key] || copy.en[key] || key;
}

const fileInput = ref(null);
const selectedFile = ref(null);
const isDragging = ref(false);
const uploading = ref(false);
const errorMessage = ref("");
const documentKind = ref("");
const documentSubType = ref("");
const documentDate = ref("");
const isSensitive = ref(false);
const notes = ref("");

// P3.5: Standalone bağlantı seçici state
const linkDoctype = ref("");
const linkName = ref("");
const linkSearch = ref("");
const linkResults = ref([]);
const linkSearching = ref(false);
let linkSearchTimer = null;

const LINK_CFG = {
  "AT Customer": { searchField: "customer_name", labelField: "customer_name", fields: ["name", "customer_name"] },
  "AT Policy":   { searchField: "name",          labelField: "name",          fields: ["name"] },
  "AT Claim":    { searchField: "name",          labelField: "name",          fields: ["name"] },
};

function onLinkDoctypeChange() {
  linkName.value = "";
  linkSearch.value = "";
  linkResults.value = [];
}

function onLinkSearch() {
  linkName.value = "";
  clearTimeout(linkSearchTimer);
  if (!linkSearch.value.trim() || !linkDoctype.value) {
    linkResults.value = [];
    return;
  }
  linkSearchTimer = setTimeout(fetchLinkResults, 300);
}

async function fetchLinkResults() {
  const cfg = LINK_CFG[linkDoctype.value];
  if (!cfg) return;
  linkSearching.value = true;
  linkResults.value = [];
  try {
    const params = new URLSearchParams({
      doctype: linkDoctype.value,
      fields: JSON.stringify(cfg.fields),
      filters: JSON.stringify([[linkDoctype.value, cfg.searchField, "like", `%${linkSearch.value}%`]]),
      limit_page_length: "10",
      order_by: `${cfg.searchField} asc`,
    });
    const csrfT = (typeof window !== "undefined" && window.csrf_token) || "";
    const resp = await fetch(`/api/method/frappe.client.get_list?${params}`, {
      headers: csrfT ? { "X-Frappe-CSRF-Token": csrfT } : {},
    });
    if (resp.ok) {
      const data = await resp.json();
      linkResults.value = (data?.message || []).map(r => ({
        name: r.name,
        label: cfg.labelField !== "name" ? (r[cfg.labelField] || "") : "",
      }));
    }
  } catch {
    // arama hatalarını sessizce geç
  } finally {
    linkSearching.value = false;
  }
}

function selectLinkResult(r) {
  linkName.value = r.name;
  linkSearch.value = r.label || r.name;
  linkResults.value = [];
}

function fmtFileSize(bytes) {
  if (!bytes || bytes === 0) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function onFileChange(event) {
  const file = event.target.files?.[0];
  if (file) {
    selectedFile.value = file;
    errorMessage.value = "";
  }
}

function onDrop(event) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    selectedFile.value = file;
    errorMessage.value = "";
  }
}

async function submit() {
  if (!selectedFile.value) return;

  const maxBytes = 10 * 1024 * 1024;
  if (selectedFile.value.size > maxBytes) {
    errorMessage.value = props.t("fileTooLarge");
    return;
  }

  uploading.value = true;
  errorMessage.value = "";

  const fd = new FormData();
  fd.append("file", selectedFile.value);
  fd.append("is_private", "1");
  // P3.5: prop boşsa seçiciden al
  const effectiveDoctype = props.attachedToDoctype || linkDoctype.value;
  const effectiveName = props.attachedToName || (linkDoctype.value ? linkName.value : "");

  if (effectiveDoctype) {
    fd.append("attached_to_doctype", effectiveDoctype);
  }
  if (effectiveName) {
    fd.append("attached_to_name", effectiveName);
  }

  try {
    const csrfToken =
      (typeof window !== "undefined" && window.csrf_token) || "";
    const resp = await fetch("/api/method/upload_file", {
      method: "POST",
      body: fd,
      headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {},
    });

    if (resp.ok) {
      const uploadResult = await resp.json();
      const frappe_file_name = uploadResult?.message?.name || uploadResult?.message?.file_name || "";
      if (frappe_file_name) {
        const csrfT = (typeof window !== "undefined" && window.csrf_token) || "";
        const body = new URLSearchParams({
          file_name: frappe_file_name,
          ...(effectiveDoctype ? { attached_to_doctype: effectiveDoctype } : {}),
          ...(effectiveName ? { attached_to_name: effectiveName } : {}),
          document_kind: documentKind.value,
          document_sub_type: documentSubType.value,
          document_date: documentDate.value,
          is_sensitive: isSensitive.value ? "1" : "0",
          notes: notes.value,
          is_private: "1",
        });
        await fetch("/api/method/acentem_takipte.acentem_takipte.api.documents.upload_document", {
          method: "POST",
          body,
          headers: Object.assign(
            { "Content-Type": "application/x-www-form-urlencoded" },
            csrfT ? { "X-Frappe-CSRF-Token": csrfT } : {}
          ),
        });
      }
      selectedFile.value = null;
      documentKind.value = "";
      documentSubType.value = "";
      documentDate.value = "";
      isSensitive.value = false;
      notes.value = "";
      linkDoctype.value = "";
      linkName.value = "";
      linkSearch.value = "";
      linkResults.value = [];
      if (fileInput.value) fileInput.value.value = "";
      emit("uploaded");
    } else {
      errorMessage.value = t("uploadError");
    }
  } catch {
    errorMessage.value = t("uploadError");
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-box {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  padding: 1.5rem;
  width: 100%;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.modal-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #64748b;
  line-height: 1;
  padding: 0.25rem;
}

.modal-close-btn:hover {
  color: #1e293b;
}

.drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 0.5rem;
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: #f8fafc;
}

.drop-zone:hover,
.drop-zone-active {
  border-color: #6366f1;
  background: #f0f0ff;
}

.hidden-input {
  display: none;
}

.drop-zone-text {
  color: #64748b;
  font-size: 0.875rem;
}

.drop-zone-selected {
  color: #1e293b;
  font-size: 0.875rem;
  font-weight: 500;
}

.drop-zone-size {
  margin-left: 0.5rem;
  color: #64748b;
  font-weight: 400;
}

.upload-error {
  font-size: 0.8125rem;
  color: #dc2626;
}

.meta-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-row-check {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.field-checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: #6366f1;
  cursor: pointer;
  flex-shrink: 0;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #475569;
}

.field-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1e293b;
  background: #fff;
}

.field-input:focus {
  outline: 2px solid #6366f1;
  outline-offset: -1px;
}

.field-textarea {
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* P3.5 - bağlantı seçici */
.link-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.link-input-wrap {
  position: relative;
}

.link-results {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.10);
  max-height: 12rem;
  overflow-y: auto;
  z-index: 100;
  list-style: none;
  margin: 0;
  padding: 0.25rem 0;
}

.link-result-item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.link-result-item:hover {
  background: #f0f0ff;
}

.link-result-name {
  color: #1e293b;
  font-weight: 500;
}

.link-result-id {
  color: #94a3b8;
  font-size: 0.75rem;
}

.link-searching {
  font-size: 0.75rem;
  color: #94a3b8;
  padding: 0.25rem 0;
  margin: 0;
}

.link-selected {
  font-size: 0.75rem;
  color: #16a34a;
  font-weight: 500;
  margin-top: 0.2rem;
}
</style>
