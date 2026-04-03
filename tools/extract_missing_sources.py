#!/usr/bin/env python3
"""
Extract all missing en.csv source strings from code and output as CSV rows.
This script scans the codebase for _("...") and __("...") patterns,
identifies which ones are NOT in en.csv, and outputs them as importable CSV lines.
"""
import csv
import re
from pathlib import Path
from collections import defaultdict

# Read existing en.csv to build set of known sources
en_csv_path = Path("acentem_takipte/translations/en.csv")
known_sources = set()

with open(en_csv_path, "r", encoding="utf-8-sig") as f:
    reader = csv.reader(f)
    next(reader)  # Skip header
    for row in reader:
        if row:
            # en.csv index 1 is the source text (English column)
            known_sources.add(row[1] if len(row) > 1 else "")

# Pattern to find _("...") and __("...") calls
localization_pattern = re.compile(r'(?:_|__)\\s*\\(\\s*(["\'])(.+?)\\1\\s*(?:\\)|,|=|\\+)')

# Files to scan (excluding translations and generated files)
scan_paths = [
    Path("acentem_takipte/acentem_takipte"),
    Path("frontend/src"),
]

exclude_patterns = {
    "translations/",
    "generated/",
    "__pycache__/",
    "node_modules/",
    ".pyc",
    "test-results/",
    "playwright-report/",
}

missing_sources = defaultdict(set)  # source -> set of files where it appears

for scan_path in scan_paths:
    if not scan_path.exists():
        continue
    
    for file_path in scan_path.rglob("*"):
        # Skip excluded paths
        if any(exc in str(file_path) for exc in exclude_patterns):
            continue
        
        # Only check text files
        if file_path.is_file() and file_path.suffix in {".py", ".js", ".vue", ".html"}:
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                
                # Find all localization calls
                for match in localization_pattern.finditer(content):
                    source = match.group(2)
                    
                    # Skip if already in en.csv
                    if source not in known_sources:
                        missing_sources[source].add(str(file_path))
            except Exception as e:
                print(f"Error reading {file_path}: {e}", file=__import__('sys').stderr)

# Output missing sources as CSV rows (suitable for appending to en.csv)
print("# Missing sources found in code but not in en.csv")
print("# Usage: Append these lines to acentem_takipte/translations/en.csv")
print()

# Create output format matching en.csv structure:
# context,source,target (where target is empty for en.csv)
writer = csv.writer(__import__('sys').stdout)

for source in sorted(missing_sources.keys()):
    files = ", ".join(sorted(missing_sources[source])[:2])  # Show first 2 files
    writer.writerow(["", source, ""])

print(f"\\n# Total missing sources: {len(missing_sources)}", file=__import__('sys').stderr)
