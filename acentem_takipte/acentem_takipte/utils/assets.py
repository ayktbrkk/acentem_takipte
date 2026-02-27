from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable


APP_NAME = "acentem_takipte"
ASSETS_BASE_URL = "/assets/acentem_takipte/frontend/"
MANIFEST_CANDIDATES = (
    "acentem_takipte/public/frontend/.vite/manifest.json",
    "acentem_takipte/public/frontend/manifest.json",
    "public/frontend/.vite/manifest.json",
    "public/frontend/manifest.json",
)
PUBLIC_DIR_CANDIDATES = (
    "acentem_takipte/public",
    "public",
)


def _app_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _existing_manifest_paths() -> list[Path]:
    root = _app_root()
    existing: list[Path] = []
    for relative_path in MANIFEST_CANDIDATES:
        full_path = root / relative_path
        if full_path.exists():
            existing.append(full_path)
    return existing


def _manifest_path() -> Path | None:
    existing = _existing_manifest_paths()
    if not existing:
        return None
    return max(existing, key=lambda path: path.stat().st_mtime_ns)


def _public_root_from_manifest(manifest_path: Path | None) -> Path | None:
    if not manifest_path:
        return None
    for parent in manifest_path.parents:
        if parent.name == "public":
            return parent
    return None


def _public_root() -> Path | None:
    public_root_from_manifest = _public_root_from_manifest(_manifest_path())
    if public_root_from_manifest:
        return public_root_from_manifest

    root = _app_root()
    for relative_path in PUBLIC_DIR_CANDIDATES:
        full_path = root / relative_path
        if full_path.exists():
            return full_path
    return None


def ensure_site_asset_symlink() -> bool:
    try:
        import frappe
    except Exception:
        return False

    public_root = _public_root()
    if not public_root:
        return False

    try:
        site_assets_root = Path(frappe.get_site_path("assets"))
        site_assets_root.mkdir(parents=True, exist_ok=True)
        app_asset_link = site_assets_root / APP_NAME
        resolved_public_root = public_root.resolve()

        if app_asset_link.is_symlink():
            try:
                if app_asset_link.resolve() == resolved_public_root:
                    return False
            except OSError:
                pass

        if app_asset_link.exists() and not app_asset_link.is_symlink():
            return False

        if app_asset_link.exists() or app_asset_link.is_symlink():
            app_asset_link.unlink()

        app_asset_link.symlink_to(resolved_public_root, target_is_directory=True)
        return True
    except Exception:
        try:
            frappe.log_error(frappe.get_traceback(), "AT Asset Symlink Ensure Error")
        except Exception:
            pass
        return False


def _load_manifest() -> dict[str, Any]:
    manifest_path = _manifest_path()
    if not manifest_path:
        return {}

    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _resolve_entry(manifest: dict[str, Any], entry: str) -> dict[str, Any]:
    if entry in manifest and isinstance(manifest[entry], dict):
        return manifest[entry]

    if "index.html" in manifest and isinstance(manifest["index.html"], dict):
        return manifest["index.html"]

    for value in manifest.values():
        if isinstance(value, dict) and value.get("isEntry"):
            return value

    return {}


def _normalize_paths(file_paths: Iterable[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()

    for file_path in file_paths:
        if not file_path:
            continue
        if file_path in seen:
            continue
        seen.add(file_path)
        normalized.append(f"{ASSETS_BASE_URL}{file_path}")

    return normalized


def get_asset_includes(entry: str = "src/main.js") -> tuple[list[str], list[str]]:
    manifest = _load_manifest()
    if not manifest:
        return [], []

    entry_record = _resolve_entry(manifest, entry)
    if not entry_record:
        return [], []

    js_files: list[str] = []
    css_files: list[str] = []

    entry_js = entry_record.get("file")
    if isinstance(entry_js, str):
        js_files.append(entry_js)

    entry_css = entry_record.get("css", [])
    if isinstance(entry_css, list):
        css_files.extend(item for item in entry_css if isinstance(item, str))

    imports = entry_record.get("imports", [])
    if isinstance(imports, list):
        for import_key in imports:
            import_record = manifest.get(import_key, {})
            if not isinstance(import_record, dict):
                continue

            import_js = import_record.get("file")
            if isinstance(import_js, str):
                js_files.append(import_js)

            import_css = import_record.get("css", [])
            if isinstance(import_css, list):
                css_files.extend(item for item in import_css if isinstance(item, str))

    return _normalize_paths(js_files), _normalize_paths(css_files)
