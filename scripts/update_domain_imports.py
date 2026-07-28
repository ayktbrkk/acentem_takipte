import os, re

BASE = "/mnt/c/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src"

# Which composables are now domain-specific (moved to domains/X/composables/)
DOMAIN_COMPOSABLES = {
    "leads": ["useLeadListFilters", "useLeadListTableData", "useLeadDetailRuntime", "useLeadBoardRuntime"],
    "offers": ["useOfferDetailRuntime", "useOfferBoardConversion", "useOfferBoardFilters", "useOfferBoardQuickOffer", "useOfferBoardState", "offerListTableModel"],
    "policies": ["usePolicyDetailRuntime", "usePolicyEndorsementQuickRuntime"],
    "customers": ["useCustomerDetailRuntime", "useCustomerListRuntime", "useGlobalCustomerSearch"],
    "claims": ["useClaimDetailRuntime", "useClaimsBoardRuntime", "useClaimsBoardConversion", "useClaimsBoardFilters", "useClaimsBoardQuickClaim", "useClaimsBoardState"],
    "payments": ["usePaymentDetailRuntime", "usePaymentsBoardRuntime", "usePaymentsBoardQuickPayment"],
    "renewals": ["useRenewalTaskDetailRuntime", "useRenewalsBoardRuntime", "useRenewalsBoardQuickRenewal"],
    "reconciliation": ["useReconciliationWorkbenchRuntime", "useReconciliationWorkbenchSummary", "useReconciliationDetailRuntime"],
    "communication": ["useCommunicationCenterRuntime"],
    "reports": ["useReportsRuntime", "reportsConfig"],
    "dashboard": ["useDashboardFacts", "useDashboardFormatters", "useDashboardRuntime", "useDashboardSales"],
}

# Which translation configs are now domain-specific
DOMAIN_TRANSLATIONS = {
    "leads": "lead_translations.js",
    "offers": "offer_translations.js",
    "policies": "policy_translations.js",
    "customers": "customer_translations.js",
    "claims": "claim_translations.js",
    "payments": "payment_translations.js",
    "renewals": "renewal_translations.js",
    "reconciliation": "reconciliation_translations.js",
    "communication": "communication_translations.js",
    "reports": "reports_translations.js",
    "dashboard": "dashboard_translations.js",
}

# Step 1: Update imports WITHIN domain page files
for domain in DOMAIN_COMPOSABLES:
    pages_dir = os.path.join(BASE, "domains", domain, "pages")
    if not os.path.exists(pages_dir):
        continue
    
    for filename in os.listdir(pages_dir):
        if not filename.endswith(".vue"):
            continue
        
        filepath = os.path.join(pages_dir, filename)
        with open(filepath) as f:
            content = f.read()
        
        changes = 0
        
        # Update composable imports: ../composables/useXxx → ./composables/useXxx (if in same domain)
        # But pages import from ../composables/ relative to pages/
        for comp_name in DOMAIN_COMPOSABLES.get(domain, []):
            old = f'"../composables/{comp_name}"'
            new = f'"../composables/{comp_name}"'
            if old in content:
                # Already correct if composables are in ../composables from pages/
                pass
        
        # Update translation imports: ../config/xxx_translations → ../i18n/translations
        trans_file = DOMAIN_TRANSLATIONS.get(domain)
        if trans_file:
            old_config = f'"../config/{trans_file}"'
            new_i18n = f'"../i18n/translations"'
            if old_config in content:
                content = content.replace(old_config, new_i18n)
                changes += 1
        
        if changes:
            with open(filepath, "w") as f:
                f.write(content)
            print(f"  {domain}/pages/{filename}: {changes} imports updated")

# Step 2: Update imports in domain composable files  
for domain in DOMAIN_COMPOSABLES:
    comp_dir = os.path.join(BASE, "domains", domain, "composables")
    if not os.path.exists(comp_dir):
        continue
    
    for filename in sorted(os.listdir(comp_dir)):
        if not filename.endswith((".js", ".vue")):
            continue
        
        filepath = os.path.join(comp_dir, filename)
        with open(filepath) as f:
            content = f.read()
        
        changes = 0
        
        # Fix translation imports
        trans_file = DOMAIN_TRANSLATIONS.get(domain)
        if trans_file:
            old = f'"../config/{trans_file}"'
            new = f'"../i18n/translations"'
            if old in content:
                content = content.replace(old, new)
                changes += 1
        
        if changes:
            with open(filepath, "w") as f:
                f.write(content)
            print(f"  {domain}/composables/{filename}: {changes} imports updated")

print("\nDOMAIN IMPORTS UPDATED")
