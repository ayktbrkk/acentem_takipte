from __future__ import annotations

import importlib
from unittest import TestCase

from acentem_takipte.acentem_takipte.api import dashboard as dashboard_api
from acentem_takipte.acentem_takipte.api import quick_create as quick_create_api
from acentem_takipte.acentem_takipte.api import reports as reports_api
from acentem_takipte.acentem_takipte.api import session as session_api
from acentem_takipte.acentem_takipte.api.versioning import build_versioned_api_method_path


class TestApiV2Aliases(TestCase):
    def test_versioned_api_method_path_builds_v2_namespace(self):
        self.assertEqual(
            build_versioned_api_method_path("acentem_takipte.acentem_takipte.api.quick_create.create_quick_customer", "v2"),
            "acentem_takipte.acentem_takipte.api.v2.quick_create.create_quick_customer",
        )

    def test_v2_alias_modules_resolve_to_v1_modules(self):
        cases = [
            (
                "session",
                session_api,
                ["get_session_context", "set_session_locale"],
            ),
            (
                "quick_create",
                quick_create_api,
                ["create_quick_customer", "search_quick_options"],
            ),
            (
                "reports",
                reports_api,
                ["get_policy_list_report", "get_scheduled_report_configs"],
            ),
            (
                "dashboard",
                dashboard_api,
                ["get_dashboard_kpis", "get_dashboard_tab_payload"],
            ),
        ]

        for alias_name, target_module, attributes in cases:
            with self.subTest(alias=alias_name):
                alias_module = importlib.import_module(
                    f"acentem_takipte.acentem_takipte.api.v2.{alias_name}"
                )
                for attribute in attributes:
                    self.assertIs(getattr(alias_module, attribute), getattr(target_module, attribute))

    def test_v2_break_glass_alias_imports_cleanly(self):
        alias_module = importlib.import_module("acentem_takipte.acentem_takipte.api.v2.break_glass")
        target_module = importlib.import_module("acentem_takipte.acentem_takipte.api.break_glass")
        self.assertIs(alias_module.list_pending, target_module.list_pending)
        self.assertIs(alias_module.create_request, target_module.create_request)
