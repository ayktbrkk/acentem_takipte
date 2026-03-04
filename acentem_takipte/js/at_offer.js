frappe.ui.form.on("AT Offer", {
  refresh(frm) {
    if (frm.is_new()) return;

    const isConvertibleStatus = ["Sent", "Accepted"].includes(frm.doc.status);

    frm.add_custom_button(
      __("Open Offer Board"),
      () => {
        window.location.href = "/at/offers";
      },
      __("Navigate")
    );

    frm.add_custom_button(
      __("Open Policy Workbench"),
      () => {
        window.location.href = "/at/policies";
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

    if (frm.doc.source_lead) {
      frm.add_custom_button(__("Open Lead"), () => {
        frappe.set_route("Form", "AT Lead", frm.doc.source_lead);
      }, __("Related"));
    }

    if (!frm.doc.converted_policy && isConvertibleStatus) {
      frm.add_custom_button(__("Convert to Policy"), () => {
        frappe.prompt(
          [
            {
              fieldname: "start_date",
              label: __("Policy Start Date"),
              fieldtype: "Date",
              reqd: 1,
              default: frappe.datetime.nowdate(),
            },
            {
              fieldname: "end_date",
              label: __("Policy End Date"),
              fieldtype: "Date",
              reqd: 1,
              default: frappe.datetime.add_days(frappe.datetime.nowdate(), 365),
            },
            {
              fieldname: "net_premium",
              label: __("Net Premium"),
              fieldtype: "Currency",
              default: frm.doc.net_premium || null,
            },
            {
              fieldname: "tax_amount",
              label: __("Tax Amount"),
              fieldtype: "Currency",
              default: frm.doc.tax_amount || 0,
            },
            {
              fieldname: "commission_amount",
              label: __("Commission Amount"),
              fieldtype: "Currency",
              default: frm.doc.commission_amount || 0,
            },
            {
              fieldname: "commission",
              label: __("Commission"),
              fieldtype: "Currency",
              default: frm.doc.commission_amount || 0,
            },
            {
              fieldname: "policy_no",
              label: __("Policy Number (Optional)"),
              fieldtype: "Data",
            },
          ],
          (values) => {
            frappe.call({
              method: "acentem_takipte.doctype.at_offer.at_offer.convert_to_policy",
              args: {
                offer_name: frm.doc.name,
                start_date: values.start_date,
                end_date: values.end_date,
                commission: values.commission,
                commission_amount: values.commission_amount,
                tax_amount: values.tax_amount,
                net_premium: values.net_premium,
                policy_no: values.policy_no || null,
              },
              freeze: true,
              callback: (r) => {
                const policy = r?.message?.policy;
                if (!policy) return;
                frappe.show_alert({ message: __("Policy created: {0}", [policy]), indicator: "green" });
                frm.reload_doc();
                frappe.set_route("Form", "AT Policy", policy);
              },
            });
          },
          __("Convert Offer"),
          __("Create Policy")
        );
      }, __("Create"));
    }

    if (frm.doc.converted_policy) {
      frm.add_custom_button(__("Open Policy"), () => {
        frappe.set_route("Form", "AT Policy", frm.doc.converted_policy);
      }, __("Related"));
    }
  },
});
