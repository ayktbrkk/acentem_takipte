#!/usr/bin/env python3
"""
Use the EXACT scan_missing_en_keys function from localization_guard.py
to get the precise list of missing sources, then add them to en.csv.
"""
import csv
import re
from pathlib import Path
import subprocess

# Import from guard script
import sys
sys.path.insert(0, str(Path(__file__).parent))
from localization_guard import scan_missing_en_keys, git_ls_files, read_csv_rows, REPO

# Get the exact list of missing sources from the guard function
files = git_ls_files()
missing_sources = scan_missing_en_keys(files)

print(f"Guard reports {len(missing_sources)} missing sources")
print(f"First 10 missing sources:")
for src in missing_sources[:10]:
    print(f"  - {src}")

# Read current en.csv
en_csv_path = REPO / "acentem_takipte/translations/en.csv"
existing_sources = set()

with open(en_csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    next(reader)  # Skip header
    for row in reader:
        if len(row) > 1:
            existing_sources.add(row[1])

# Add ALL missing sources to CSV (they should all be unique already)
added = 0
with open(en_csv_path, 'a', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    for source in missing_sources:
        if source not in existing_sources:
            writer.writerow(['', source, ''])
            added += 1

print(f"\nAdded {added} sources to en.csv")
print(f"Total sources in en.csv: {len(existing_sources) + added}")
