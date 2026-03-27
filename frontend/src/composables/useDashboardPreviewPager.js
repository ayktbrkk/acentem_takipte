import { reactive, unref } from "vue";

export function useDashboardPreviewPager({
  pageSize = 5,
  fetchLimit = 20,
  initialPages = {},
} = {}) {
  const previewPages = reactive({
    ...initialPages,
  });

  function previewPageCount(items) {
    return Math.max(1, Math.ceil(asArray(unref(items)).length / pageSize));
  }

  function previewResolvedPage(key, items) {
    return Math.min(previewPages[key] || 1, previewPageCount(items));
  }

  function pagedPreviewItems(items, key) {
    const rows = asArray(unref(items));
    const page = previewResolvedPage(key, rows);
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }

  function setPreviewPage(key, page, items) {
    const maxPage = previewPageCount(items);
    previewPages[key] = Math.min(Math.max(Number(page) || 1, 1), maxPage);
  }

  function shouldShowPreviewPager(items) {
    return previewPageCount(items) > 1;
  }

  function shouldShowViewAll(items) {
    return asArray(unref(items)).length >= fetchLimit;
  }

  return {
    previewPages,
    previewPageCount,
    previewResolvedPage,
    pagedPreviewItems,
    setPreviewPage,
    shouldShowPreviewPager,
    shouldShowViewAll,
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}
