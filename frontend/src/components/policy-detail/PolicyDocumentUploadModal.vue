<template>
  <Teleport to="body">
    <div v-if="open && canUpload" class="modal-backdrop" @click.self="$emit('close')">
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
            <span class="field-label">{{ t("documentDate") }}</span>
            <input v-model="documentDate" type="date" class="field-input" />
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
import { ref } from "vue";

const props = defineProps({
  open: { type: Boolean, required: true },
  canUpload: { type: Boolean, default: false },
  policyName: { type: String, required: true },
  t: { type: Function, required: true },
});

const emit = defineEmits(["close", "uploaded"]);

const fileInput = ref(null);
const selectedFile = ref(null);
const isDragging = ref(false);
const uploading = ref(false);
const errorMessage = ref("");
const documentKind = ref("");
const documentDate = ref("");
const notes = ref("");

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
  fd.append("attached_to_doctype", "AT Policy");
  fd.append("attached_to_name", props.policyName);

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
      // Create AT Document metadata record
      if (frappe_file_name) {
        const csrfT = (typeof window !== "undefined" && window.csrf_token) || "";
        const body = new URLSearchParams({
          file_name: frappe_file_name,
          attached_to_doctype: "AT Policy",
          attached_to_name: props.policyName,
          document_kind: documentKind.value,
          document_date: documentDate.value,
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
      documentDate.value = "";
      notes.value = "";
      if (fileInput.value) fileInput.value.value = "";
      emit("uploaded");
    } else {
      errorMessage.value = props.t("uploadError");
    }
  } catch {
    errorMessage.value = props.t("uploadError");
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

.upload-error {
  font-size: 0.8125rem;
  color: #dc2626;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
