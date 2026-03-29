import { reactive, ref } from "vue";

export function useOfferBoardConversion({
  offerListRows,
  offerLookupResource,
  offers,
  offersResource,
  openOfferDetail,
  openPolicyDetail,
  refreshOfferList,
  route,
  router,
  setOfferViewMode,
  t,
  convertResource,
}) {
  const showConvertDialog = ref(false);
  const selectedOffer = ref(null);
  const convertLoading = ref(false);
  const convertError = ref("");
  const convertForm = reactive({
    start_date: today(),
    end_date: oneYearLater(),
    net_premium: "",
    tax_amount: "0",
    commission_amount: "0",
    policy_no: "",
  });

  function isConvertible(offer) {
    return !offer?.converted_policy && ["Sent", "Accepted"].includes(String(offer?.status || ""));
  }

  function openConvertDialog(offer) {
    selectedOffer.value = offer;
    convertError.value = "";
    convertForm.start_date = today();
    convertForm.end_date = oneYearLater();
    convertForm.net_premium = Number(offer?.net_premium || 0) > 0 ? String(offer.net_premium) : "";
    convertForm.tax_amount = String(Number(offer?.tax_amount || 0));
    convertForm.commission_amount = String(Number(offer?.commission_amount || 0));
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
      await offersResource.reload();
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

  async function consumeOfferRouteIntents() {
    if (String(route.query?.convert_offer || "").trim()) {
      await consumeConvertOfferRouteIntent();
    }
  }

  return {
    convertError,
    convertForm,
    convertLoading,
    convertOffer,
    consumeConvertOfferRouteIntent,
    consumeOfferRouteIntents,
    isConvertible,
    openConvertDialog,
    selectedOffer,
    showConvertDialog,
  };
}

function today() {
  return formatDate(new Date());
}

function oneYearLater() {
  const date = new Date();
  date.setDate(date.getDate() + 365);
  return formatDate(date);
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
