from __future__ import annotations

from unittest import TestCase

from acentem_takipte.acentem_takipte.api.versioning import (
    build_version_meta,
    build_versioned_method_path,
    normalize_api_version,
)


class TestApiVersioning(TestCase):
    def test_normalize_api_version_uses_default(self):
        self.assertEqual(normalize_api_version(None), "v1")

    def test_normalize_api_version_rejects_unsupported_value(self):
        with self.assertRaises(ValueError):
            normalize_api_version("v3")

    def test_build_versioned_method_path_prefixes_version(self):
        self.assertEqual(
            build_versioned_method_path("acentem_takipte.api.dashboard.get_dashboard", "v2"),
            "v2:acentem_takipte.api.dashboard.get_dashboard",
        )

    def test_build_version_meta_preserves_successor_and_extras(self):
        meta = build_version_meta(
            version="v1",
            deprecated=True,
            successor="v2",
            extras={"sunset": "2026-12-31"},
        )
        self.assertEqual(meta["version"], "v1")
        self.assertTrue(meta["deprecated"])
        self.assertEqual(meta["successor"], "v2")
        self.assertEqual(meta["sunset"], "2026-12-31")

