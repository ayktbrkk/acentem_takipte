"""
Sprint D: Index Migration for Query Performance

Adds database indexes for office_branch and sales_entity columns on frequently queried doctypes.
This optimization supports the query_isolation scope filtering introduced in Sprint D.

Doctypes indexed:
- AT Lead: (office_branch, assigned_agent)
- AT Offer: (office_branch, sales_entity)
- AT Policy: (office_branch, sales_entity)
- AT Customer: (office_branch, sales_entity)
- AT Claim: (office_branch)
- AT Payment: (office_branch)
"""

import frappe


def execute():
    """Add indexes to support query isolation filtering."""
    
    index_definitions = [
        # Lead - branch + agent filtering
        {
            "doctype": "AT Lead",
            "columns": ["office_branch", "assigned_agent"],
            "name": "at_lead_office_branch_assigned_agent_idx",
        },
        # Offer - branch + sales_entity filtering
        {
            "doctype": "AT Offer",
            "columns": ["office_branch", "sales_entity"],
            "name": "at_offer_office_branch_sales_entity_idx",
        },
        # Policy - branch + sales_entity filtering
        {
            "doctype": "AT Policy",
            "columns": ["office_branch", "sales_entity"],
            "name": "at_policy_office_branch_sales_entity_idx",
        },
        # Customer - branch + sales_entity filtering
        {
            "doctype": "AT Customer",
            "columns": ["office_branch", "sales_entity"],
            "name": "at_customer_office_branch_sales_entity_idx",
        },
        # Claim - branch filtering
        {
            "doctype": "AT Claim",
            "columns": ["office_branch"],
            "name": "at_claim_office_branch_idx",
        },
        # Payment - branch filtering
        {
            "doctype": "AT Payment",
            "columns": ["office_branch"],
            "name": "at_payment_office_branch_idx",
        },
        # Activity - branch + source filtering
        {
            "doctype": "AT Activity",
            "columns": ["office_branch", "reference_doctype", "reference_name"],
            "name": "at_activity_office_branch_reference_idx",
        },
        # Accounting Entry - branch filtering
        {
            "doctype": "AT Accounting Entry",
            "columns": ["office_branch"],
            "name": "at_accounting_entry_office_branch_idx",
        },
    ]

    for idx_def in index_definitions:
        doctype = idx_def["doctype"]
        columns = idx_def["columns"]
        idx_name = idx_def["name"]
        
        try:
            # Check if index already exists
            existing_indexes = frappe.db.sql(
                f"SHOW INDEXES FROM `tab{doctype}` WHERE Key_name = %s",
                (idx_name,),
            )
            
            if existing_indexes:
                frappe.logger().info(f"Index {idx_name} already exists for {doctype}. Skipping.")
                continue
            
            # Create the index
            columns_str = ", ".join([f"`{col}`" for col in columns])
            sql = f"ALTER TABLE `tab{doctype}` ADD INDEX {idx_name} ({columns_str})"
            
            frappe.db.sql(sql)
            frappe.logger().info(f"Created index {idx_name} on {doctype} ({columns_str})")
            
        except Exception as e:
            frappe.logger().warning(f"Failed to create index {idx_name} for {doctype}: {str(e)}")
            # Continue with other indexes even if one fails
    
    frappe.logger().info("Sprint D index migration completed.")
