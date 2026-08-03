import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "../state/authStore";
import { useBranchStore } from "../state/branchStore";
import { BRANCH_SCOPE_TRANSLATIONS } from "../i18n/branchScope";

export function useOfficeBranchSelect() {
  const router = useRouter();
  const route = useRoute();
  const authStore = useAuthStore();
  const branchStore = useBranchStore();

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
  const collapsedParents = ref(new Set());
  const openDirection = ref("down");
  const panelStyle = ref({});

  function t(key) {
    const locale = unref(authStore.locale) || "en";
    const normalized = String(locale).toLowerCase().startsWith("tr") ? "tr" : "en";
    return BRANCH_SCOPE_TRANSLATIONS[normalized]?.[key] || BRANCH_SCOPE_TRANSLATIONS.en[key] || key;
  }

  const allOptions = computed(() => {
    const options = branchStore.options.map((option) => ({
      value: option.value,
      name: String(option.row?.office_branch_name || option.label || "").trim(),
      code: String(option.code || "").trim(),
      city: String(option.city || "").trim(),
      isHeadOffice: Boolean(Number(option.row?.is_head_office || 0) === 1),
      isDefault: Boolean(Number(option.row?.is_default || 0) === 1),
      depth: Number(option.depth || 0),
      parent: String(option.row?.parent_office_branch || "").trim() || null,
      hasChildren: false,
    }));

    const byName = new Map(options.map((option) => [option.value, option]));
    for (const option of options) {
      if (option.parent && byName.has(option.parent)) {
        byName.get(option.parent).hasChildren = true;
      }
    }

    if (branchStore.canAccessAll) {
      options.unshift({
        value: null,
        name: t("allBranches"),
        code: "",
        city: "",
        isHeadOffice: false,
        isDefault: false,
        depth: -1,
        parent: null,
        hasChildren: false,
      });
    }
    return options;
  });

  const visibleByExpansion = computed(() => {
    const collapsed = collapsedParents.value;
    const byName = new Map(allOptions.value.map((option) => [option.value, option]));
    return allOptions.value.filter((option) => {
      if (!option.parent) {
        return true;
      }
      let current = option;
      while (current && current.parent) {
        if (collapsed.has(current.parent)) {
          return false;
        }
        current = byName.get(current.parent);
      }
      return true;
    });
  });

  function normalizeOptionLabel(label) {
    return String(label || "")
      .toLocaleLowerCase(unref(authStore.locale) || "en")
      .replace(/[\u0131]/g, "i")
      .replace(/i\u0307/g, "i")
      .replace(/[\u0307\u0327]/g, "")
      .replace(/^[\s\-–—•]+/u, "")
      .trim();
  }

  function optionMatchesQuery(option, query) {
    return [option.name, option.code, option.city]
      .map((value) => normalizeOptionLabel(value))
      .some((value) => value.includes(query));
  }

  const filteredOptions = computed(() => {
    const query = normalizeOptionLabel(searchQuery.value);
    if (!query) {
      return visibleByExpansion.value;
    }
    return allOptions.value.filter((option) => optionMatchesQuery(option, query));
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
    const activeBranch = branchStore.activeBranch;
    return (
      activeBranch?.office_branch_name
      || activeBranch?.name
      || defaultBranchLabel.value
      || t("allBranches")
    );
  });

  const selectedContextLabel = computed(() => {
    if (branchStore.canAccessAll && !selectedValue.value) {
      return t("allBranchesActive");
    }
    const activeBranch = branchStore.activeBranch;
    if (!activeBranch) {
      return "";
    }
    const parts = [
      String(activeBranch.office_branch_code || "").trim(),
      String(activeBranch.city || "").trim(),
    ].filter(Boolean);
    return parts.join(" • ");
  });

  const helperLabel = computed(() => {
    const defaultLabel = defaultBranchLabel.value
      ? `${t("defaultBranchPrefix")}: ${defaultBranchLabel.value}`
      : t("defaultBranchMissing");
    const headLabel = headOfficeLabel.value
      ? `${t("headOfficePrefix")}: ${headOfficeLabel.value}`
      : "";
    const activeLabel = selectedLabel.value;

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

    const matchedIndex = orderedIndices.find((index) =>
      normalizeOptionLabel(options[index]?.name || options[index]?.value).startsWith(nextQuery),
    );
    if (matchedIndex !== undefined) {
      setHighlightedIndex(matchedIndex, { focus: true });
    }
  }

  function computeOpenDirection() {
    if (typeof window === "undefined") {
      return;
    }
    const rect = triggerRef.value?.getBoundingClientRect?.();
    if (!rect) {
      return;
    }
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    openDirection.value = spaceBelow < 320 && spaceAbove > spaceBelow ? "up" : "down";
  }

  function computePanelPlacement() {
    if (typeof window === "undefined" || !pickerRef.value) {
      return;
    }
    const wrapperRect = pickerRef.value.getBoundingClientRect();
    const style = {};

    const panelWidth = Math.min(380, window.innerWidth - 32);
    const overflowLeft = 12 - (wrapperRect.right - panelWidth);
    if (overflowLeft > 0) {
      style.right = `${-overflowLeft}px`;
    }

    if (openDirection.value === "up") {
      style.maxHeight = `${Math.max(200, Math.min(wrapperRect.top - 16, window.innerHeight * 0.7))}px`;
    } else {
      const spaceBelow = window.innerHeight - wrapperRect.bottom;
      style.maxHeight = `${Math.max(200, Math.min(spaceBelow - 8, window.innerHeight * 0.7))}px`;
    }

    panelStyle.value = style;
  }

  function onWindowResize() {
    if (isOpen.value) {
      computeOpenDirection();
      computePanelPlacement();
    }
  }

  function openPicker(preferredIndex = null, options = {}) {
    if (isLocked.value) return;
    computeOpenDirection();
    computePanelPlacement();
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

  function toggleCollapse(option) {
    if (!option || !option.hasChildren) {
      return;
    }
    const next = new Set(collapsedParents.value);
    if (next.has(option.value)) {
      next.delete(option.value);
    } else {
      next.add(option.value);
    }
    collapsedParents.value = next;
  }

  function isBranchCollapsed(option) {
    return Boolean(option && collapsedParents.value.has(option.value));
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

  watch(isOpen, (open) => {
    if (typeof window === "undefined") {
      return;
    }
    if (open) {
      window.addEventListener("resize", onWindowResize);
    } else {
      window.removeEventListener("resize", onWindowResize);
    }
  });

  onMounted(() => {
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onEscape);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onEscape);
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", onWindowResize);
    }
    clearTypeahead();
  });

  return {
    t,
    selectedValue,
    isLocked,
    isOpen,
    openDirection,
    panelStyle,
    highlightedIndex,
    pickerRef,
    triggerRef,
    searchInputRef,
    optionRefs,
    listboxId,
    searchQuery,
    filteredOptions,
    selectedLabel,
    selectedContextLabel,
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
    toggleCollapse,
    isBranchCollapsed,
    onSelect,
    isTypeableCharacter,
  };
}
