frappe.provide("frappe.treeview_settings");

frappe.treeview_settings["AT Office Branch"] = {
  title: __("Office Branch Hierarchy"),
  breadcrumb: __("Acentem Takipte"),
  get_tree_root: false,
  onload(treeview) {
    if (treeview?.page?.set_title) {
      treeview.page.set_title(__("Office Branch Hierarchy"));
    }
    if (treeview?.page?.set_indicator) {
      treeview.page.set_indicator(__("Tree Active"), "green");
    }
  },
};
