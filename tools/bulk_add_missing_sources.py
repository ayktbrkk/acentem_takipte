#!/usr/bin/env python3
"""
Extract missing sources from code using the SAME regex pattern as the guard script
and add them to en.csv
"""
import csv
import re
from pathlib import Path
from collections import OrderedDict

# Use EXACT same pattern as localization_guard.py
LOCALIZED_CALL_RE = re.compile(r"(?<!\w)(?:_|__)\(\s*([\"'])((?:\\.|(?!\1).)*)\1")

# Read existing en.csv
en_csv = Path('acentem_takipte/translations/en.csv')
known_sources = set()

with open(en_csv, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    next(reader)  # Skip header
    for row in reader:
        if len(row) > 1:
            known_sources.add(row[1])

print(f"Known sources in en.csv: {len(known_sources)}")

# Scan code for missing sources (same logic as guard script)
missing = OrderedDict()  # Preserve order
scan_dirs = [
    Path('acentem_takipte/acentem_takipte'),
    Path('frontend/src'),
]

excluded_patterns = {
    'acentem_takipte/translations/tr.csv',
    'frontend/src/generated/translations.js',
}

# Allowed files per guard allowlist
allowed_patterns = {
    'frontend/src/**/*.test.js',
    'frontend/src/**/*.spec.js',
    'frontend/src/pages/*.vue',
    'frontend/src/composables/*.js',
}

for scan_dir in scan_dirs:
    if not scan_dir.exists():
        continue
    
    for fpath in scan_dir.rglob('*'):
        try:
            rel_path = str(fpath.relative_to(Path.cwd()))
        except ValueError:
            rel_path = str(fpath)
        
        # Skip if excluded
        if rel_path in excluded_patterns:
            continue
        
        # Skip if in allowed pattern (test files, composables, pages)
        is_allowed = False
        for pattern in allowed_patterns:
            from fnmatch import fnmatch
            if fnmatch(rel_path, pattern):
                is_allowed = True
                break
        
        if is_allowed:
            continue
        
        if not fpath.is_file() or fpath.suffix not in {'.py', '.js', '.vue', '.json', '.ts', '.tsx', '.jinja', '.html'}:
            continue
        
        try:
            content = fpath.read_text(encoding='utf-8', errors='ignore')
            
            for match in LOCALIZED_CALL_RE.finditer(content):
                source = match.group(2).strip()
                
                # Skip empty sources and known sources
                if not source or source in known_sources:
                    continue
                
                # Store first occurrence location
                if source not in missing:
                    missing[source] = str(fpath)
        except Exception as e:
            pass

print(f"Missing sources found: {len(missing)}")

# Append to en.csv
added = 0
with open(en_csv, 'a', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    for source in missing.keys():
        writer.writerow(['', source, ''])
        added += 1

print(f"Added {added} sources to en.csv")
