frappe.ui.form.on("AT Lead", {
  validate(frm) {
    if (!frm.doc.first_name && !frm.doc.last_name) {
      frappe.validated = false;
      frappe.msgprint(__("At least one first or last name must be entered."));
    }
  },
  refresh(frm) {
    const navigate = (target) => {
      const url = new URL(target, window.location.origin);
      if (url.origin !== window.location.origin) return;
      window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    };
    if (frm.is_new()) return;

    frm.add_custom_button(
      __("Open Sales Dashboard"),
      () => {
        navigate("/at/dashboard/sales");
      },
      __("Navigate")
    );

    frm.add_custom_button(
      __("Open Offer Board"),
      () => {
        navigate("/at/offers");
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
          navigate(`/at/customers/${encodeURIComponent(frm.doc.customer)}`);
        },
        __("Related")
      );
    }

    if (!frm.doc.converted_offer) {
      frm.add_custom_button(__("Convert to Offer"), () => {
        frappe.call({
          method: "acentem_takipte.doctype.at_lead.at_lead.convert_to_offer",
          args: {
            lead_name: frm.doc.name,
          },
          freeze: true,
          callback: (r) => {
            if (r.exc) {
              frappe.msgprint({ message: __("Conversion failed."), indicator: "red" });
              return;
            }
            const offer = r?.message?.offer;
            if (!offer) {
              frappe.msgprint({ message: __("Offer could not be created."), indicator: "orange" });
              return;
            }
            frappe.show_alert({ message: __("Offer created: {0}", [offer]), indicator: "green" });
            frm.reload_doc();
            frappe.set_route("Form", "AT Offer", offer);
          },
          error: () => {
            frappe.msgprint({ message: __("Server error occurred."), indicator: "red" });
          },
        });
      }, __("Create"));
    }

    if (frm.doc.converted_offer) {
      frm.add_custom_button(__("Open Offer"), () => {
        frappe.set_route("Form", "AT Offer", frm.doc.converted_offer);
      }, __("Related"));
    }

    if (frm.doc.converted_policy) {
      frm.add_custom_button(__("Open Policy"), () => {
        frappe.set_route("Form", "AT Policy", frm.doc.converted_policy);
      }, __("Related"));
    }
  },
});
