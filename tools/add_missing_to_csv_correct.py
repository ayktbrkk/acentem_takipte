#!/usr/bin/env python3
"""
Use the guard's scan_missing_en_keys function to get missing sources,
then add them to en.csv in the CORRECT format:  source, target, context
"""
import csv
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from localization_guard import scan_missing_en_keys, git_ls_files, read_csv_rows, REPO

# Get missing sources from guard function
files = git_ls_files()
missing_sources = scan_missing_en_keys(files)

print(f"Guard reports {len(missing_sources)} missing sources")

# Read current en.csv to check what's already there
en_path = REPO / "acentem_takipte/translations/en.csv"
current_rows = read_csv_rows(en_path)
known_sources = {src for src, _, _ in current_rows}

print(f"Currently in en.csv: {len(known_sources)} sources")

# Add missing sources in CORRECT format: source, target, context
added = 0
with open(en_path, 'a', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    for source in missing_sources:
        if source not in known_sources:
            # Format: source (col 0), empty target (col 1), empty context (col 2)
            writer.writerow([source, '', ''])
            added += 1

print(f"Added {added} new sources to en.csv")
print(f"Total sources now in en.csv: {len(known_sources) + added}")
