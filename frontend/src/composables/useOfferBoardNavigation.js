import { computed } from "vue";

export function useOfferBoardNavigation({ offers, router, t }) {
  const laneRows = (laneKey) =>
    offers.value.filter((offer) => normalizeLane(offer.status, offer.converted_policy) === laneKey);

  function openPolicyDetail(policyName) {
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function openOfferDetail(offerName) {
    if (!offerName) return;
    router.push({ name: "offer-detail", params: { name: offerName } });
  }

  const lanes = computed(() => [
    { key: "Draft", label: t("draftLane"), borderClass: "border-t-amber-400" },
    { key: "Sent", label: t("sentLane"), borderClass: "border-t-sky-400" },
    { key: "Accepted", label: t("acceptedLane"), borderClass: "border-t-emerald-400" },
    { key: "Converted", label: t("convertedLane"), borderClass: "border-t-indigo-400" },
  ]);

  return {
    lanes,
    laneRows,
    openOfferDetail,
    openPolicyDetail,
  };
}

function normalizeLane(status, convertedPolicy) {
  if (convertedPolicy || status === "Converted") return "Converted";
  if (status === "Accepted") return "Accepted";
  if (status === "Sent") return "Sent";
  return "Draft";
}
