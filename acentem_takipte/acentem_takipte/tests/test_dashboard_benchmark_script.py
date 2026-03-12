from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


def _load_benchmark_module():
    current = Path(__file__).resolve()
    root = next(parent for parent in current.parents if (parent / "scripts" / "benchmark_dashboard_api.py").exists())
    module_path = root / "scripts" / "benchmark_dashboard_api.py"
    spec = importlib.util.spec_from_file_location("benchmark_dashboard_api", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


benchmark_dashboard_api = _load_benchmark_module()


class TestDashboardBenchmarkScript(unittest.TestCase):
    def test_get_available_presets_returns_sorted_names(self):
        presets = benchmark_dashboard_api.get_available_presets()

        self.assertEqual(presets, ["default", "full", "quick"])

    def test_get_preset_summary_returns_thresholds_and_description(self):
        summary = benchmark_dashboard_api.get_preset_summary("quick")

        self.assertEqual(summary["name"], "quick")
        self.assertEqual(summary["max_p95_ms"], 600.0)
        self.assertEqual(summary["max_p99_ms"], 900.0)
        self.assertIn("smoke", summary["description"].lower())

    def test_get_preset_summary_rejects_unknown_name(self):
        with self.assertRaises(ValueError):
            benchmark_dashboard_api.get_preset_summary("missing")

    def test_get_all_preset_summaries_returns_catalog(self):
        summaries = benchmark_dashboard_api.get_all_preset_summaries()

        self.assertEqual([item["name"] for item in summaries], ["default", "full", "quick"])
        self.assertTrue(all("description" in item for item in summaries))

    def test_apply_preset_args_sets_default_files(self):
        args = SimpleNamespace(
            preset="default",
            filters_json=None,
            filters_file=None,
            workbench_filters_json=None,
            workbench_filters_file=None,
            max_p95_ms=None,
            max_p99_ms=None,
        )

        with patch.object(benchmark_dashboard_api.Path, "cwd", return_value=Path("C:/workspace")):
            result = benchmark_dashboard_api.apply_preset_args(args)

        self.assertEqual(
            result.filters_file,
            str(Path("C:/workspace/scripts/benchmark_presets/dashboard_filters_default.json")),
        )
        self.assertEqual(
            result.workbench_filters_file,
            str(Path("C:/workspace/scripts/benchmark_presets/workbench_filters_default.json")),
        )
        self.assertEqual(result.max_p95_ms, 800.0)
        self.assertEqual(result.max_p99_ms, 1200.0)

    def test_apply_preset_args_keeps_explicit_files(self):
        args = SimpleNamespace(
            preset="default",
            filters_json=None,
            filters_file="custom/dashboard.json",
            workbench_filters_json=None,
            workbench_filters_file="custom/workbench.json",
            max_p95_ms=500.0,
            max_p99_ms=900.0,
        )

        result = benchmark_dashboard_api.apply_preset_args(args)

        self.assertEqual(result.filters_file, "custom/dashboard.json")
        self.assertEqual(result.workbench_filters_file, "custom/workbench.json")
        self.assertEqual(result.max_p95_ms, 500.0)
        self.assertEqual(result.max_p99_ms, 900.0)

    def test_apply_preset_args_rejects_unknown_preset(self):
        args = SimpleNamespace(
            preset="unknown",
            filters_json=None,
            filters_file=None,
            workbench_filters_json=None,
            workbench_filters_file=None,
            max_p95_ms=None,
            max_p99_ms=None,
        )

        with self.assertRaises(ValueError):
            benchmark_dashboard_api.apply_preset_args(args)

    def test_apply_preset_args_supports_quick_preset_thresholds(self):
        args = SimpleNamespace(
            preset="quick",
            filters_json=None,
            filters_file=None,
            workbench_filters_json=None,
            workbench_filters_file=None,
            max_p95_ms=None,
            max_p99_ms=None,
        )

        with patch.object(benchmark_dashboard_api.Path, "cwd", return_value=Path("C:/workspace")):
            result = benchmark_dashboard_api.apply_preset_args(args)

        self.assertEqual(result.max_p95_ms, 600.0)
        self.assertEqual(result.max_p99_ms, 900.0)

    def test_resolve_artifact_output_path_uses_standard_directory(self):
        with patch.object(benchmark_dashboard_api.Path, "cwd", return_value=Path("C:/workspace")):
            output_path = benchmark_dashboard_api.resolve_artifact_output_path("daily-smoke")

        self.assertEqual(
            output_path,
            Path("C:/workspace/scripts/benchmark_presets/output/daily-smoke.json"),
        )

    def test_resolve_artifact_output_path_rejects_path_like_names(self):
        with self.assertRaises(ValueError):
            benchmark_dashboard_api.resolve_artifact_output_path("../escape")

    def test_resolve_artifact_markdown_path_uses_standard_directory(self):
        with patch.object(benchmark_dashboard_api.Path, "cwd", return_value=Path("C:/workspace")):
            output_path = benchmark_dashboard_api.resolve_artifact_markdown_path("daily-smoke")

        self.assertEqual(
            output_path,
            Path("C:/workspace/scripts/benchmark_presets/output/daily-smoke.md"),
        )

    def test_build_markdown_report_includes_results_and_violations(self):
        report = {
            "base_url": "http://localhost:8000",
            "preset": "default",
            "scenarios": ["dashboard_kpis"],
            "iterations": 5,
            "warmup": 1,
            "pause_ms": 100,
            "max_p95_ms": 800.0,
            "max_p99_ms": 1200.0,
            "results": [{"name": "dashboard_kpis", "error_count": 0, "avg_ms": 120.5, "p95_ms": 180.2, "p99_ms": 190.1}],
            "violations": [],
        }

        markdown = benchmark_dashboard_api.build_markdown_report(report)

        self.assertIn("# Dashboard Benchmark Report", markdown)
        self.assertIn("- Max p95 ms: `800.0`", markdown)
        self.assertIn("- Max p99 ms: `1200.0`", markdown)
        self.assertIn("| dashboard_kpis | 0 | 120.50 | 180.20 | 190.10 |", markdown)
        self.assertIn("- None", markdown)

    def test_parse_args_allows_list_presets_without_auth(self):
        argv = [
            "benchmark_dashboard_api.py",
            "--base-url",
            "http://localhost:8000",
            "--list-presets",
        ]
        with patch.object(benchmark_dashboard_api.sys, "argv", argv):
            args = benchmark_dashboard_api.parse_args()

        self.assertTrue(args.list_presets)

    def test_parse_args_allows_list_presets_json_without_auth(self):
        argv = [
            "benchmark_dashboard_api.py",
            "--base-url",
            "http://localhost:8000",
            "--list-presets-json",
        ]
        with patch.object(benchmark_dashboard_api.sys, "argv", argv):
            args = benchmark_dashboard_api.parse_args()

        self.assertTrue(args.list_presets_json)

    def test_build_scenarios_returns_all_defaults_without_filter(self):
        args = SimpleNamespace(
            filters_json=None,
            filters_file=None,
            workbench_filters_json=None,
            workbench_filters_file=None,
            tabs="daily,renewals",
            page=1,
            page_length=20,
            scenarios=None,
        )

        scenarios = benchmark_dashboard_api.build_scenarios(args)

        self.assertEqual(
            [scenario.name for scenario in scenarios],
            ["dashboard_kpis", "dashboard_tab_daily", "dashboard_tab_renewals", "customer_workbench", "lead_workbench"],
        )

    def test_build_scenarios_filters_selected_names(self):
        args = SimpleNamespace(
            filters_json=None,
            filters_file=None,
            workbench_filters_json=None,
            workbench_filters_file=None,
            tabs="daily,renewals",
            page=1,
            page_length=20,
            scenarios="dashboard_kpis,lead_workbench",
        )

        scenarios = benchmark_dashboard_api.build_scenarios(args)

        self.assertEqual([scenario.name for scenario in scenarios], ["dashboard_kpis", "lead_workbench"])

    def test_evaluate_results_ignores_thresholds_when_not_configured(self):
        args = SimpleNamespace(fail_on_error=False, max_p95_ms=None, max_p99_ms=None)
        results = [{"name": "dashboard_kpis", "error_count": 2, "p95_ms": 850.0, "p99_ms": 990.0}]

        violations = benchmark_dashboard_api.evaluate_results(results, args)

        self.assertEqual(violations, [])

    def test_evaluate_results_reports_error_and_latency_violations(self):
        args = SimpleNamespace(fail_on_error=True, max_p95_ms=400.0, max_p99_ms=600.0)
        results = [{"name": "lead_workbench", "error_count": 1, "p95_ms": 450.0, "p99_ms": 650.0}]

        violations = benchmark_dashboard_api.evaluate_results(results, args)

        self.assertEqual(
            violations,
            [
                "lead_workbench: error_count=1",
                "lead_workbench: p95_ms=450.00 > 400.00",
                "lead_workbench: p99_ms=650.00 > 600.00",
            ],
        )

    def test_resolve_json_output_path_rejects_non_json_suffix(self):
        with patch.object(benchmark_dashboard_api.Path, "cwd", return_value=Path("C:/workspace")):
            with self.assertRaises(ValueError):
                benchmark_dashboard_api.resolve_json_output_path("reports/dashboard.txt")

    def test_resolve_json_output_path_rejects_outside_workspace(self):
        with patch.object(benchmark_dashboard_api.Path, "cwd", return_value=Path("C:/workspace")):
            with self.assertRaises(ValueError):
                benchmark_dashboard_api.resolve_json_output_path("C:/other/report.json")

    def test_resolve_json_output_path_allows_workspace_relative_json(self):
        with patch.object(benchmark_dashboard_api.Path, "cwd", return_value=Path("C:/workspace")):
            output_path = benchmark_dashboard_api.resolve_json_output_path("reports/dashboard.json")

        self.assertEqual(output_path, Path("C:/workspace/reports/dashboard.json"))


if __name__ == "__main__":
    unittest.main()
