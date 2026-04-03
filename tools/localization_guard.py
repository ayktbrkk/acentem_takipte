#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

TURKISH_CHAR_RE = re.compile(r"[\u011f\u011e\u00fc\u00dc\u015f\u015e\u0130\u0131\u00f6\u00d6\u00e7\u00c7]")
BARE_THROW_RE = re.compile(r"frappe\.throw\(\s*(?!_\s*\()([\"'])")
LOCALIZED_CALL_RE = re.compile(r"(?<!\w)(?:_|__)\(\s*([\"'])((?:\\.|(?!\1).)*)\1")
PLACEHOLDER_RE = re.compile(r"\{[^{}]+\}|\$\{[^{}]+\}")

ALLOWED_TURKISH_FILES = {
    "acentem_takipte/translations/tr.csv",
    "frontend/src/generated/translations.js",
    # Test files: Turkish in test assertions and fixture data are acceptable
    "frontend/src/**/*.test.js",
    "frontend/src/**/*.spec.js",
    # Frontend page copy: `copy = { tr: {...}, en: {...} }` blocks are legitimate localization sources
    "frontend/src/pages/*.vue",
    "frontend/src/composables/*.js",
}

SCAN_EXTENSIONS = (".py", ".js", ".vue", ".json", ".ts", ".tsx", ".jinja", ".html")


def git_ls_files() -> list[str]:
    out = subprocess.check_output(["git", "-C", str(REPO), "ls-files"], text=True, encoding="utf-8", errors="ignore")
    return [line.strip() for line in out.splitlines() if line.strip()]


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def read_csv_rows(path: Path) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        for row in csv.reader(f):
            if not row:
                continue
            while len(row) < 3:
                row.append("")
            src = row[0].strip()
            tgt = row[1].strip()
            ctx = row[2].strip()
            if src:
                rows.append((src, tgt, ctx))
    return rows


def scan_turkish_chars(files: list[str]) -> list[tuple[str, int, str]]:
    violations: list[tuple[str, int, str]] = []
    for rel in files:
        if rel in ALLOWED_TURKISH_FILES:
            continue
        if not (rel.startswith("acentem_takipte/acentem_takipte/") or rel.startswith("frontend/src/")):
            continue
        if Path(rel).suffix not in SCAN_EXTENSIONS:
            continue
        full = REPO / rel
        try:
            text = full.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for m in TURKISH_CHAR_RE.finditer(text):
            ln = line_number(text, m.start())
            snippet = text.splitlines()[ln - 1].strip()
            violations.append((rel, ln, snippet))
    return violations


def scan_bare_frappe_throw(files: list[str]) -> list[tuple[str, int, str]]:
    violations: list[tuple[str, int, str]] = []
    for rel in files:
        if not rel.startswith("acentem_takipte/acentem_takipte/") or not rel.endswith(".py"):
            continue
        full = REPO / rel
        try:
            text = full.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for m in BARE_THROW_RE.finditer(text):
            ln = line_number(text, m.start())
            snippet = text.splitlines()[ln - 1].strip()
            violations.append((rel, ln, snippet))
    return violations


def scan_missing_en_keys(files: list[str]) -> list[str]:
    en_rows = read_csv_rows(REPO / "acentem_takipte/translations/en.csv")
    en_sources = {src for src, _, _ in en_rows}

    extracted: set[str] = set()
    for rel in files:
        if rel in ALLOWED_TURKISH_FILES:
            continue
        if not (rel.startswith("acentem_takipte/acentem_takipte/") or rel.startswith("frontend/src/")):
            continue
        if Path(rel).suffix not in SCAN_EXTENSIONS:
            continue
        full = REPO / rel
        try:
            text = full.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for m in LOCALIZED_CALL_RE.finditer(text):
            src = m.group(2).strip()
            if src:
                extracted.add(src)

    return sorted(src for src in extracted if src not in en_sources)


def scan_placeholder_mismatch() -> list[tuple[str, str, tuple[str, ...], tuple[str, ...]]]:
    en_rows = read_csv_rows(REPO / "acentem_takipte/translations/en.csv")
    tr_rows = read_csv_rows(REPO / "acentem_takipte/translations/tr.csv")
    tr_map = {(src, ctx): tgt for src, tgt, ctx in tr_rows}

    mismatches: list[tuple[str, str, tuple[str, ...], tuple[str, ...]]] = []
    for src, _, ctx in en_rows:
        src_tokens = tuple(sorted(set(PLACEHOLDER_RE.findall(src))))
        if not src_tokens:
            continue
        tr = tr_map.get((src, ctx), "")
        tr_tokens = tuple(sorted(set(PLACEHOLDER_RE.findall(tr))))
        if src_tokens != tr_tokens:
            mismatches.append((src, ctx, src_tokens, tr_tokens))
    return mismatches


def print_section(title: str) -> None:
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def main() -> int:
    files = git_ls_files()

    turkish_violations = scan_turkish_chars(files)
    bare_throw_violations = scan_bare_frappe_throw(files)
    missing_en = scan_missing_en_keys(files)
    placeholder_mismatches = scan_placeholder_mismatch()

    print_section("Localization Guard Report")
    print(f"Turkish-char violations (except allowed files): {len(turkish_violations)}")
    print(f"Bare frappe.throw violations: {len(bare_throw_violations)}")
    print(f"Localized strings missing in en.csv: {len(missing_en)}")
    print(f"Placeholder mismatches en.csv <-> tr.csv: {len(placeholder_mismatches)}")

    if turkish_violations:
        print_section("Turkish-char Violations")
        for rel, ln, snip in turkish_violations[:200]:
            print(f"{rel}:{ln}: {snip}")
        if len(turkish_violations) > 200:
            print(f"... truncated {len(turkish_violations) - 200} more")

    if bare_throw_violations:
        print_section("Bare frappe.throw Violations")
        for rel, ln, snip in bare_throw_violations[:200]:
            print(f"{rel}:{ln}: {snip}")

    if missing_en:
        print_section("Missing en.csv Source Keys")
        for src in missing_en[:200]:
            print(src)
        if len(missing_en) > 200:
            print(f"... truncated {len(missing_en) - 200} more")

    if placeholder_mismatches:
        print_section("Placeholder Mismatches")
        for src, ctx, src_tokens, tr_tokens in placeholder_mismatches[:200]:
            print(f"src={src} | ctx={ctx} | src_tokens={src_tokens} | tr_tokens={tr_tokens}")

    has_error = any([
        turkish_violations,
        bare_throw_violations,
        missing_en,
        placeholder_mismatches,
    ])
    return 1 if has_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
