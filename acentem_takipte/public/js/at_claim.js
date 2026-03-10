frappe.ui.form.on("AT Claim", {
  refresh(frm) {
    const navigate = (target) => {
      const url = new URL(target, window.location.origin);
      if (url.origin !== window.location.origin) return;
      window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    };
    if (frm.is_new()) return;

    frm.add_custom_button(
      __("Open Claims Board"),
      () => {
        navigate("/at/claims");
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
          navigate(`/at/customers/${encodeURIComponent(frm.doc.customer)}`);
        },
        __("Related")
      );
    }

    frm.add_custom_button(
      __("Record Claim Payout"),
      () => {
        frappe.new_doc("AT Payment", {
          claim: frm.doc.name,
          policy: frm.doc.policy || null,
          customer: frm.doc.customer || null,
          payment_direction: "Outbound",
          payment_purpose: "Claim Payout",
          currency: frm.doc.currency || "TRY",
          amount: frm.doc.approved_amount || frm.doc.estimated_amount || 0,
        });
      },
      __("Create")
    );
  },
});
