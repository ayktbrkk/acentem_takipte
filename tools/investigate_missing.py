#!/usr/bin/env python3
"""
Investigate why guard reports 234 missing when debug script says 0 still missing
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
known = {}  # source -> (row_index, original_values)
with open(en_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    header = next(reader)
    for i, row in enumerate(reader, start=2):
        if len(row) > 1:
            src = row[1]
            known[src] = (i, row)

# Debug: print first 5 missing vs known
print("First 5 missing sources:")
for src in missing[:5]:
    print(f"  '{src}'")
    if src in known:
        print(f"    >>> FOUND IN CSV at row {known[src][0]}")
    else:
        print(f"    >>> NOT found in any form")

# Check for encoding/whitespace issues
print(f"\nChecking for whitespace/encoding issues...")
for src in missing[:5]:
    # Check variations
    for variant in [src.strip(), src.strip().lower()]:
        for csv_src in list(known.keys())[:50]:  # Check first 50
            if src == csv_src:
                print(f"  Exact match: '{src}'")
                break
            elif src.encode() == csv_src.encode():
                print(f"  Bytes match but display differs:")
                print(f"    guard: {repr(src)}")
                print(f"    csv:   {repr(csv_src)}")
                break

# Summary
still_missing = [s for s in missing if s not in known]
print(f"\nSummary:")
print(f"Guard reports {len(missing)} missing")
print(f"Found {len(missing) - len(still_missing)} in CSV")
print(f"Still truly missing: {len(still_missing)}")

if still_missing:
    print("\nSample of still-missing:")
    for src in still_missing[:5]:
        print(f"  '{src}'")
