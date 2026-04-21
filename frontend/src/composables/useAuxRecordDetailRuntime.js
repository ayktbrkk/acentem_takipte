import { computed, onMounted, ref, unref } from "vue";
import { createResource } from "frappe-ui";

function isNotFoundError(error) {
  const message = [error?.message, error?.messages?.join?.(" "), error?.exc_type].filter(Boolean).join(" ");
  return error?.httpStatus === 404 || /404|not found|does not exist/i.test(message);
}

function getDetailDoctypeCandidates(props, config) {
  const baseDoctype = String(config.doctype || "").trim();
  if (!baseDoctype) return [];
  if (props.screenKey !== "tasks") return [baseDoctype];

  const fallbackDoctype = "AT Renewal Task";
  if (/^AT-REN-/i.test(String(props.name || "").trim())) {
    return [fallbackDoctype, baseDoctype].filter((value, index, list) => value && list.indexOf(value) === index);
  }

  return [baseDoctype, fallbackDoctype].filter((value, index, list) => value && list.indexOf(value) === index);
}

export function useAuxRecordDetailRuntime({ props, config, route, router }) {
  const resource = createResource({ url: "frappe.client.get", auto: false });
  const resolvedDoctype = ref(config.doctype);
  const activeDoctype = computed(() => resolvedDoctype.value || config.doctype);
  const activeResource = computed(() => resource);
  const activeLoading = computed(() => Boolean(unref(activeResource.value?.loading)));
  const doc = computed(() => {
    const payload = unref(resource.data);
    return payload?.docs?.[0] || payload?.message || payload || null;
  });
  const errorText = computed(() => {
    const err = unref(activeResource.value?.error);
    return err?.messages?.[0] || err?.message || "";
  });
  const isEmpty = computed(() => !activeLoading.value && !doc.value && !errorText.value);

  const activeDetailTab = ref("overview");
  const campaignDraftsResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Notification Draft",
      fields: ["name", "status", "channel", "recipient", "modified"],
      filters: {},
      order_by: "modified desc",
      limit_page_length: 20,
    },
  });
  const campaignOutboxResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Notification Outbox",
      fields: ["name", "status", "channel", "recipient", "attempt_count", "modified"],
      filters: {},
      order_by: "modified desc",
      limit_page_length: 20,
    },
  });

  async function loadDetailRecord() {
    const candidates = getDetailDoctypeCandidates(props, config);
    let lastError = null;

    for (const doctype of candidates) {
      try {
        const result = await resource.reload({ doctype, name: props.name });
        resolvedDoctype.value = doctype;
        return result;
      } catch (error) {
        lastError = error;
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  function reloadDetail() {
    const detailPromise = loadDetailRecord();
    if (config.doctype !== "AT Campaign") return detailPromise;
    campaignDraftsResource.params = {
      ...campaignDraftsResource.params,
      filters: {
        reference_doctype: "AT Campaign",
        reference_name: props.name,
      },
    };
    campaignOutboxResource.params = {
      ...campaignOutboxResource.params,
      filters: {
        reference_doctype: "AT Campaign",
        reference_name: props.name,
      },
    };
    return Promise.allSettled([
      detailPromise,
      campaignDraftsResource.reload(),
      campaignOutboxResource.reload(),
    ]).then(([detailResult]) => detailResult.value);
  }

  onMounted(() => {
    void reloadDetail();
  });

  return {
    resource,
    resolvedDoctype,
    activeDoctype,
    activeResource,
    activeLoading,
    doc,
    errorText,
    isEmpty,
    activeDetailTab,
    campaignDraftsResource,
    campaignOutboxResource,
    reloadDetail,
  };
}
