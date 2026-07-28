import os, re, glob

BASE = "/mnt/c/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src"
DOMAINS_DIR = os.path.join(BASE, "domains")

# Build mapping of old page paths → new domain paths
page_map = {}
for domain in sorted(os.listdir(DOMAINS_DIR)):
    pages_dir = os.path.join(DOMAINS_DIR, domain, "pages")
    if not os.path.exists(pages_dir):
        continue
    for filename in sorted(os.listdir(pages_dir)):
        if not filename.endswith(".vue"):
            continue
        old = f"../pages/{filename}"
        new = f"../domains/{domain}/pages/{filename}"
        page_map[old] = new
        old2 = f"../../pages/{filename}"
        new2 = f"../../domains/{domain}/pages/{filename}"
        page_map[old2] = new2

total_fixes = 0

# Fix all test files
for test_file in glob.glob(BASE + "/**/*.test.js", recursive=True):
    with open(test_file, encoding="utf-8") as f:
        content = f.read()
    
    fixes = 0
    for old, new in page_map.items():
        if old in content:
            content = content.replace(old, new)
            fixes += 1
    
    if fixes:
        with open(test_file, "w", encoding="utf-8") as f:
            f.write(content)
        rel = os.path.relpath(test_file, BASE)
        print(f"  {rel}: {fixes} imports fixed")
        total_fixes += fixes

print(f"\nTOTAL: {total_fixes} imports fixed")
