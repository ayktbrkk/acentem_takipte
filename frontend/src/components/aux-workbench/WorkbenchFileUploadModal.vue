<template>
  <ATQuickEntryModal
    v-model="openProxy"
    :error="errorMessage"
    :title="translateLabel('uploadDocument')"
    :subtitle="translateLabel('uploadSubtitle')"
    :eyebrow="translateLabel('uploadEyebrow')"
    :loading="uploading"
    :disabled="!selectedFile || uploading"
    :locale="locale"
    :show-save-and-open="false"
    :labels="modalLabels"
    @cancel="$emit('close')"
    @save="submit"
  >
    <div class="space-y-6 py-2">
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateLabel("uploadSectionTitle") }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>

        <div
          class="drop-zone"
          :class="{ 'drop-zone-active': isDragging }"
          tabindex="0"
          role="button"
          :aria-label="translateLabel('chooseFile')"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
          @click="fileInput.click()"
          @keydown.enter.prevent="fileInput.click()"
          @keydown.space.prevent="fileInput.click()"
        >
          <input
            id="workbench-document-file"
            ref="fileInput"
            name="document_file"
            type="file"
            :aria-label="translateLabel('chooseFile')"
            class="hidden-input"
            @change="onFileChange"
          />
          <p v-if="!selectedFile" class="drop-zone-text">{{ translateLabel("chooseFile") }}</p>
          <p v-else class="drop-zone-selected">
            {{ selectedFile.name }}
            <span class="drop-zone-size">{{ fmtFileSize(selectedFile.size) }}</span>
          </p>
        </div>

        <div v-if="contextInfo" class="context-badge mt-4">
          <span class="context-label">{{ contextInfo.record_type }}</span>
          <span class="context-name">{{ contextInfo.record_name }}</span>
          <span v-if="contextInfo.customer_name" class="context-customer">
            → {{ contextInfo.customer_name }}
            <span v-if="contextInfo.customer_id" class="context-taxid">({{ contextInfo.customer_id }})</span>
          </span>
        </div>
      </section>

      <section v-if="!canUseAttachedReference" class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateLabel("linkSectionTitle") }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>

        <div class="meta-grid">
          <label class="field-row">
            <span class="field-label">{{ translateLabel('linkDoctypeLabel') }}</span>
            <select
              id="workbench-document-link-doctype"
              v-model="linkDoctype"
              name="link_doctype"
              class="field-input"
              :aria-label="translateLabel('linkDoctypeLabel')"
              @change="onLinkDoctypeChange"
            >
              <option value="">—</option>
              <option value="AT Customer">{{ translateLabel('linkCustomer') }}</option>
              <option value="AT Policy">{{ translateLabel('linkPolicy') }}</option>
              <option value="AT Claim">{{ translateLabel('linkClaim') }}</option>
            </select>
          </label>
          <div v-if="linkDoctype" class="field-row field-row-span">
            <span class="field-label">{{ translateLabel('linkNameLabel') }}</span>
            <div class="link-input-wrap">
              <input
                id="workbench-document-link-name"
                v-model="linkSearch"
                name="link_name"
                type="text"
                class="field-input"
                :aria-label="translateLabel('linkNameLabel')"
                :placeholder="translateLabel('linkSearchPlaceholder')"
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
                  <span v-if="r.taxId" class="link-result-tax">{{ r.taxId }}</span>
                  <span class="link-result-id">{{ r.name }}</span>
                </li>
              </ul>
              <p v-if="linkSearching" class="link-searching">{{ translateLabel('linkSearching') }}</p>
            </div>
            <span v-if="linkName" class="link-selected">✓ {{ linkName }}</span>
          </div>
        </div>
      </section>

      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateLabel("metaSectionTitle") }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>

        <div class="meta-grid">
          <label class="field-row">
            <span class="field-label">{{ translateLabel("documentKind") }}</span>
            <select
              id="workbench-document-kind"
              v-model="documentKind"
              name="document_kind"
              class="field-input"
              :aria-label="translateLabel('documentKind')"
            >
              <option value="">—</option>
              <option value="Policy">{{ translateLabel("kindPolicy") }}</option>
              <option value="Endorsement">{{ translateLabel("kindEndorsement") }}</option>
              <option value="Claim">{{ translateLabel("kindClaim") }}</option>
              <option value="Other">{{ translateLabel("kindOther") }}</option>
            </select>
          </label>
          <label class="field-row">
            <span class="field-label">{{ translateLabel("documentSubType") }}</span>
            <select
              id="workbench-document-sub-type"
              v-model="documentSubType"
              name="document_sub_type"
              class="field-input"
              :aria-label="translateLabel('documentSubType')"
            >
              <option value="">—</option>
              <option value="Vehicle Registration">{{ translateLabel("subRuhsat") }}</option>
              <option value="ID Document">{{ translateLabel("subKimlik") }}</option>
              <option value="Policy Copy">{{ translateLabel("subPoliceCopyasi") }}</option>
              <option value="Damage Photo">{{ translateLabel("subHasarFotografi") }}</option>
              <option value="Other">{{ translateLabel("subDiger") }}</option>
            </select>
          </label>
          <label class="field-row field-row-check">
            <span class="field-label">{{ translateLabel("isSensitive") }}</span>
            <div class="checkbox-wrap">
              <input
                id="workbench-document-sensitive"
                v-model="isSensitive"
                name="is_sensitive"
                type="checkbox"
                class="field-checkbox"
                :aria-label="translateLabel('isSensitive')"
              />
            </div>
          </label>
          <label class="field-row field-row-span">
            <span class="field-label">{{ translateLabel("notes") }}</span>
            <textarea
              id="workbench-document-notes"
              v-model="notes"
              name="notes"
              class="field-input field-textarea"
              rows="3"
              :aria-label="translateLabel('notes')"
            />
          </label>
        </div>
      </section>
    </div>
  </ATQuickEntryModal>
</template>

<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { useAuthStore } from "../../stores/auth";
import ATQuickEntryModal from "../app-shell/ATQuickEntryModal.vue";
import { WORKBENCH_FILE_UPLOAD_TRANSLATIONS } from "../../config/workbench_file_upload_translations";

const props = defineProps({
  open: { type: Boolean, required: true },
  attachedToDoctype: { type: String, default: "" },
  attachedToName: { type: String, default: "" },
  t: { type: Function, default: null },
});

const emit = defineEmits(["close", "uploaded"]);

const openProxy = computed({
  get: () => props.open,
  set: (value) => {
    if (!value) emit("close");
  },
});

watch(() => [props.attachedToDoctype, props.attachedToName], () => {
  loadContextInfo();
});

const authStore = useAuthStore();
const locale = computed(() => {
  const raw = String(authStore.locale || "en").toLowerCase();
  return raw.startsWith("tr") ? "tr" : "en";
});

function translateLabel(key) {
  const local = copy[locale.value]?.[key] || copy.en[key] || key;
  if (!props.t) return local;
  const translated = props.t(key);
  if (!translated || translated === key) return local;
  return translated;
}

const copy = WORKBENCH_FILE_UPLOAD_TRANSLATIONS;

const fileInput = ref(null);
const selectedFile = ref(null);
const isDragging = ref(false);
const uploading = ref(false);
const errorMessage = ref("");
const documentKind = ref("");
const documentSubType = ref("");
const isSensitive = ref(false);
const notes = ref("");

const linkDoctype = ref("");
const linkName = ref("");
const linkSearch = ref("");
const linkResults = ref([]);
const linkSearching = ref(false);
let linkSearchTimer = null;

const contextInfo = ref(null);
const ALLOWED_LINK_DOCTYPES = new Set(["AT Customer", "AT Policy", "AT Claim"]);
const canUseAttachedReference = computed(() => ALLOWED_LINK_DOCTYPES.has(props.attachedToDoctype) && Boolean(props.attachedToName));
const effectiveAttachedToDoctype = computed(() => (canUseAttachedReference.value ? props.attachedToDoctype : ""));
const effectiveAttachedToName = computed(() => (canUseAttachedReference.value ? props.attachedToName : ""));
const modalLabels = computed(() => ({
  cancel: translateLabel("cancel"),
  save: uploading.value ? translateLabel("uploading") : translateLabel("upload"),
}));

async function loadContextInfo() {
  if (!canUseAttachedReference.value) {
    contextInfo.value = null;
    return;
  }
  const doctypeLabel = effectiveAttachedToDoctype.value === "AT Policy" ? translateLabel("kindPolicy") :
                      effectiveAttachedToDoctype.value === "AT Claim" ? translateLabel("kindClaim") :
                      effectiveAttachedToDoctype.value === "AT Customer" ? translateLabel("kindCustomer") : effectiveAttachedToDoctype.value;
  try {
    const csrfT = (typeof window !== "undefined" && window.csrf_token) || "";
    const params = new URLSearchParams({
      doctype: effectiveAttachedToDoctype.value,
      docname: effectiveAttachedToName.value,
    });
    const resp = await fetch(`/api/method/acentem_takipte.acentem_takipte.api.documents.get_document_context?${params}`, {
      headers: csrfT ? { "X-Frappe-CSRF-Token": csrfT } : {},
    });
    if (resp.ok) {
      const data = await resp.json();
      contextInfo.value = {
        record_type: doctypeLabel,
        record_name: data.message?.record_name || effectiveAttachedToName.value,
        customer_name: data.message?.customer_name || null,
        customer_id: data.message?.customer_id || null,
      };
    }
  } catch {
    contextInfo.value = { record_type: doctypeLabel, record_name: effectiveAttachedToName.value, customer_name: null, customer_id: null };
  }
}

onMounted(() => {
  loadContextInfo();
});

const LINK_CFG = {
  "AT Customer": { searchField: "full_name", labelField: "full_name", fields: ["name", "full_name", "tax_id"] },
  "AT Policy":   { searchField: "name",       labelField: "name",       fields: ["name"] },
  "AT Claim":    { searchField: "name",       labelField: "name",       fields: ["name"] },
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
        taxId: r.tax_id || "",
      }));
    }
  } catch {
    // silently ignore search errors
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

function extractServerErrorMessage(payload) {
  if (!payload || typeof payload !== "object") return "";
  const direct = String(payload?.message || "").trim();
  if (direct) return direct;

  const exceptionText = String(payload?.exception || "").trim();
  if (exceptionText) {
    const cleanException = exceptionText.replace(/^[A-Za-z]+Error:\s*/, "").trim();
    if (cleanException) return cleanException;
  }

  const exceptionType = String(payload?.exc_type || "").trim();
  if (exceptionType) return exceptionType;

  const rawServerMessages = payload?._server_messages;
  if (rawServerMessages) {
    try {
      const parsed = JSON.parse(rawServerMessages);
      if (Array.isArray(parsed) && parsed.length) {
        const first = parsed[0];
        if (typeof first === "string") {
          try {
            const inner = JSON.parse(first);
            const innerMessage = String(inner?.message || "").trim();
            if (innerMessage) return innerMessage;
          } catch {
            const txt = first.replace(/<[^>]*>/g, "").trim();
            if (txt) return txt;
          }
        }
      }
    } catch {
      // ignore parse issues and continue with generic fallback
    }
  }
  return "";
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
    errorMessage.value = translateLabel("fileTooLarge");
    return;
  }

  uploading.value = true;
  errorMessage.value = "";

  const fd = new FormData();
  fd.append("file", selectedFile.value);
  fd.append("is_private", "1");
  const effectiveDoctype = effectiveAttachedToDoctype.value || linkDoctype.value;
  const effectiveName = effectiveAttachedToName.value || (linkDoctype.value ? linkName.value : "");

  if (effectiveDoctype) {
    fd.append("attached_to_doctype", effectiveDoctype);
  }
  if (effectiveName) {
    fd.append("attached_to_name", effectiveName);
  }

  try {
    const csrfToken = (typeof window !== "undefined" && window.csrf_token) || "";
    const resp = await fetch("/api/method/upload_file", {
      method: "POST",
      body: fd,
      headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {},
    });

    if (resp.ok) {
      const uploadResult = await resp.json();
      const frappe_file_name = uploadResult?.message?.name || uploadResult?.message?.file_name || "";
      const frappe_file_url = uploadResult?.message?.file_url || "";
      
      if (!frappe_file_name) {
        const errMsg = uploadResult?.message || uploadResult?.exception || uploadResult?.error || "";
        if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('model does not support image')) {
          errorMessage.value = translateLabel("fileTypeNotSupported");
        } else {
          errorMessage.value = translateLabel("uploadError");
        }
        return;
      }
      
      const csrfT = (typeof window !== "undefined" && window.csrf_token) || "";
      const body = new URLSearchParams({
        file_name: frappe_file_name,
        ...(frappe_file_url ? { file_url: frappe_file_url } : {}),
        ...(effectiveDoctype ? { attached_to_doctype: effectiveDoctype } : {}),
        ...(effectiveName ? { attached_to_name: effectiveName } : {}),
        document_kind: documentKind.value,
        document_sub_type: documentSubType.value,
        is_sensitive: isSensitive.value ? "1" : "0",
        notes: notes.value,
        is_private: "1",
      });
      const metaResp = await fetch("/api/method/acentem_takipte.acentem_takipte.api.documents.upload_document", {
        method: "POST",
        body,
        headers: Object.assign(
          { "Content-Type": "application/x-www-form-urlencoded" },
          csrfT ? { "X-Frappe-CSRF-Token": csrfT } : {}
        ),
      });
      if (!metaResp.ok) {
        let detail = "";
        try {
          const payload = await metaResp.json();
          detail = extractServerErrorMessage(payload);
        } catch {
        }
        errorMessage.value = detail ? `${translateLabel("uploadError")} (${detail})` : translateLabel("uploadError");
        return;
      }
      let uploadPayload = null;
      try {
        const metaResult = await metaResp.json();
        uploadPayload = metaResult?.message || metaResult || null;
      } catch {
        uploadPayload = null;
      }

      selectedFile.value = null;
      documentKind.value = "";
      documentSubType.value = "";
      isSensitive.value = false;
      notes.value = "";
      linkDoctype.value = "";
      linkName.value = "";
      linkSearch.value = "";
      linkResults.value = [];
      if (fileInput.value) fileInput.value.value = "";
      emit("uploaded", uploadPayload);
    } else {
      let detail = "";
      try {
        const payload = await resp.json();
        detail = extractServerErrorMessage(payload);
      } catch {
        try {
          detail = (await resp.text()).trim();
        } catch {
          detail = "";
        }
      }
      if (detail.toLowerCase().includes("model does not support image")) {
        errorMessage.value = translateLabel("fileTypeNotSupported");
      } else {
        errorMessage.value = detail ? `${translateLabel("uploadError")} (${detail})` : translateLabel("uploadError");
      }
    }
  } catch {
    errorMessage.value = translateLabel("uploadError");
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 0.75rem;
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: #f8fafc;
}

.drop-zone:hover,
.drop-zone-active {
  border-color: #3B82F6;
  background: #EBF3FF;
}

.drop-zone:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
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

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-row-check {
  justify-content: flex-end;
}

.field-row-span {
  grid-column: 1 / -1;
}

.checkbox-wrap {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 0.25rem;
}

.field-checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: #3B82F6;
  cursor: pointer;
  flex-shrink: 0;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #94a3b8;
}

.field-input {
  width: 100%;
  min-height: 42px;
  padding: 0.55rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  color: #1e293b;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.field-input:focus {
  outline: none;
  border-color: rgb(59 130 246 / 0.45);
  box-shadow: 0 0 0 4px rgb(59 130 246 / 0.1);
  background: white;
}

.field-textarea {
  resize: vertical;
  min-height: 88px;
}

/* link selector */
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
  background: #EBF3FF;
}

.link-result-name {
  color: #1e293b;
  font-weight: 500;
}

.link-result-id {
  color: #94a3b8;
  font-size: 0.75rem;
}

.link-result-tax {
  color: #3B82F6;
  font-size: 0.75rem;
  font-weight: 600;
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

.context-badge {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.9rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
}

.context-label {
  font-weight: 600;
  color: #166534;
}

.context-name {
  color: #1e293b;
}

.context-customer {
  color: #64748b;
}

.context-taxid {
  color: #3B82F6;
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
