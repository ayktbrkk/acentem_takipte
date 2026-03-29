import { ref } from "vue";

export function useOfferBoardDragDrop({
  offers,
  offersResource,
  openConvertDialog,
  refreshOfferList,
  setDragDropError,
  t,
  updateOfferStatusResource,
}) {
  const draggedOfferName = ref("");

  function onCardDragStart(offer) {
    draggedOfferName.value = offer?.name || "";
  }

  function onCardDragEnd() {
    draggedOfferName.value = "";
  }

  function laneToStatus(laneKey) {
    if (laneKey === "Draft") return "Draft";
    if (laneKey === "Sent") return "Sent";
    if (laneKey === "Accepted") return "Accepted";
    return null;
  }

  async function onLaneDrop(laneKey) {
    try {
      const offerName = draggedOfferName.value;
      onCardDragEnd();
      if (!offerName) return;

      const current = offers.value.find((offer) => offer.name === offerName);
      if (!current || current.converted_policy) return;

      const targetStatus = laneToStatus(laneKey);
      if (!targetStatus) return;

      let nextOffer = current;
      if (current.status !== targetStatus) {
        await updateOfferStatusResource.submit({
          doctype: "AT Offer",
          name: current.name,
          fieldname: {
            status: targetStatus,
          },
        });
        await offersResource.reload();
        await refreshOfferList();
        nextOffer = (offersResource.data || []).find((offer) => offer.name === offerName) || {
          ...current,
          status: targetStatus,
        };
      }

      if (laneKey === "Accepted" && !nextOffer.converted_policy) {
        openConvertDialog(nextOffer);
      }
    } catch (error) {
      if (typeof setDragDropError === "function") {
        setDragDropError(error?.messages?.join(" ") || error?.message || t("statusUpdateFailed"));
      }
    }
  }

  return {
    draggedOfferName,
    laneToStatus,
    onCardDragEnd,
    onCardDragStart,
    onLaneDrop,
  };
}
