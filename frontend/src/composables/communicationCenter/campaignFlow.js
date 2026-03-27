import { ref } from "vue";
import { createResource } from "frappe-ui";

import { isPermissionDeniedError } from "./common";

export function useCommunicationCenterCampaignFlow({ t, reloadSnapshot }) {
  const showCampaignRunDialog = ref(false);
  const campaignRunSelection = ref("");
  const campaignRunLoading = ref(false);
  const campaignRunError = ref("");
  const campaignRunResult = ref(null);

  const campaignRunResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.execute_campaign",
  });

  async function runCampaignExecution() {
    if (!campaignRunSelection.value) return;
    campaignRunLoading.value = true;
    campaignRunError.value = "";
    try {
      const result = await campaignRunResource.submit({
        campaign_name: campaignRunSelection.value,
        limit: 200,
      });
      campaignRunResult.value = result || null;
      await reloadSnapshot();
    } catch (error) {
      campaignRunResult.value = null;
      campaignRunError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.message || error?.exc || t("loadErrorTitle");
    } finally {
      campaignRunLoading.value = false;
    }
  }

  return {
    showCampaignRunDialog,
    campaignRunSelection,
    campaignRunLoading,
    campaignRunError,
    campaignRunResult,
    campaignRunResource,
    runCampaignExecution,
  };
}
