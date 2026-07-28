import os, re

BASE = "/mnt/c/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src"
DOMAINS = os.path.join(BASE, "domains")

# Map of old translation imports to new
TRANS_MAP = {
    "customer_translations.js": "translations.js",
    "customer_search_translations.js": "search.js",
    "claim_translations.js": "translations.js",
    "payment_translations.js": "translations.js",
    "renewal_translations.js": "translations.js",
    "lead_translations.js": "translations.js",
    "offer_translations.js": "translations.js",
    "reconciliation_translations.js": "translations.js",
    "policy_translations.js": "translations.js",
    "communication_translations.js": "translations.js",
    "reports_translations.js": "translations.js",
    "dashboard_translations.js": "translations.js",
}

total_fixes = 0

for domain in sorted(os.listdir(DOMAINS)):
    domain_dir = os.path.join(DOMAINS, domain)
    pages_dir = os.path.join(domain_dir, "pages")
    if not os.path.exists(pages_dir):
        continue
    
    for filename in sorted(os.listdir(pages_dir)):
        if not filename.endswith((".vue", ".js")):
            continue
        
        filepath = os.path.join(pages_dir, filename)
        with open(filepath, encoding="utf-8") as f:
            content = f.read()
        
        fixes = 0
        
        # Fix translation imports: ../config/xxx → ../i18n/yyy
        for old_trans, new_trans in TRANS_MAP.items():
            old_pattern = f'"../config/{old_trans}"'
            new_pattern = f'"../i18n/{new_trans}"'
            if old_pattern in content:
                content = content.replace(old_pattern, new_pattern)
                fixes += 1
                print(f"  {domain}/pages/{filename}: {old_trans} → {new_trans}")
        
        if fixes:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            total_fixes += fixes

print(f"\nTOTAL FIXES: {total_fixes}")
