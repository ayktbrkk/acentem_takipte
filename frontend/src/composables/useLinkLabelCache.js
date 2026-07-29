import { ref, watch } from "vue";

const KNOWN_LINKS = {
  "AT-BR": { doctype: "AT Branch", display: "branch_name" },
  "AT-IC": { doctype: "AT Insurance Company", display: "company_name" },
  "AT-OB": { doctype: "AT Office Branch", display: "office_branch_name" },
  "AT-NTF": { doctype: "AT Notification Template", display: "template_key" },
  "AT-CUST": { doctype: "AT Customer", display: "full_name" },
  "AT-ENT": { doctype: "AT Sales Entity", display: "full_name" },
  "AT-POL": { doctype: "AT Policy", display: "policy_no" },
  "AT-CLM": { doctype: "AT Claim", display: "claim_no" },
  "AT-PAY": { doctype: "AT Payment", display: "payment_no" },
  "AT-SEG": { doctype: "AT Segment", display: "segment_name" },
  "AT-CAMP": { doctype: "AT Campaign", display: "campaign_name" },
  "AT-ACC": { doctype: "AT Accounting Entry", display: "name" },
  "AT-OFF": { doctype: "AT Offer", display: "name" },
  "AT-LEAD": { doctype: "AT Lead", display: "first_name" },
  "AT-REN": { doctype: "AT Renewal Task", display: "name" },
  "AT-TASK": { doctype: "AT Task", display: "task_title" },
  "AT-REM": { doctype: "AT Reminder", display: "reminder_title" },
  "AT-CALL": { doctype: "AT Call Note", display: "name" },
  "AT-DOC": { doctype: "AT Document", display: "display_name" },
  "AT-OUT": { doctype: "AT Notification Outbox", display: "name" },
  "AT-NOTIF": { doctype: "AT Notification Draft", display: "name" },
  "AT-REC": { doctype: "AT Reconciliation Item", display: "name" },
};

const _pendingLookups = new Set();
const _cache = ref({});
const _cacheStamp = ref(0);

function _markCache() {
  _cacheStamp.value += 1;
}

function resolveDoctype(name) {
  const key = String(name || "").trim();
  const parts = key.split("-");
  // Try AT-XX prefix (2 segments)
  if (parts.length >= 2) {
    const prefix = parts.slice(0, 2).join("-");
    if (KNOWN_LINKS[prefix]) return KNOWN_LINKS[prefix];
  }
  // Try AT-XXXXX format (older naming)
  if (parts.length >= 2 && parts[0] === "AT") {
    const prefix = parts.slice(0, 2).join("-");
    if (KNOWN_LINKS[prefix]) return KNOWN_LINKS[prefix];
  }
  return null;
}

export function useLinkLabelCache(config) {
  async function ensureLinkLabel(name) {
    const key = String(name || "").trim();
    if (!key || _cache.value[key] || _pendingLookups.has(key)) return;
    const meta = resolveDoctype(key);
    if (!meta) return;

    _pendingLookups.add(key);
    try {
      const csrfToken = (typeof window !== "undefined" && window.csrf_token) || "";
      const params = new URLSearchParams({
        doctype: meta.doctype,
        fields: JSON.stringify(["name", meta.display]),
        filters: JSON.stringify({ name: key }),
        limit_page_length: "1",
      });
      const resp = await fetch(`/api/method/frappe.client.get_list?${params}`, {
        headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {},
      });
      const data = resp.ok ? await resp.json() : {};
      const rows = Array.isArray(data?.message) ? data.message : [];
      const row = rows[0];
      if (row?.name) {
        _cache.value = {
          ..._cache.value,
          [key]: String(row[meta.display] || row.name),
        };
        _markCache();
      }
    } catch {
      // best-effort
    } finally {
      _pendingLookups.delete(key);
    }
  }

  function getLinkLabel(value) {
    const key = String(value ?? "").trim();
    if (!key) return value ?? "\u2014";
    void _cacheStamp.value; // track reactivity
    return _cache.value[key] || key;
  }

  function resolveLinksFromDoc(doc) {
    if (!doc) return;
    for (const [, val] of Object.entries(doc)) {
      if (typeof val === "string" && val.includes("-") && resolveDoctype(val)) {
        ensureLinkLabel(val);
      }
    }
  }

  if (config) {
    watch(
      () => config,
      () => { /* config change - cache persists */ },
      { immediate: true }
    );
  }

  return { ensureLinkLabel, getLinkLabel, resolveLinksFromDoc, resolveDoctype, _cacheStamp };
}
