function atOfficeBranchIsHead(frm) {
  return Number(frm.doc.is_head_office || 0) === 1;
}

function atOfficeBranchSetParentState(frm) {
  const isHeadOffice = atOfficeBranchIsHead(frm);
  frm.set_df_property("parent_office_branch", "read_only", isHeadOffice ? 1 : 0);
  if (isHeadOffice && frm.doc.parent_office_branch) {
    frm.set_value("parent_office_branch", null);
  }
}

function atOfficeBranchSetContext(frm) {
  const details = [];
  if (atOfficeBranchIsHead(frm)) {
    details.push(__("Head Office / Tree Root"));
  } else {
    details.push(__("Child Branch"));
  }
  if (frm.doc.parent_office_branch) {
    details.push(`${__("Parent")}: ${frm.doc.parent_office_branch}`);
  }
  if (frm.doc.office_branch_code) {
    details.push(`${__("Code")}: ${frm.doc.office_branch_code}`);
  }

  frm.set_intro(details.join(" • "), atOfficeBranchIsHead(frm) ? "blue" : "green");
  if (frm.dashboard?.clear_headline) {
    frm.dashboard.clear_headline();
  }
  if (frm.dashboard?.set_headline) {
    frm.dashboard.set_headline(details.join(" • "));
  }
}

frappe.ui.form.on("AT Office Branch", {
  refresh(frm) {
    atOfficeBranchSetParentState(frm);
    atOfficeBranchSetContext(frm);

    if (!frm.__atOfficeBranchTreeButtonBound) {
      frm.add_custom_button(__("Open Tree"), () => {
        window.location.assign("/app/at-office-branch");
      }, __("Navigate"));
      frm.__atOfficeBranchTreeButtonBound = true;
    }
  },

  is_head_office(frm) {
    atOfficeBranchSetParentState(frm);
    atOfficeBranchSetContext(frm);
  },

  parent_office_branch(frm) {
    atOfficeBranchSetContext(frm);
  },
});
