from __future__ import annotations

import json
from pathlib import Path


BENCH_ROOT = Path("/home/frappe/frappe-bench")
ASSETS_DIR = BENCH_ROOT / "sites" / "assets"
FRAPPE_PUBLIC = BENCH_ROOT / "apps" / "frappe" / "frappe" / "public"
APP_PUBLIC = BENCH_ROOT / "apps" / "acentem_takipte" / "acentem_takipte" / "public"


def ensure_symlink(target: Path, link_path: Path) -> None:
    if link_path.is_symlink() or link_path.exists():
        if link_path.is_symlink() and link_path.resolve() == target.resolve():
            return
        if link_path.is_dir() and not link_path.is_symlink():
            return
        link_path.unlink()
    link_path.symlink_to(target)


def rewrite_manifest(manifest_name: str, css_dir_name: str) -> None:
    manifest_path = ASSETS_DIR / manifest_name
    manifest = {}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())

    js_dir = FRAPPE_PUBLIC / "dist" / "js"
    css_dir = FRAPPE_PUBLIC / "dist" / css_dir_name

    for file_path in js_dir.glob("*.js"):
        parts = file_path.name.split(".")
        if len(parts) < 4 or parts[-2] == "bundle":
            continue
        key = ".".join(parts[:-2] + [parts[-1]])
        manifest[key] = f"/assets/frappe/dist/js/{file_path.name}"

    for file_path in css_dir.glob("*.css"):
        parts = file_path.name.split(".")
        if len(parts) < 4 or parts[-2] == "bundle":
            continue
        key = ".".join(parts[:-2] + [parts[-1]])
        manifest[key] = f"/assets/frappe/dist/{css_dir_name}/{file_path.name}"

    manifest_path.write_text(json.dumps(manifest, indent=4) + "\n")


def main() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    ensure_symlink(FRAPPE_PUBLIC, ASSETS_DIR / "frappe")
    ensure_symlink(APP_PUBLIC, ASSETS_DIR / "acentem_takipte")
    rewrite_manifest("assets.json", "css")
    rewrite_manifest("assets-rtl.json", "css-rtl")


if __name__ == "__main__":
    main()