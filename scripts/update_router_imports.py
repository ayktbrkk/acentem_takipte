import re

page_to_domain = {
    "LeadList": "leads", "LeadDetail": "leads",
    "OfferBoard": "offers", "OfferDetail": "offers",
    "PolicyList": "policies", "PolicyDetail": "policies",
    "CustomerList": "customers", "CustomerDetail": "customers", "CustomerSearchPage": "customers",
    "ClaimsBoard": "claims", "ClaimDetail": "claims", "ClaimRatioReport": "claims",
    "PaymentsBoard": "payments", "PaymentDetail": "payments",
    "RenewalsBoard": "renewals", "RenewalTaskDetail": "renewals",
    "ReconciliationWorkbench": "reconciliation", "ReconciliationDetail": "reconciliation",
    "CommunicationHub": "communication",
    "Reports": "reports", "PremiumReport": "reports", "AgentPerformanceReport": "reports", "CustomerSegmentationReport": "reports",
    "AdminGeneralSettings": "admin", "AdminAlertChannelsSettings": "admin",
    "Dashboard": "dashboard",
}

for router_path in [
    "/mnt/c/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/router/index.js",
    "/mnt/c/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/platform/router/index.js",
]:
    with open(router_path) as f:
        content = f.read()
    
    changes = 0
    for component, domain in page_to_domain.items():
        old = f'pages/{component}.vue'
        new = f'domains/{domain}/pages/{component}.vue'
        count = content.count(old)
        if count:
            content = content.replace(old, new)
            changes += count
    
    with open(router_path, "w") as f:
        f.write(content)
    filename = router_path.split("/")[-1]
    print(f"{filename}: {changes} imports updated")
