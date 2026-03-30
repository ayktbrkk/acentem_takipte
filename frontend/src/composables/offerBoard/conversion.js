import { buildQuickCreateIntentQuery, readQuickCreateIntent, stripQuickCreateIntentQuery } from "../../utils/quickRouteIntent";

function normalizeLane(status, convertedPolicy) {
  if (convertedPolicy || status === "Converted") return "Converted";
  if (status === "Accepted") return "Accepted";
  if (status === "Sent") return "Sent";
  return "Draft";
}

function laneToStatus(laneKey) {
  if (laneKey === "Draft") return "Draft";
  if (laneKey === "Sent") return "Sent";
  if (laneKey === "Accepted") return "Accepted";
  return null;
}

export function useOfferBoardConversion({
  t,
  router,
  route,
  offers,
  offerListRows,
  offerLookupResource,
  convertResource,
  updateOfferStatusResource,
  refreshOfferList,
  refreshOffers,
  setOfferViewMode,
  selectedOffer,
  convertLoading,
  convertError,
  convertForm,
  showConvertDialog,
  draggedOfferName,
  today,
  oneYearLater,
}) {
  function laneRows(laneKey) {
    return offers.value.filter((offer) => normalizeLane(offer.status, offer.converted_policy) === laneKey);
  }

  function isConvertible(offer) {
    return !offer?.converted_policy && ["Sent", "Accepted"].includes(offer?.status);
  }

  function onCardDragStart(offer) {
    draggedOfferName.value = offer?.name || "";
  }

  function onCardDragEnd() {
    draggedOfferName.value = "";
  }

  function openOfferDetail(offerName) {
    if (!offerName) return;
    router.push({ name: "offer-detail", params: { name: offerName } });
  }

  function openPolicyDetail(policyName) {
    if (!policyName) return;
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function openConvertDialog(offer) {
    selectedOffer.value = offer;
    convertError.value = "";
    convertForm.start_date = today();
    convertForm.end_date = oneYearLater();
    convertForm.net_premium = Number(offer.net_premium || 0) > 0 ? String(offer.net_premium) : "";
    convertForm.tax_amount = String(Number(offer.tax_amount || 0));
    convertForm.commission_amount = String(Number(offer.commission_amount || 0));
    convertForm.policy_no = "";
    showConvertDialog.value = true;
  }

  async function convertOffer() {
    if (!selectedOffer.value) return;
    convertLoading.value = true;
    convertError.value = "";
    try {
      const payload = await convertResource.submit({
        offer_name: selectedOffer.value.name,
        start_date: convertForm.start_date,
        end_date: convertForm.end_date,
        net_premium: convertForm.net_premium ? Number(convertForm.net_premium) : null,
        tax_amount: Number(convertForm.tax_amount || 0),
        commission_amount: Number(convertForm.commission_amount || 0),
        policy_no: convertForm.policy_no || null,
      });

      const policyName = payload?.policy || convertResource.data?.policy || null;
      showConvertDialog.value = false;
      await refreshOffers();
      await refreshOfferList();
      if (policyName) {
        openPolicyDetail(policyName);
      }
    } catch (error) {
      convertError.value = error?.messages?.join(" ") || error?.message || t("conversionFailed");
    } finally {
      convertLoading.value = false;
    }
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
        await refreshOffers();
        await refreshOfferList();
        nextOffer = (offers.value || []).find((offer) => offer.name === offerName) || {
          ...current,
          status: targetStatus,
        };
      }

      if (laneKey === "Accepted" && !nextOffer.converted_policy) {
        openConvertDialog(nextOffer);
      }
    } catch (error) {
      convertError.value = error?.messages?.join(" ") || error?.message || t("statusUpdateFailed");
    }
  }

  async function consumeConvertOfferRouteIntent() {
    const offerName = String(route.query?.convert_offer || "").trim();
    if (!offerName) return;

    const clearIntent = () => {
      const nextQuery = { ...route.query };
      delete nextQuery.convert_offer;
      router.replace({ name: "offer-board", query: nextQuery }).catch(() => {});
    };

    try {
      let targetOffer =
        offers.value.find((row) => row.name === offerName) ||
        offerListRows.value.find((row) => row.name === offerName) ||
        null;

      if (!targetOffer) {
        targetOffer = await offerLookupResource.reload({ doctype: "AT Offer", name: offerName });
      }

      if (!targetOffer) {
        convertError.value = t("conversionFailed");
        return;
      }
      if (!isConvertible(targetOffer)) {
        convertError.value = t("conversionFailed");
        return;
      }

      setOfferViewMode("list");
      openConvertDialog(targetOffer);
    } catch (error) {
      convertError.value = error?.messages?.join(" ") || error?.message || t("conversionFailed");
    } finally {
      clearIntent();
    }
  }

  async function consumeOfferRouteIntents(consumeQuickOfferRouteIntent) {
    if (String(route.query?.convert_offer || "").trim()) {
      await consumeConvertOfferRouteIntent();
      return;
    }
    consumeQuickOfferRouteIntent();
  }

  return {
    normalizeLane,
    laneRows,
    isConvertible,
    onCardDragStart,
    onCardDragEnd,
    onLaneDrop,
    laneToStatus,
    openConvertDialog,
    convertOffer,
    openPolicyDetail,
    openOfferDetail,
    consumeConvertOfferRouteIntent,
    consumeOfferRouteIntents,
  };
}
