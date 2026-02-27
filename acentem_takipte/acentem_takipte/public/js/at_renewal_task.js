frappe.ui.form.on("AT Renewal Task", {
  refresh(frm) {
    if (frm.is_new()) return;

    frm.add_custom_button(
      __("Open Renewals Board"),
      () => {
        window.location.href = "/at/renewals";
      },
      __("Navigate")
    );

    frm.add_custom_button(
      __("Open Renewals Dashboard"),
      () => {
        window.location.href = "/at/dashboard/renewals";
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

      frm.add_custom_button(
        __("Create Offer"),
        () => {
          frappe.new_doc("AT Offer", {
            customer: frm.doc.customer || null,
            branch: frappe.defaults.get_user_default("AT Branch") || null,
            offer_date: frappe.datetime.nowdate(),
          });
        },
        __("Create")
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
  },
});
