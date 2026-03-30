import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

export function useOfficeBranchSelect() {
  const router = useRouter();
  const route = useRoute();
  const authStore = useAuthStore();
  const branchStore = useBranchStore();

  const copy = {
    tr: {
      scope: "Şube Kapsamı",
      allBranches: "Tüm Şubeler",
      allBranchesActive: "Tüm şubeler seçili",
      singleBranchLocked: "Sabit kapsam",
      defaultBranchPrefix: "Varsayılan şube",
      defaultBranchMissing: "Varsayılan şube tanımlı değil",
      headOfficePrefix: "Merkez şube",
      selected: "Seçili",
      searchPlaceholder: "Şube ara...",
      noResults: "Eşleşen şube bulunamadı",
      clear: "Aramayı temizle",
    },
    en: {
      scope: "Branch Scope",
      allBranches: "All Branches",
      allBranchesActive: "All branches selected",
      singleBranchLocked: "Locked scope",
      defaultBranchPrefix: "Default branch",
      defaultBranchMissing: "Default branch not set",
      headOfficePrefix: "Head office",
      selected: "Selected",
      searchPlaceholder: "Search branch...",
      noResults: "No matching branch",
      clear: "Clear search",
    },
  };

  const selectedValue = computed(() => branchStore.selected || "");
  const isLocked = computed(() => !branchStore.canAccessAll && branchStore.options.length <= 1);
  const isOpen = ref(false);
  const highlightedIndex = ref(-1);
  const pickerRef = ref(null);
  const triggerRef = ref(null);
  const searchInputRef = ref(null);
  const optionRefs = ref([]);
  const listboxId = "office-branch-scope-listbox";
  const typeaheadQuery = ref("");
  const typeaheadTimer = ref(null);
  const searchQuery = ref("");

  function t(key) {
    const locale = unref(authStore.locale) || "en";
    return copy[locale]?.[key] || copy.en[key] || key;
  }

  function buildOptionMeta(option) {
    if (!option || option.value === null) {
      return "";
    }

    const row = option.row || {};
    const detailParts = [
      Number(row.is_head_office || 0) === 1 ? t("headOfficePrefix") : "",
      String(option.code || "").trim(),
      String(option.city || "").trim(),
    ].filter(Boolean);
    return detailParts.join(" • ");
  }

  const selectableOptions = computed(() => {
    const options = branchStore.options.map((option) => ({
      value: option.value,
      label: option.label,
      meta: buildOptionMeta(option),
    }));
    if (branchStore.canAccessAll) {
      options.unshift({ value: null, label: t("allBranches"), meta: "" });
    }
    return options;
  });

  const filteredOptions = computed(() => {
    const query = normalizeOptionLabel(searchQuery.value);
    if (!query) {
      return selectableOptions.value;
    }
    return selectableOptions.value.filter((option) => {
      const label = normalizeOptionLabel(option.label);
      const meta = normalizeOptionLabel(option.meta);
      return label.includes(query) || meta.includes(query);
    });
  });

  const defaultBranchLabel = computed(() =>
    branchStore.defaultBranch?.office_branch_name || branchStore.defaultBranch?.name || "",
  );
  const headOfficeLabel = computed(() => {
    const row = branchStore.items.find((item) => Number(item?.is_head_office || 0) === 1);
    return row?.office_branch_name || row?.name || "";
  });
  const selectedLabel = computed(() => {
    if (branchStore.canAccessAll && !selectedValue.value) {
      return t("allBranches");
    }
    return branchStore.activeBranch?.office_branch_name || branchStore.activeBranch?.name || defaultBranchLabel.value || t("allBranches");
  });
  const selectedMeta = computed(() => {
    if (branchStore.canAccessAll && !selectedValue.value) {
      return t("allBranchesActive");
    }

    const activeBranch = branchStore.activeBranch;
    if (!activeBranch) {
      return "";
    }

    const detailParts = [
      String(activeBranch.office_branch_code || "").trim(),
      String(activeBranch.city || "").trim(),
    ].filter(Boolean);

    if (Number(activeBranch.is_head_office || 0) === 1) {
      detailParts.unshift(t("headOfficePrefix"));
    }
    return detailParts.join(" • ");
  });
  const helperLabel = computed(() => {
    const defaultLabel = defaultBranchLabel.value
      ? `${t("defaultBranchPrefix")}: ${defaultBranchLabel.value}`
      : t("defaultBranchMissing");
    const headLabel = headOfficeLabel.value
      ? `${t("headOfficePrefix")}: ${headOfficeLabel.value}`
      : "";
    const activeLabel = branchStore.activeBranch?.office_branch_name || branchStore.activeBranch?.name || "";

    if (branchStore.canAccessAll && !branchStore.requestBranch) {
      return [t("allBranchesActive"), headLabel, defaultLabel].filter(Boolean).join(" • ");
    }

    if (isLocked.value) {
      return [t("singleBranchLocked"), headLabel || defaultLabel].filter(Boolean).join(" • ");
    }

    const labels = [activeLabel];
    if (headLabel && headOfficeLabel.value !== activeLabel) {
      labels.push(headLabel);
    }
    if (defaultLabel && defaultBranchLabel.value !== activeLabel) {
      labels.push(defaultLabel);
    }
    return labels.filter(Boolean).join(" • ");
  });
  const activeDescendantId = computed(() => {
    if (!isOpen.value || highlightedIndex.value < 0) {
      return undefined;
    }
    return optionDomId(highlightedIndex.value);
  });

  function optionDomId(index) {
    return `office-branch-option-${index}`;
  }

  function setOptionRef(element, index) {
    optionRefs.value[index] = element || null;
  }

  function findSelectedOptionIndex() {
    const selectedIndex = filteredOptions.value.findIndex((option) => String(option.value ?? "") === selectedValue.value);
    return selectedIndex >= 0 ? selectedIndex : 0;
  }

  function setHighlightedIndex(index, options = {}) {
    const optionCount = filteredOptions.value.length;
    if (!optionCount) {
      highlightedIndex.value = -1;
      return;
    }

    const normalizedIndex = Math.min(Math.max(index, 0), optionCount - 1);
    highlightedIndex.value = normalizedIndex;

    if (options.focus) {
      nextTick(() => {
        optionRefs.value[normalizedIndex]?.focus?.();
      });
    }
  }

  function normalizeOptionLabel(label) {
    return String(label || "")
      .replace(/^[\s\-–—•]+/u, "")
      .trim()
      .toLocaleLowerCase(unref(authStore.locale) || "en");
  }

  function getHighlightedParts(text, query) {
    if (!query) {
      return [{ text, isMatch: false }];
    }

    const normalizedText = normalizeOptionLabel(text);
    const normalizedQuery = normalizeOptionLabel(query);

    if (!normalizedText.includes(normalizedQuery)) {
      return [{ text, isMatch: false }];
    }

    const lowerText = String(text || "").toLocaleLowerCase();
    const queryLower = normalizedQuery;
    const startIndex = lowerText.indexOf(queryLower);

    if (startIndex === -1) {
      return [{ text, isMatch: false }];
    }

    const parts = [];
    if (startIndex > 0) {
      parts.push({ text: text.slice(0, startIndex), isMatch: false });
    }
    parts.push({ text: text.slice(startIndex, startIndex + queryLower.length), isMatch: true });
    if (startIndex + queryLower.length < text.length) {
      parts.push({ text: text.slice(startIndex + queryLower.length), isMatch: false });
    }

    return parts;
  }

  function clearTypeahead() {
    typeaheadQuery.value = "";
    if (typeaheadTimer.value) {
      clearTimeout(typeaheadTimer.value);
      typeaheadTimer.value = null;
    }
  }

  function queueTypeaheadReset() {
    if (typeaheadTimer.value) {
      clearTimeout(typeaheadTimer.value);
    }
    typeaheadTimer.value = setTimeout(() => {
      typeaheadQuery.value = "";
      typeaheadTimer.value = null;
    }, 700);
  }

  function isTypeableCharacter(event) {
    return (
      String(event?.key || "").length === 1
      && !event.ctrlKey
      && !event.metaKey
      && !event.altKey
    );
  }

  function applyTypeahead(char) {
    const options = filteredOptions.value;
    if (!options.length) {
      return;
    }

    const nextQuery = `${typeaheadQuery.value}${char}`
      .trim()
      .toLocaleLowerCase(unref(authStore.locale) || "en");
    if (!nextQuery) {
      return;
    }

    typeaheadQuery.value = nextQuery;
    queueTypeaheadReset();

    const startIndex = highlightedIndex.value >= 0 ? highlightedIndex.value + 1 : 0;
    const orderedIndices = [
      ...Array.from({ length: options.length - startIndex }, (_, offset) => startIndex + offset),
      ...Array.from({ length: startIndex }, (_, offset) => offset),
    ];

    const matchedIndex = orderedIndices.find((index) => normalizeOptionLabel(options[index]?.label).startsWith(nextQuery));
    if (matchedIndex !== undefined) {
      setHighlightedIndex(matchedIndex, { focus: true });
    }
  }

  function openPicker(preferredIndex = null, options = {}) {
    if (isLocked.value) return;
    isOpen.value = true;
    searchQuery.value = "";
    clearTypeahead();
    const nextIndex = Number.isInteger(preferredIndex) ? preferredIndex : findSelectedOptionIndex();
    setHighlightedIndex(nextIndex, { focus: Boolean(options.focus) });
  }

  function moveHighlight(step) {
    if (!filteredOptions.value.length) {
      return;
    }
    if (!isOpen.value) {
      openPicker(step > 0 ? 0 : filteredOptions.value.length - 1, { focus: true });
      return;
    }

    const current = highlightedIndex.value >= 0 ? highlightedIndex.value : findSelectedOptionIndex();
    const maxIndex = filteredOptions.value.length - 1;
    const nextIndex = (current + step + filteredOptions.value.length) % filteredOptions.value.length;
    setHighlightedIndex(Math.min(Math.max(nextIndex, 0), maxIndex), { focus: true });
  }

  function selectHighlighted() {
    if (!isOpen.value || highlightedIndex.value < 0) {
      return;
    }
    const option = filteredOptions.value[highlightedIndex.value];
    if (!option) {
      return;
    }
    void onSelect(option.value);
  }

  function closeOpen() {
    isOpen.value = false;
    highlightedIndex.value = -1;
    searchQuery.value = "";
    clearTypeahead();
  }

  function toggleOpen() {
    if (isLocked.value) return;
    if (isOpen.value) {
      closeOpen();
      return;
    }
    openPicker();
  }

  function clearSearch() {
    searchQuery.value = "";
    searchInputRef.value?.focus?.();
  }

  function onDocumentClick(event) {
    if (!isOpen.value) return;
    if (pickerRef.value?.contains(event?.target)) return;
    closeOpen();
  }

  function onEscape(event) {
    if (event.key === "Escape") {
      closeOpen();
    }
  }

  function onTriggerKeydown(event) {
    if (isLocked.value) {
      return;
    }

    if (isTypeableCharacter(event)) {
      event.preventDefault();
      if (!isOpen.value) {
        openPicker(findSelectedOptionIndex(), { focus: true });
      }
      applyTypeahead(event.key);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen.value) {
        openPicker(findSelectedOptionIndex(), { focus: true });
        return;
      }
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen.value) {
        openPicker(findSelectedOptionIndex(), { focus: true });
        return;
      }
      moveHighlight(-1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen.value) {
        openPicker(findSelectedOptionIndex(), { focus: true });
        return;
      }
      selectHighlighted();
    }
  }

  function onListboxKeydown(event) {
    const fromSearchInput = event?.target === searchInputRef.value;

    if (fromSearchInput && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex(0, { focus: true });
      return;
    }

    if (fromSearchInput && event.key === "Escape") {
      event.preventDefault();
      closeOpen();
      triggerRef.value?.focus?.();
      return;
    }

    if (fromSearchInput) {
      return;
    }

    if (isTypeableCharacter(event)) {
      event.preventDefault();
      applyTypeahead(event.key);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(0, { focus: true });
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setHighlightedIndex(filteredOptions.value.length - 1, { focus: true });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectHighlighted();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeOpen();
      triggerRef.value?.focus?.();
    }
  }

  function onSearchInputKeydown(event) {
    if (event.key === "ArrowDown" || event.key === "Escape") {
      onListboxKeydown(event);
    }
  }

  async function onSelect(value) {
    if (isLocked.value) return;
    const nextValue = String(value || "");
    branchStore.setActiveBranch(nextValue);
    await branchStore.persistToRoute(router, route);
    closeOpen();
  }

  watch(filteredOptions, () => {
    optionRefs.value = [];
    if (!isOpen.value) {
      return;
    }
    if (!filteredOptions.value.length) {
      highlightedIndex.value = -1;
      return;
    }
    setHighlightedIndex(findSelectedOptionIndex(), { focus: false });
  });

  onMounted(() => {
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onEscape);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onEscape);
    clearTypeahead();
  });

  return {
    t,
    selectedValue,
    isLocked,
    isOpen,
    highlightedIndex,
    pickerRef,
    triggerRef,
    searchInputRef,
    optionRefs,
    listboxId,
    searchQuery,
    selectableOptions,
    filteredOptions,
    selectedLabel,
    selectedMeta,
    helperLabel,
    activeDescendantId,
    optionDomId,
    setOptionRef,
    getHighlightedParts,
    clearSearch,
    onTriggerKeydown,
    onListboxKeydown,
    onSearchInputKeydown,
    toggleOpen,
    onSelect,
    isTypeableCharacter,
  };
}
