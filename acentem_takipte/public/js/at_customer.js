function applyCustomerTypeState(frm) {
  const customerType = String(frm.doc.customer_type || "Individual");
  const isCorporate = customerType === "Corporate";
  const identityLabel = isCorporate ? __("Tax ID") : __("National ID No");

  frm.set_df_property("tax_id", "label", identityLabel);
  frm.set_df_property("birth_date", "read_only", isCorporate ? 1 : 0);
  frm.set_df_property("gender", "read_only", isCorporate ? 1 : 0);
  frm.set_df_property("marital_status", "read_only", isCorporate ? 1 : 0);
  frm.set_df_property("occupation", "read_only", isCorporate ? 1 : 0);

  if (isCorporate) {
    frm.set_value("birth_date", null);
    frm.set_value("gender", "Unknown");
    frm.set_value("marital_status", "Unknown");
    frm.set_value("occupation", null);
  }
}

frappe.ui.form.on("AT Customer", {
  validate(frm) {
    if (!frm.doc.full_name) {
      frappe.validated = false;
      frappe.msgprint(__("Full name (full_name) must be entered."));
    }
  },
  refresh(frm) {
    const navigate = (target) => {
      const url = new URL(target, window.location.origin);
      if (url.origin !== window.location.origin) return;
      window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    };
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
    applyCustomerTypeState(frm);

    if (frm.is_new()) return;

    frm.add_custom_button(
      __("Open Customer 360"),
      () => {
        navigate(`/at/customers/${encodeURIComponent(frm.doc.name)}`);
      },
      __("Navigate")
    );

    frm.add_custom_button(
      __("Open Dashboard"),
      () => {
        navigate("/at");
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

  onload(frm) {
    if (frm.is_new() && !frm.doc.customer_type) {
      frm.set_value("customer_type", "Individual");
    }
    applyCustomerTypeState(frm);
  },

  customer_type(frm) {
    applyCustomerTypeState(frm);
  },
});
