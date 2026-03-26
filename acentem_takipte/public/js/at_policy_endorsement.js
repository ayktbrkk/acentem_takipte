frappe.ui.form.on("AT Policy Endorsement", {
  validate(frm) {
    if (!frm.doc.policy) {
      frappe.validated = false;
      frappe.msgprint(__("Poliçe seçilmelidir."));
    }
    if (!frm.doc.endorsement_type) {
      frappe.validated = false;
      frappe.msgprint(__("Zeyil türü seçilmelidir."));
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
              frappe.msgprint({ message: __("Zeyil uygulanamadı."), indicator: "red" });
              return;
            }
            const policy = r?.message?.policy;
            if (!policy) {
              frappe.msgprint({ message: __("Zeyil sonucu alınamadı."), indicator: "orange" });
              return;
            }
            frappe.show_alert({
              message: __("Endorsement applied to {0}", [policy]),
              indicator: "green",
            });
            frm.reload_doc();
          },
          error: () => {
            frappe.msgprint({ message: __("Sunucu hatası oluştu."), indicator: "red" });
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

