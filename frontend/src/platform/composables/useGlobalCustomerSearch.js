import { computed, ref } from "vue";
import { useRouter } from "vue-router";

function formatTranslatedMessage(template, params = {}) {
  return Object.entries(params).reduce((message, [key, value]) => {
    return message.replace(`{${key}}`, String(value ?? ""));
  }, template);
}

export function useGlobalCustomerSearch(props, emit, t) {
  const router = useRouter();
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
      const response = await fetch("/api/method/acentem_takipte.acentem_takipte.domains.customers.api.endpoints.search_customer_by_identity", {
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
        searchError.value = errorData.message || t("searchFailed");
        return;
      }

      const data = await response.json();
      searchResult.value = data.message || data;
      showMaskedNotice.value = true;

      if (searchResult.value?.customer) {
        emit("customer-selected", searchResult.value.customer);
      }
    } catch (error) {
      searchError.value = formatTranslatedMessage(t("searchError"), {
        message: error instanceof Error ? error.message : t("unknown"),
      });
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
      router.push({ name: "customer-detail", params: { name: searchResult.value.customer.name } });
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
