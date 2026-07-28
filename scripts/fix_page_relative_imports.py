import os, re

BASE = "/mnt/c/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src"
DOMAINS = os.path.join(BASE, "domains")

# These import prefixes need an extra "../" because pages moved 2 levels deeper
# Old: "../composables/" from src/pages/ → src/composables/
# New: "../../../composables/" from src/domains/X/pages/ → src/composables/
IMPORT_FIXES = {
    '"../composables/': '"../../../composables/',
    "'../composables/": "'../../../composables/",
    '"../stores/': '"../../../stores/',
    "'../stores/": "'../../../stores/",
    '"../components/': '"../../../components/',
    "'../components/": "'../../../components/",
    '"../config/': '"../../../config/',
    "'../config/": "'../../../config/",
    '"../utils/': '"../../../utils/',
    "'../utils/": "'../../../utils/",
    '"../state/': '"../../../state/',
    "'../state/": "'../../../state/",
}

total_pages = 0
total_fixes = 0

for domain in sorted(os.listdir(DOMAINS)):
    pages_dir = os.path.join(DOMAINS, domain, "pages")
    if not os.path.exists(pages_dir):
        continue
    
    for filename in sorted(os.listdir(pages_dir)):
        if not filename.endswith((".vue", ".js")):
            continue
        
        filepath = os.path.join(pages_dir, filename)
        with open(filepath, encoding="utf-8") as f:
            content = f.read()
        
        fixes = 0
        for old, new in IMPORT_FIXES.items():
            count = content.count(old)
            if count:
                content = content.replace(old, new)
                fixes += count
        
        if fixes:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"  {domain}/pages/{filename}: {fixes} imports fixed")
            total_fixes += fixes
        
        total_pages += 1

print(f"\nTOTAL: {total_fixes} imports fixed in {total_pages} files")
