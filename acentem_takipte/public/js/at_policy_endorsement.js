frappe.ui.form.on("AT Policy Endorsement", {
  validate(frm) {
    if (!frm.doc.policy) {
      frappe.validated = false;
      frappe.msgprint(__("Policy must be selected."));
    }
    if (!frm.doc.endorsement_type) {
      frappe.validated = false;
      frappe.msgprint(__("Endorsement type must be selected."));
    }
  },
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
            if (r.exc) {
              frappe.msgprint({ message: __("Endorsement could not be applied."), indicator: "red" });
              return;
            }
            const policy = r?.message?.policy;
            if (!policy) {
              frappe.msgprint({ message: __("Endorsement result could not be loaded."), indicator: "orange" });
              return;
            }
            frappe.show_alert({
              message: __("Endorsement applied to {0}", [policy]),
              indicator: "green",
            });
            frm.reload_doc();
          },
          error: () => {
            frappe.msgprint({ message: __("Server error occurred."), indicator: "red" });
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

