frappe.ui.form.on("AT Policy", {
  refresh(frm) {
    if (frm.is_new()) return;

    frm.add_custom_button(
      __("Open Policy Workbench"),
      () => {
        window.location.href = "/at/policies";
      },
      __("Navigate")
    );

    frm.add_custom_button(
      __("Open Renewals Board"),
      () => {
        window.location.href = "/at/renewals";
      },
      __("Navigate")
    );

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

    frm.add_custom_button(__("New Endorsement"), () => {
      frappe.new_doc("AT Policy Endorsement", {
        policy: frm.doc.name,
      });
    }, __("Create"));

    frm.add_custom_button(
      __("New Claim"),
      () => {
        frappe.new_doc("AT Claim", {
          policy: frm.doc.name,
          customer: frm.doc.customer || null,
          currency: frm.doc.currency || "TRY",
          reported_date: frappe.datetime.nowdate(),
        });
      },
      __("Create")
    );

    frm.add_custom_button(
      __("New Payment"),
      () => {
        frappe.new_doc("AT Payment", {
          policy: frm.doc.name,
          customer: frm.doc.customer || null,
          sales_entity: frm.doc.sales_entity || null,
          currency: frm.doc.currency || "TRY",
          payment_direction: "Inbound",
          payment_purpose: "Premium Collection",
          due_date: frm.doc.end_date || null,
        });
      },
      __("Create")
    );

    frm.add_custom_button(
      __("View Snapshots"),
      () => {
        frappe.set_route("List", "AT Policy Snapshot", {
          policy: frm.doc.name,
        });
      },
      __("Related")
    );
  },
});
