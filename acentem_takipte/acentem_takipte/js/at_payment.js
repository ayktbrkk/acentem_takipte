frappe.ui.form.on("AT Payment", {
  refresh(frm) {
    if (frm.is_new()) return;

    frm.add_custom_button(
      __("Open Payments Board"),
      () => {
        window.location.href = "/at/payments";
      },
      __("Navigate")
    );

    if (frm.doc.policy) {
      frm.add_custom_button(
        __("Open Policy"),
        () => {
          frappe.set_route("Form", "AT Policy", frm.doc.policy);
        },
        __("Related")
      );
    }

    if (frm.doc.claim) {
      frm.add_custom_button(
        __("Open Claim"),
        () => {
          frappe.set_route("Form", "AT Claim", frm.doc.claim);
        },
        __("Related")
      );
    }

    if (frm.doc.customer) {
      frm.add_custom_button(
        __("Open Customer"),
        () => {
          frappe.set_route("Form", "AT Customer", frm.doc.customer);
        },
        __("Related")
      );

      frm.add_custom_button(
        __("Open Customer 360"),
        () => {
          window.location.href = `/at/customers/${encodeURIComponent(frm.doc.customer)}`;
        },
        __("Related")
      );
    }

    if (frm.doc.status !== "Cancelled") {
      frm.add_custom_button(
        __("Duplicate Payment"),
        () => {
          frappe.new_doc("AT Payment", {
            policy: frm.doc.policy || null,
            claim: frm.doc.claim || null,
            customer: frm.doc.customer || null,
            sales_entity: frm.doc.sales_entity || null,
            payment_direction: frm.doc.payment_direction || null,
            payment_purpose: frm.doc.payment_purpose || null,
            due_date: frm.doc.due_date || null,
            currency: frm.doc.currency || null,
            amount: frm.doc.amount || null,
          });
        },
        __("Create")
      );
    }
  },
});
