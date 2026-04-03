#!/usr/bin/env python3
"""
Extract missing en.csv sources from guard output and add them to en.csv properly.
"""
import csv
import re
from pathlib import Path

def get_missing_sources():
    """Extract missing sources from localization_guard.py output"""
    import subprocess
    result = subprocess.run(
        ["python", "tools/localization_guard.py"],
        capture_output=True, text=True
    )
    
    # Parse output to find "Missing en.csv Source Keys" section
    lines = result.stdout.split('\n')
    in_missing_section = False
    missing_sources = []
    
    for line in lines:
        if "Missing en.csv Source Keys" in line:
            in_missing_section = True
            continue
        
        if in_missing_section:
            line = line.strip()
            if not line or line.startswith("="):
                break
            if line and not line.startswith("AT Accounting") and not line.startswith("AT"):
                missing_sources.append(line)
            elif line.startswith("AT "):
                missing_sources.append(line)
    
    return missing_sources

def add_to_en_csv(sources):
    """Add missing sources to en.csv"""
    en_csv_path = Path("acentem_takipte/translations/en.csv")
    
    # Read existing entries
    existing = set()
    rows = []
    
    with open(en_csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows.append(header)
        
        for row in reader:
            rows.append(row)
            if len(row) > 1:
                existing.add(row[1])
    
    # Add new sources
    added = 0
    for source in sources:
        source = source.strip()
        if not source or source in existing:
            continue
        
        # Format: context, source, target
        rows.append(["", source, ""])
        existing.add(source)
        added += 1
    
    # Write back
    with open(en_csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(rows)
    
    return added

if __name__ == "__main__":
    print("Extracting missing sources from guard output...")
    missing = get_missing_sources()
    print(f"Found {len(missing)} missing sources")
    
    if missing:
        print("Adding to en.csv...")
        added = add_to_en_csv(missing)
        print(f"Added {added} new sources to en.csv")
    else:
        print("No missing sources found")
