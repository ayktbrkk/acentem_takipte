export function openListExport({ screen, query, format = "xlsx", limit = 1000 }) {
  const params = new URLSearchParams({
    screen: String(screen || "").trim(),
    query: JSON.stringify(query || {}),
    export_format: String(format || "xlsx").trim().toLowerCase() === "pdf" ? "pdf" : "xlsx",
    limit: String(Number(limit) > 0 ? Number(limit) : 1000),
  });
  window.open(
    `/api/method/acentem_takipte.acentem_takipte.api.list_exports.export_screen_list?${params.toString()}`,
    "_blank",
    "noopener",
  );
}

function readCsrfToken() {
  return (
    window.csrf_token ||
    window.frappe?.csrf_token ||
    window.frappe?.boot?.csrf_token ||
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ||
    ""
  );
}

function submitExportForm(action, fields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.target = "_blank";
  form.style.display = "none";

  const payload = {
    ...fields,
    csrf_token: readCsrfToken(),
  };

  Object.entries(payload).forEach(([key, value]) => {
    if (value == null) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = typeof value === "string" ? value : JSON.stringify(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

export function openTabularExport({
  permissionDoctypes = [],
  exportKey,
  title,
  columns = [],
  rows = [],
  filters = {},
  format = "xlsx",
}) {
  submitExportForm("/api/method/acentem_takipte.acentem_takipte.api.list_exports.export_tabular_payload", {
    permission_doctypes: JSON.stringify(
      Array.isArray(permissionDoctypes) ? permissionDoctypes : [permissionDoctypes],
    ),
    query: JSON.stringify({
      export_key: String(exportKey || "workbench").trim() || "workbench",
      title: title || exportKey || "Workbench",
      columns: Array.isArray(columns) ? columns : [],
      rows: Array.isArray(rows) ? rows : [],
      filters: filters || {},
    }),
    export_format: String(format || "xlsx").trim().toLowerCase() === "pdf" ? "pdf" : "xlsx",
  });
}
