#!/usr/bin/env python3
"""
Debug: Print the exact list of 234 missing sources from the guard function,
and compare with what's in en.csv
"""
import csv
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from localization_guard import scan_missing_en_keys, git_ls_files

files = git_ls_files()
missing = scan_missing_en_keys(files)

# Read en.csv
en_path = Path("acentem_takipte/translations/en.csv")
known = set()
with open(en_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        if len(row) > 1:
            known.add(row[1])

# Which missing sources are actually not in en.csv?
still_missing = [s for s in missing if s not in known]

print(f"Guard: {len(missing)} sources missing")
print(f"In en.csv: {len(known)} sources known")
print(f"Still missing after bulk add: {len(still_missing)}")
print()
print("Still missing sources:")
for src in sorted(still_missing)[:20]:
    print(f"  ' {src} '")

if still_missing:
    print(f"\n... and {len(still_missing) - 20} more") if len(still_missing) > 20 else None

# Also check for duplicates in missing list
if len(missing) != len(set(missing)):
    print(f"\nWARNING: Guard reported {len(missing)} but {len(set(missing))} unique sources")
