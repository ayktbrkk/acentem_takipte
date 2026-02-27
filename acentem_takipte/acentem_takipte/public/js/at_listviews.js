(() => {
  function goToUrl(url) {
    if (!url) return;
    window.location.href = url;
  }

  function addInnerButtonOnce(listview, label, action, group) {
    if (!listview?.page || !label || typeof action !== "function") return;

    listview.__atAddedButtons = listview.__atAddedButtons || {};
    const key = `${group || "root"}::${label}`;
    if (listview.__atAddedButtons[key]) return;

    if (group) {
      listview.page.add_inner_button(label, action, group);
    } else {
      listview.page.add_inner_button(label, action);
    }

    listview.__atAddedButtons[key] = true;
  }

  function docRowButton({
    label,
    show,
    action,
    description,
  }) {
    return {
      show(doc) {
        try {
          return show ? !!show(doc) : true;
        } catch (error) {
          return false;
        }
      },
      get_label(doc) {
        return typeof label === "function" ? label(doc) : label;
      },
      get_description(doc) {
        return typeof description === "function" ? description(doc) : description || "";
      },
      action(doc) {
        action?.(doc);
      },
    };
  }

  function openForm(doctype, name) {
    if (!doctype || !name) return;
    frappe.set_route("Form", doctype, name);
  }

  function newDoc(doctype, defaults) {
    frappe.new_doc(doctype, defaults || {});
  }

  function indicatorForStatus(status, map, fallback) {
    const row = map[status];
    if (row) {
      return [__(row.label || status), row.color || "gray", `status,=,${status}`];
    }
    if (fallback) {
      return [__(status || fallback.label), fallback.color || "gray", fallback.filter || ""].filter(Boolean);
    }
    return [__(status || "Unknown"), "gray", ""];
  }

  function indicatorForField(fieldname, value, map) {
    const row = map[value] || { label: value || "Unknown", color: "gray" };
    return [__(row.label), row.color, `${fieldname},=,${value}`];
  }

  const leadStatusMap = {
    Draft: { label: "Draft", color: "gray" },
    Open: { label: "Open", color: "orange" },
    Replied: { label: "Replied", color: "blue" },
    Closed: { label: "Closed", color: "green" },
  };

  const offerStatusMap = {
    Draft: { label: "Draft", color: "gray" },
    Sent: { label: "Sent", color: "blue" },
    Accepted: { label: "Accepted", color: "green" },
    Rejected: { label: "Rejected", color: "red" },
    Converted: { label: "Converted", color: "purple" },
  };

  const policyStatusMap = {
    Active: { label: "Active", color: "green" },
    KYT: { label: "KYT", color: "orange" },
    IPT: { label: "IPT", color: "red" },
  };

  const claimStatusMap = {
    Draft: { label: "Draft", color: "gray" },
    Open: { label: "Open", color: "orange" },
    "Under Review": { label: "Under Review", color: "blue" },
    Approved: { label: "Approved", color: "green" },
    Rejected: { label: "Rejected", color: "red" },
    Paid: { label: "Paid", color: "green" },
    Closed: { label: "Closed", color: "darkgrey" },
  };

  const paymentStatusMap = {
    Draft: { label: "Draft", color: "gray" },
    Paid: { label: "Paid", color: "green" },
    Cancelled: { label: "Cancelled", color: "red" },
  };

  const renewalStatusMap = {
    Open: { label: "Open", color: "orange" },
    "In Progress": { label: "In Progress", color: "blue" },
    Done: { label: "Done", color: "green" },
    Cancelled: { label: "Cancelled", color: "red" },
  };

  const consentStatusMap = {
    Unknown: { label: "Unknown", color: "gray" },
    Granted: { label: "Granted", color: "green" },
    Revoked: { label: "Revoked", color: "red" },
  };

  frappe.listview_settings["AT Lead"] = {
    add_fields: [
      "status",
      "customer",
      "insurance_company",
      "estimated_gross_premium",
      "converted_offer",
      "converted_policy",
      "email",
    ],
    get_indicator(doc) {
      return indicatorForField("status", doc.status, leadStatusMap);
    },
    button: docRowButton({
      label: (doc) => (doc.converted_offer ? __("Open Offer") : __("Open")),
      description: (doc) =>
        doc.converted_offer ? __("Open linked offer {0}", [doc.converted_offer]) : __("Open lead form"),
      show: (doc) => Boolean(doc.name),
      action(doc) {
        if (doc.converted_offer) {
          openForm("AT Offer", doc.converted_offer);
          return;
        }
        openForm("AT Lead", doc.name);
      },
    }),
    onload(listview) {
      addInnerButtonOnce(listview, __("Open Sales Dashboard"), () => goToUrl("/at/dashboard/sales"), __("Navigate"));
      addInnerButtonOnce(listview, __("Open Offers"), () => goToUrl("/at/offers"), __("Navigate"));
      addInnerButtonOnce(listview, __("New Lead"), () => newDoc("AT Lead"), __("Create"));
    },
  };

  frappe.listview_settings["AT Offer"] = {
    add_fields: ["status", "customer", "insurance_company", "valid_until", "gross_premium", "converted_policy"],
    get_indicator(doc) {
      return indicatorForField("status", doc.status, offerStatusMap);
    },
    button: docRowButton({
      label: (doc) => (doc.converted_policy ? __("Open Policy") : __("Open")),
      description: (doc) =>
        doc.converted_policy ? __("Open linked policy {0}", [doc.converted_policy]) : __("Open offer form"),
      show: (doc) => Boolean(doc.name),
      action(doc) {
        if (doc.converted_policy) {
          openForm("AT Policy", doc.converted_policy);
          return;
        }
        openForm("AT Offer", doc.name);
      },
    }),
    onload(listview) {
      addInnerButtonOnce(listview, __("Open Offer Board"), () => goToUrl("/at/offers"), __("Navigate"));
      addInnerButtonOnce(listview, __("Open Policy Workbench"), () => goToUrl("/at/policies"), __("Navigate"));
      addInnerButtonOnce(listview, __("New Offer"), () => newDoc("AT Offer"), __("Create"));
    },
  };

  frappe.listview_settings["AT Policy"] = {
    add_fields: ["status", "customer", "insurance_company", "end_date", "gross_premium", "policy_no"],
    get_indicator(doc) {
      return indicatorForField("status", doc.status, policyStatusMap);
    },
    button: docRowButton({
      label: __("Open Desk"),
      description: __("Open policy form"),
      show: (doc) => Boolean(doc.name),
      action(doc) {
        openForm("AT Policy", doc.name);
      },
    }),
    onload(listview) {
      addInnerButtonOnce(listview, __("Open Policy Workbench"), () => goToUrl("/at/policies"), __("Navigate"));
      addInnerButtonOnce(listview, __("Open Renewals Board"), () => goToUrl("/at/renewals"), __("Navigate"));
      addInnerButtonOnce(listview, __("New Policy"), () => newDoc("AT Policy"), __("Create"));
    },
  };

  frappe.listview_settings["AT Customer"] = {
    add_fields: ["full_name", "phone", "masked_phone", "email", "assigned_agent", "consent_status"],
    get_indicator(doc) {
      return indicatorForField("consent_status", doc.consent_status || "Unknown", consentStatusMap);
    },
    button: docRowButton({
      label: __("Customer 360"),
      description: __("Open customer 360 page"),
      show: (doc) => Boolean(doc.name),
      action(doc) {
        goToUrl(`/at/customers/${encodeURIComponent(doc.name)}`);
      },
    }),
    onload(listview) {
      addInnerButtonOnce(listview, __("Open Dashboard"), () => goToUrl("/at"), __("Navigate"));
      addInnerButtonOnce(listview, __("New Customer"), () => newDoc("AT Customer"), __("Create"));
    },
  };

  frappe.listview_settings["AT Claim"] = {
    add_fields: ["claim_status", "policy", "customer", "approved_amount", "paid_amount", "reported_date"],
    get_indicator(doc) {
      return indicatorForField("claim_status", doc.claim_status, claimStatusMap);
    },
    button: docRowButton({
      label: __("Open"),
      description: __("Open claim form"),
      show: (doc) => Boolean(doc.name),
      action(doc) {
        openForm("AT Claim", doc.name);
      },
    }),
    onload(listview) {
      addInnerButtonOnce(listview, __("Open Claims Board"), () => goToUrl("/at/claims"), __("Navigate"));
      addInnerButtonOnce(listview, __("New Claim"), () => newDoc("AT Claim"), __("Create"));
    },
  };

  frappe.listview_settings["AT Payment"] = {
    add_fields: ["status", "payment_direction", "payment_purpose", "customer", "policy", "claim", "due_date", "amount_try", "amount"],
    get_indicator(doc) {
      return indicatorForField("status", doc.status, paymentStatusMap);
    },
    button: docRowButton({
      label: (doc) => (doc.status === "Draft" ? __("Record") : __("Open")),
      description: __("Open payment form"),
      show: (doc) => Boolean(doc.name),
      action(doc) {
        openForm("AT Payment", doc.name);
      },
    }),
    onload(listview) {
      addInnerButtonOnce(listview, __("Open Payments Board"), () => goToUrl("/at/payments"), __("Navigate"));
      addInnerButtonOnce(listview, __("New Payment"), () => newDoc("AT Payment"), __("Create"));
    },
  };

  frappe.listview_settings["AT Renewal Task"] = {
    add_fields: ["status", "policy", "customer", "renewal_date", "due_date", "assigned_to", "auto_created"],
    get_indicator(doc) {
      return indicatorForField("status", doc.status, renewalStatusMap);
    },
    button: docRowButton({
      label: __("Open"),
      description: __("Open renewal task form"),
      show: (doc) => Boolean(doc.name),
      action(doc) {
        openForm("AT Renewal Task", doc.name);
      },
    }),
    onload(listview) {
      addInnerButtonOnce(listview, __("Open Renewals Board"), () => goToUrl("/at/renewals"), __("Navigate"));
      addInnerButtonOnce(listview, __("Open Dashboard"), () => goToUrl("/at/dashboard/renewals"), __("Navigate"));
      addInnerButtonOnce(listview, __("New Renewal Task"), () => newDoc("AT Renewal Task"), __("Create"));
    },
  };
})();
