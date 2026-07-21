import { computed, ref } from "vue";
import { createResource } from "frappe-ui";

function isAtDocumentDoc(doc) {
  return Boolean(doc && typeof doc === "object" && String(doc.name || "").trim());
}

function normalizeStatus(value) {
  return String(value || "").trim();
}

export function useAtDocumentLifecycle({ authStore, t, labels = {} }) {
  function messageFor(key) {
    return String(labels?.[key] || t?.(key) || key).trim() || key;
  }

  const actionBusyName = ref("");

  const archiveResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.documents.archive_document",
    auto: false,
  });
  const restoreResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.documents.restore_document",
    auto: false,
  });
  const permanentDeleteResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.documents.permanent_delete_document",
    auto: false,
  });

  const canWriteDocument = computed(() => Boolean(authStore?.can?.(["doctypes", "AT Document", "write"])));
  const canDeleteDocument = computed(() => Boolean(authStore?.can?.(["doctypes", "AT Document", "delete"])));

  function canArchiveDocument(doc) {
    return isAtDocumentDoc(doc) && canWriteDocument.value && normalizeStatus(doc?.status) === "Active";
  }

  function canRestoreDocument(doc) {
    return isAtDocumentDoc(doc) && canWriteDocument.value && normalizeStatus(doc?.status) === "Archived";
  }

  function canPermanentDeleteDocument(doc) {
    return isAtDocumentDoc(doc) && canDeleteDocument.value;
  }

  async function submitLifecycleAction(resource, payload, doc, confirmMessage, afterSuccess) {
    if (!doc?.name || !resource) return false;
    if (actionBusyName.value) return false;
    if (confirmMessage && !globalThis.confirm?.(confirmMessage)) return false;

    actionBusyName.value = doc.name;
    try {
      await resource.submit(payload);
      if (typeof afterSuccess === "function") {
        await afterSuccess();
      }
      return true;
    } finally {
      actionBusyName.value = "";
    }
  }

  async function archiveDocument(doc, afterSuccess) {
    return submitLifecycleAction(
      archiveResource,
      { docname: doc?.name || "" },
      doc,
      messageFor("archiveConfirm"),
      afterSuccess
    );
  }

  async function restoreDocument(doc, afterSuccess) {
    return submitLifecycleAction(
      restoreResource,
      { docname: doc?.name || "" },
      doc,
      messageFor("restoreConfirm"),
      afterSuccess
    );
  }

  async function permanentDeleteDocument(doc, afterSuccess) {
    return submitLifecycleAction(
      permanentDeleteResource,
      { docname: doc?.name || "" },
      doc,
      messageFor("permanentDeleteConfirm"),
      afterSuccess
    );
  }

  return {
    actionBusyName,
    archiveResource,
    restoreResource,
    permanentDeleteResource,
    canWriteDocument,
    canDeleteDocument,
    canArchiveDocument,
    canRestoreDocument,
    canPermanentDeleteDocument,
    archiveDocument,
    restoreDocument,
    permanentDeleteDocument,
  };
}
