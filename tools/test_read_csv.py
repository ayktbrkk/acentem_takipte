#!/usr/bin/env python3
"""
Test the read_csv_rows function to see what it's actually reading
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from localization_guard import read_csv_rows, REPO

rows = read_csv_rows(REPO / "acentem_takipte/translations/en.csv")
print(f"read_csv_rows returned {len(rows)} rows")

# Build the same set as guard does
en_sources = {src for src, _, _ in rows}
print(f"Unique sources: {len(en_sources)}")

# Check if specific sources are in there  
test_sources = [
    'A branch cannot be the parent of itself.',
    'AT Accounting Entry office_branch column not found',
    'Seed data operations are only allowed in developer mode.'
]

for test in test_sources:
    if test in en_sources:
        print(f"✓ '{test}' found")
    else:
        print(f"✗ '{test}' NOT found")

# Print first few rows to verify structure
print("\nFirst 5 rows from read_csv_rows:")
for i, (src, tgt, ctx) in enumerate(rows[:5]):
    print(f"  [{i}] src='{src[:40]}...' | tgt='{tgt[:40] if tgt else '(empty)'}...'")
