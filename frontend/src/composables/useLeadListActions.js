import { onBeforeUnmount, ref } from "vue";
import { createResource } from "frappe-ui";
import { openListExport } from "../utils/listExport";
import { parseActionError } from "../utils/error";

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
    convertLeadToOffer,
    downloadLeadExport,
  };
}
