import { watch } from "vue";

export function useOfferBoardBootstrap({
  applyOfferPreset,
  branchSelected,
  hydrateOfferPresetStateFromServer,
  offerListPagination,
  offerPresetKey,
  consumeQuickOfferRouteIntent,
  consumeOfferRouteIntents,
  refreshOffers,
}) {
  applyOfferPreset(offerPresetKey.value, { refresh: false });
  void refreshOffers();
  watch(
    branchSelected,
    () => {
      offerListPagination.page = 1;
      void refreshOffers();
    },
  );
  void hydrateOfferPresetStateFromServer();
  void consumeQuickOfferRouteIntent();
  void consumeOfferRouteIntents();
}
