import { useRouter } from "vue-router";

export function useLeadListNavigation() {
  const router = useRouter();

  function focusLeadSearch() {
    const searchInput = document.querySelector("input[type='search'], input[placeholder*='ara'], input[placeholder*='Search']");
    if (searchInput instanceof HTMLElement) searchInput.focus();
  }

  function openLeadDetail(name) {
    router.push({ name: "lead-detail", params: { name } });
  }
  function openOfferDetail(name) {
    router.push({ name: "offer-detail", params: { name } });
  }
  function openCustomer360(name) {
    router.push({ name: "customer-detail", params: { name } });
  }
  function openPolicyDetail(name) {
    router.push({ name: "policy-detail", params: { name } });
  }

  return {
    focusLeadSearch,
    openLeadDetail,
    openOfferDetail,
    openCustomer360,
    openPolicyDetail,
  };
}
