frappe.ui.form.on("AT Customer", {
  refresh(frm) {
    const roles = frappe.user_roles || [];
    const canViewSensitive =
      frappe.session.user === "Administrator" ||
      roles.includes("System Manager") ||
      roles.includes("Manager") ||
      roles.includes("Accountant");

    frm.set_df_property("tax_id", "hidden", !canViewSensitive);
    frm.set_df_property("phone", "hidden", !canViewSensitive);
    frm.set_df_property("masked_tax_id", "hidden", canViewSensitive);
    frm.set_df_property("masked_phone", "hidden", canViewSensitive);

    if (frm.is_new()) return;

    frm.add_custom_button(
      __("Open Customer 360"),
      () => {
        window.location.href = `/at/customers/${encodeURIComponent(frm.doc.name)}`;
      },
      __("Navigate")
    );

    frm.add_custom_button(
      __("Open Dashboard"),
      () => {
        window.location.href = "/at";
      },
      __("Navigate")
    );

    frm.add_custom_button(
      __("Create Offer"),
      () => {
        frappe.new_doc("AT Offer", {
          customer: frm.doc.name,
          offer_date: frappe.datetime.nowdate(),
          valid_until: frappe.datetime.add_days(frappe.datetime.nowdate(), 15),
        });
      },
      __("Create")
    );

    frm.add_custom_button(
      __("Create Lead"),
      () => {
        frappe.new_doc("AT Lead", {
          customer: frm.doc.name,
          first_name: frm.doc.full_name || null,
          email: frm.doc.email || null,
          insurance_company: null,
        });
      },
      __("Create")
    );
  },
});
