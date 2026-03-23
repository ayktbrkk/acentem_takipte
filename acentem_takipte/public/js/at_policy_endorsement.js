frappe.ui.form.on("AT Policy Endorsement", {
  refresh(frm) {
    if (frm.is_new()) return;

    if (frm.doc.status !== "Applied") {
      frm.add_custom_button(__("Apply Endorsement"), () => {
        frappe.call({
          method:
            "acentem_takipte.doctype.at_policy_endorsement.at_policy_endorsement.apply_endorsement",
          args: {
            endorsement_name: frm.doc.name,
          },
          freeze: true,
          callback: (r) => {
            const policy = r?.message?.policy;
            if (!policy) return;
            frappe.show_alert({
              message: __("Endorsement applied to {0}", [policy]),
              indicator: "green",
            });
            frm.reload_doc();
          },
        });
      });
    }

    if (frm.doc.snapshot_record) {
      frm.add_custom_button(
        __("Open Snapshot"),
        () => {
          frappe.set_route("Form", "AT Policy Snapshot", frm.doc.snapshot_record);
        },
        __("View")
      );
    }
  },
});

