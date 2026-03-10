frappe.ui.form.on("AT Lead", {
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
          method: "acentem_takipte.acentem_takipte.doctype.at_lead.at_lead.convert_to_offer",
          args: {
            lead_name: frm.doc.name,
          },
          freeze: true,
          callback: (r) => {
            const offer = r?.message?.offer;
            if (!offer) return;
            frappe.show_alert({ message: __("Offer created: {0}", [offer]), indicator: "green" });
            frm.reload_doc();
            frappe.set_route("Form", "AT Offer", offer);
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
