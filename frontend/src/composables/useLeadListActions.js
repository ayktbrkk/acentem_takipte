import { onBeforeUnmount, ref } from "vue";
import { createResource } from "frappe-ui";

import { openListExport } from "../utils/listExport";

export function useLeadListActions({ t, refreshLeadList, buildLeadExportQuery, canConvertLead }) {
  const actionSuccessText = ref("");
  const actionErrorText = ref("");
  const convertingLeadName = ref("");
  const lastConvertedOfferName = ref("");
  const leadConvertResource = createResource({
    url: "acentem_takipte.doctype.at_lead.at_lead.convert_to_offer",
    auto: false,
  });

  let actionFlashTimer = null;

  function clearActionFeedback() {
    if (actionFlashTimer) {
      window.clearTimeout(actionFlashTimer);
      actionFlashTimer = null;
    }
    actionSuccessText.value = "";
    actionErrorText.value = "";
    lastConvertedOfferName.value = "";
  }

  function scheduleActionFeedbackClear() {
    if (actionFlashTimer) window.clearTimeout(actionFlashTimer);
    actionFlashTimer = window.setTimeout(() => {
      actionSuccessText.value = "";
      actionErrorText.value = "";
      lastConvertedOfferName.value = "";
      actionFlashTimer = null;
    }, 4000);
  }

  function parseActionError(error) {
    const direct = error?.message || error?.exc_type;
    if (direct) return String(direct);
    const serverMessage =
      error?._server_messages ||
      error?.messages?.[0] ||
      error?.response?._server_messages ||
      error?.response?.message;
    if (!serverMessage) return "";
    try {
      const parsed = typeof serverMessage === "string" ? JSON.parse(serverMessage) : serverMessage;
      if (Array.isArray(parsed) && parsed.length) {
        return String(parsed[0]).replace(/<[^>]*>/g, "").trim();
      }
    } catch {
      return String(serverMessage).replace(/<[^>]*>/g, "").trim();
    }
    return "";
  }

  async function convertLeadToOffer(row) {
    if (!canConvertLead(row) || !row?.name || leadConvertResource.loading) return;
    clearActionFeedback();
    convertingLeadName.value = row.name;
    try {
      const result = await leadConvertResource.submit({ lead_name: row.name });
      lastConvertedOfferName.value = result?.offer || "";
      actionSuccessText.value = lastConvertedOfferName.value ? "" : (result?.message || t("convertLeadSuccess"));
      await refreshLeadList();
      scheduleActionFeedbackClear();
    } catch (error) {
      actionErrorText.value = parseActionError(error) || t("convertLeadError");
      scheduleActionFeedbackClear();
    } finally {
      convertingLeadName.value = "";
    }
  }

  function downloadLeadExport(format) {
    openListExport({
      screen: "lead_list",
      query: buildLeadExportQuery(),
      format,
      limit: 1000,
    });
  }

  onBeforeUnmount(() => {
    if (actionFlashTimer) {
      window.clearTimeout(actionFlashTimer);
      actionFlashTimer = null;
    }
  });

  return {
    actionSuccessText,
    actionErrorText,
    convertingLeadName,
    lastConvertedOfferName,
    leadConvertResource,
    clearActionFeedback,
    scheduleActionFeedbackClear,
    parseActionError,
    convertLeadToOffer,
    downloadLeadExport,
  };
}
