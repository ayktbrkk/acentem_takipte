import { computed, ref } from "vue";
import { createResource } from "frappe-ui";

import { isPermissionDeniedError } from "./common";

export function useCommunicationCenterSegmentFlow({ t }) {
  const showSegmentPreviewDialog = ref(false);
  const segmentPreviewSegment = ref("");
  const segmentPreviewLoading = ref(false);
  const segmentPreviewError = ref("");
  const segmentPreviewPayload = ref(null);

  const segmentPreviewResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.preview_segment_members",
  });

  async function loadSegmentPreview() {
    if (!segmentPreviewSegment.value) return;
    segmentPreviewLoading.value = true;
    segmentPreviewError.value = "";
    try {
      const result = await segmentPreviewResource.submit({
        segment_name: segmentPreviewSegment.value,
        limit: 20,
      });
      segmentPreviewPayload.value = result || null;
    } catch (error) {
      segmentPreviewPayload.value = null;
      segmentPreviewError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedRead")
        : error?.message || error?.exc || t("loadErrorTitle");
    } finally {
      segmentPreviewLoading.value = false;
    }
  }

  return {
    showSegmentPreviewDialog,
    segmentPreviewSegment,
    segmentPreviewLoading,
    segmentPreviewError,
    segmentPreviewPayload,
    segmentPreviewResource,
    loadSegmentPreview,
    segmentPreviewSummary: computed(() => segmentPreviewPayload.value?.summary || null),
    segmentPreviewRows: computed(() => segmentPreviewPayload.value?.customers || []),
  };
}
