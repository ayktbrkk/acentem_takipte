import { computed, ref } from "vue";

export function useGlobalCustomerSearch(props, emit) {
  const searchIdentity = ref("");
  const isSearching = ref(false);
  const hasSearched = ref(false);
  const searchError = ref("");
  const searchResult = ref(null);
  const showAccessForm = ref(false);
  const showMaskedNotice = ref(true);

  const hasMaskedNotice = computed(() => Boolean(searchResult.value?.is_masked && showMaskedNotice.value));

  async function performSearch() {
    if (!searchIdentity.value.trim()) return;

    isSearching.value = true;
    searchError.value = "";
    hasSearched.value = true;

    try {
      const response = await fetch("/api/method/search_customer_by_identity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": window?.frappe?.csrf_token || "",
        },
        body: JSON.stringify({
          identity_number: searchIdentity.value,
          office_branch: props.officeBranch || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        searchError.value = errorData.message || "Search failed. Please try again.";
        return;
      }

      const data = await response.json();
      searchResult.value = data.message || data;
      showMaskedNotice.value = true;

      if (searchResult.value?.customer) {
        emit("customer-selected", searchResult.value.customer);
      }
    } catch (error) {
      searchError.value = `Error searching customer: ${error instanceof Error ? error.message : "Unknown error"}`;
    } finally {
      isSearching.value = false;
    }
  }

  function openAccessRequestForm() {
    showAccessForm.value = true;
  }

  function onAccessRequestSubmitted() {
    showAccessForm.value = false;
  }

  function dismissMaskedNotice() {
    showMaskedNotice.value = false;
  }

  function openCustomerDetail() {
    if (searchResult.value?.customer?.name) {
      window.location.href = `/app/at-customer/${searchResult.value.customer.name}`;
    }
  }

  return {
    searchIdentity,
    isSearching,
    hasSearched,
    searchError,
    searchResult,
    showAccessForm,
    showMaskedNotice,
    hasMaskedNotice,
    performSearch,
    openAccessRequestForm,
    onAccessRequestSubmitted,
    dismissMaskedNotice,
    openCustomerDetail,
  };
}
