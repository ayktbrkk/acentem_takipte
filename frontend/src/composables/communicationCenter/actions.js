import { getSourcePanelConfig } from "../../utils/sourcePanel";

export function useCommunicationCenterActions({ router, canRetryOutboxAction, canSendDraftNowAction, referenceTypeLabel, t }) {
  function canRetryOutboxRow(row) {
    return canRetryOutboxAction.value && ["Failed", "Dead"].includes(String(row?.status || ""));
  }

  function canSendDraftFromOutboxRow(row) {
    return canSendDraftNowAction.value && row?.status !== "Sent" && Boolean(row?.draft);
  }

  function canSendDraftCard(draft) {
    return canSendDraftNowAction.value && draft?.status !== "Sent";
  }

  function sourcePanelConfig(item) {
    return getSourcePanelConfig(item?.reference_doctype, item?.reference_name);
  }

  function canOpenPanel(item) {
    return Boolean(sourcePanelConfig(item));
  }

  function panelActionLabel(item) {
    const cfg = sourcePanelConfig(item);
    return cfg ? t(cfg.labelKey) : "";
  }

  function openPanel(item) {
    const cfg = sourcePanelConfig(item);
    if (!cfg?.url) return;
    router.push(cfg.url);
  }

  return {
    canRetryOutboxRow,
    canSendDraftFromOutboxRow,
    canSendDraftCard,
    canOpenPanel,
    panelActionLabel,
    openPanel,
    referenceTypeLabel,
  };
}
