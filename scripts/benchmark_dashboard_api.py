#!/usr/bin/env python
from __future__ import annotations

import argparse
import json
import math
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from acentem_takipte.acentem_takipte.utils.network_security import normalize_outbound_url, safe_urlopen


@dataclass
class Scenario:
    name: str
    method_path: str
    query_params: dict[str, Any]


PRESET_DEFINITIONS = {
    "default": {
        "filters_file": "scripts/benchmark_presets/dashboard_filters_default.json",
        "workbench_filters_file": "scripts/benchmark_presets/workbench_filters_default.json",
        "max_p95_ms": 800.0,
        "max_p99_ms": 1200.0,
        "description": "Balanced default run for regular dashboard checks.",
    },
    "quick": {
        "filters_file": "scripts/benchmark_presets/dashboard_filters_default.json",
        "workbench_filters_file": "scripts/benchmark_presets/workbench_filters_default.json",
        "max_p95_ms": 600.0,
        "max_p99_ms": 900.0,
        "description": "Short smoke run with tighter thresholds.",
    },
    "full": {
        "filters_file": "scripts/benchmark_presets/dashboard_filters_default.json",
        "workbench_filters_file": "scripts/benchmark_presets/workbench_filters_default.json",
        "max_p95_ms": 1000.0,
        "max_p99_ms": 1500.0,
        "description": "Longer benchmark run with more tolerant thresholds.",
    },
}


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    if p <= 0:
        return min(values)
    if p >= 100:
        return max(values)
    ordered = sorted(values)
    rank = (len(ordered) - 1) * (p / 100.0)
    lower = math.floor(rank)
    upper = math.ceil(rank)
    if lower == upper:
        return float(ordered[lower])
    weight = rank - lower
    return float((ordered[lower] * (1 - weight)) + (ordered[upper] * weight))


def build_headers(args: argparse.Namespace) -> dict[str, str]:
    headers = {
        "Accept": "application/json",
        "User-Agent": "acentem_takipte-dashboard-benchmark/1.0",
    }
    if args.auth_token:
        headers["Authorization"] = f"token {args.auth_token}"
    if args.sid:
        headers["Cookie"] = f"sid={args.sid}"
    return headers


def request_json(
    *,
    base_url: str,
    method_path: str,
    query_params: dict[str, Any],
    headers: dict[str, str],
    timeout: float,
    allow_private_target: bool,
) -> tuple[float, int, Any]:
    encoded_params = {}
    for key, value in (query_params or {}).items():
        if value is None:
            continue
        if isinstance(value, (dict, list)):
            encoded_params[key] = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        else:
            encoded_params[key] = str(value)
    url = f"{normalize_base_url(base_url)}/api/method/{method_path}"
    if encoded_params:
        url = f"{url}?{urllib.parse.urlencode(encoded_params)}"

    req = urllib.request.Request(url=url, headers=headers, method="GET")
    started = time.perf_counter()
    try:
        with safe_urlopen(
            req,
            timeout=timeout,
            allowed_schemes=("http", "https"),
            allow_private_hosts=allow_private_target,
        ) as resp:
            body = resp.read()
            elapsed_ms = (time.perf_counter() - started) * 1000.0
            payload = json.loads(body.decode("utf-8", errors="replace") or "{}")
            return elapsed_ms, int(getattr(resp, "status", 200) or 200), payload
    except urllib.error.HTTPError as exc:
        body = exc.read()
        elapsed_ms = (time.perf_counter() - started) * 1000.0
        try:
            payload = json.loads(body.decode("utf-8", errors="replace") or "{}")
        except Exception:
            payload = {"raw": body.decode("utf-8", errors="replace")}
        return elapsed_ms, int(exc.code), payload


def build_scenarios(args: argparse.Namespace) -> list[Scenario]:
    filters_payload = None
    if args.filters_json:
        filters_payload = json.loads(args.filters_json)
    elif args.filters_file:
        filters_payload = json.loads(resolve_json_input_path(args.filters_file).read_text(encoding="utf-8"))

    workbench_filters = None
    if args.workbench_filters_json:
        workbench_filters = json.loads(args.workbench_filters_json)
    elif args.workbench_filters_file:
        workbench_filters = json.loads(resolve_json_input_path(args.workbench_filters_file).read_text(encoding="utf-8"))

    tabs = [tab.strip() for tab in (args.tabs or "").split(",") if tab.strip()]
    scenarios: list[Scenario] = [
        Scenario(
            name="dashboard_kpis",
            method_path="acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_kpis",
            query_params={"filters": filters_payload} if filters_payload is not None else {},
        )
    ]
    for tab in tabs:
        scenarios.append(
            Scenario(
                name=f"dashboard_tab_{tab}",
                method_path="acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_tab_payload",
                query_params={"tab": tab, "filters": filters_payload} if filters_payload is not None else {"tab": tab},
            )
        )

    scenarios.extend(
        [
            Scenario(
                name="customer_workbench",
                method_path="acentem_takipte.acentem_takipte.api.dashboard.get_customer_workbench_rows",
                query_params={
                    "filters": workbench_filters or {},
                    "page": args.page,
                    "page_length": args.page_length,
                },
            ),
            Scenario(
                name="lead_workbench",
                method_path="acentem_takipte.acentem_takipte.api.dashboard.get_lead_workbench_rows",
                query_params={
                    "filters": workbench_filters or {},
                    "page": args.page,
                    "page_length": args.page_length,
                },
            ),
        ]
    )
    selected_names = {
        item.strip() for item in str(getattr(args, "scenarios", "") or "").split(",") if item.strip()
    }
    if not selected_names:
        return scenarios
    return [scenario for scenario in scenarios if scenario.name in selected_names]


def resolve_workspace_path(raw_path: str) -> Path:
    candidate = Path(raw_path or "").expanduser()
    if not candidate.is_absolute():
        candidate = (Path.cwd() / candidate).resolve()
    else:
        candidate = candidate.resolve()

    workspace_root = Path.cwd().resolve()
    if workspace_root != candidate and workspace_root not in candidate.parents:
        raise ValueError("Preset files must be inside the current workspace.")
    return candidate


def apply_preset_args(args: argparse.Namespace) -> argparse.Namespace:
    preset_name = str(getattr(args, "preset", "") or "").strip().lower()
    if not preset_name:
        return args

    preset = PRESET_DEFINITIONS.get(preset_name)
    if not preset:
        raise ValueError(f"Unknown preset: {preset_name}")

    if preset.get("filters_file") and not args.filters_json and not args.filters_file:
        args.filters_file = str(resolve_workspace_path(preset["filters_file"]))
    if preset.get("workbench_filters_file") and not args.workbench_filters_json and not args.workbench_filters_file:
        args.workbench_filters_file = str(resolve_workspace_path(preset["workbench_filters_file"]))
    if preset.get("max_p95_ms") is not None and args.max_p95_ms is None:
        args.max_p95_ms = float(preset["max_p95_ms"])
    if preset.get("max_p99_ms") is not None and args.max_p99_ms is None:
        args.max_p99_ms = float(preset["max_p99_ms"])
    return args


def get_available_presets() -> list[str]:
    return sorted(PRESET_DEFINITIONS.keys())


def get_preset_summary(name: str) -> dict[str, Any]:
    preset_name = str(name or "").strip().lower()
    preset = PRESET_DEFINITIONS.get(preset_name)
    if not preset:
        raise ValueError(f"Unknown preset: {preset_name}")
    return {
        "name": preset_name,
        "description": str(preset.get("description") or "").strip(),
        "max_p95_ms": preset.get("max_p95_ms"),
        "max_p99_ms": preset.get("max_p99_ms"),
    }


def get_all_preset_summaries() -> list[dict[str, Any]]:
    return [get_preset_summary(name) for name in get_available_presets()]


def resolve_artifact_output_path(artifact_name: str) -> Path:
    normalized_name = str(artifact_name or "").strip()
    if not normalized_name:
        raise ValueError("Artifact name is required.")
    if any(char in normalized_name for char in ('\\', '/', ':')):
        raise ValueError("Artifact name must not contain path separators.")
    return resolve_json_output_path(f"scripts/benchmark_presets/output/{normalized_name}.json")


def resolve_artifact_markdown_path(artifact_name: str) -> Path:
    normalized_name = str(artifact_name or "").strip()
    if not normalized_name:
        raise ValueError("Artifact name is required.")
    if any(char in normalized_name for char in ('\\', '/', ':')):
        raise ValueError("Artifact name must not contain path separators.")
    candidate = resolve_workspace_path(f"scripts/benchmark_presets/output/{normalized_name}.md")
    candidate.parent.mkdir(parents=True, exist_ok=True)
    return candidate


def build_markdown_report(report: dict[str, Any]) -> str:
    lines = [
        "# Dashboard Benchmark Report",
        "",
        f"- Base URL: `{report.get('base_url')}`",
        f"- Preset: `{report.get('preset') or 'custom'}`",
        f"- Scenarios: `{', '.join(report.get('scenarios') or [])}`",
        f"- Iterations: `{report.get('iterations')}`",
        f"- Warmup: `{report.get('warmup')}`",
        f"- Pause ms: `{report.get('pause_ms')}`",
        f"- Max p95 ms: `{report.get('max_p95_ms')}`",
        f"- Max p99 ms: `{report.get('max_p99_ms')}`",
        "",
        "| Scenario | Errors | Avg | P95 | P99 |",
        "|---|---:|---:|---:|---:|",
    ]
    for row in report.get("results") or []:
        lines.append(
            f"| {row.get('name')} | {int(row.get('error_count') or 0)} | "
            f"{float(row.get('avg_ms') or 0):.2f} | {float(row.get('p95_ms') or 0):.2f} | "
            f"{float(row.get('p99_ms') or 0):.2f} |"
        )

    lines.extend(["", "## Violations", ""])
    violations = report.get("violations") or []
    if violations:
        lines.extend([f"- {violation}" for violation in violations])
    else:
        lines.append("- None")
    lines.append("")
    return "\n".join(lines)


def summarize_timings(ms_values: list[float]) -> dict[str, float]:
    return {
        "min_ms": round(min(ms_values), 2) if ms_values else 0.0,
        "max_ms": round(max(ms_values), 2) if ms_values else 0.0,
        "avg_ms": round(statistics.mean(ms_values), 2) if ms_values else 0.0,
        "p50_ms": round(percentile(ms_values, 50), 2) if ms_values else 0.0,
        "p95_ms": round(percentile(ms_values, 95), 2) if ms_values else 0.0,
        "p99_ms": round(percentile(ms_values, 99), 2) if ms_values else 0.0,
    }


def normalize_base_url(base_url: str) -> str:
    return normalize_outbound_url(
        base_url,
        allowed_schemes=("http", "https"),
        allow_private_hosts=True,
    )


def resolve_json_input_path(raw_path: str) -> Path:
    candidate = resolve_workspace_path(raw_path)
    if candidate.suffix.lower() != ".json":
        raise ValueError("Only JSON input files are allowed.")
    if not candidate.is_file():
        raise FileNotFoundError(candidate)
    return candidate


def resolve_json_output_path(raw_path: str) -> Path:
    candidate = Path(raw_path or "").expanduser()
    if not candidate.is_absolute():
        candidate = (Path.cwd() / candidate).resolve()
    else:
        candidate = candidate.resolve()

    workspace_root = Path.cwd().resolve()
    if workspace_root != candidate and workspace_root not in candidate.parents:
        raise ValueError("JSON output files must be inside the current workspace.")
    if candidate.suffix.lower() != ".json":
        raise ValueError("Only JSON output files are allowed.")
    candidate.parent.mkdir(parents=True, exist_ok=True)
    return candidate


def run_scenario(scenario: Scenario, args: argparse.Namespace, headers: dict[str, str]) -> dict[str, Any]:
    timings: list[float] = []
    errors: list[dict[str, Any]] = []
    warmup = max(args.warmup, 0)
    iterations = max(args.iterations, 1)
    pause_seconds = max(args.pause_ms, 0) / 1000.0

    for _ in range(warmup):
        request_json(
            base_url=args.base_url,
            method_path=scenario.method_path,
            query_params=scenario.query_params,
            headers=headers,
            timeout=args.timeout,
            allow_private_target=args.allow_private_target,
        )
        if pause_seconds:
            time.sleep(pause_seconds)

    for _ in range(iterations):
        elapsed_ms, status_code, payload = request_json(
            base_url=args.base_url,
            method_path=scenario.method_path,
            query_params=scenario.query_params,
            headers=headers,
            timeout=args.timeout,
            allow_private_target=args.allow_private_target,
        )
        timings.append(elapsed_ms)
        if status_code >= 400 or (isinstance(payload, dict) and payload.get("exc")):
            errors.append(
                {
                    "status_code": status_code,
                    "exc": payload.get("exc") if isinstance(payload, dict) else None,
                    "message": payload.get("message") if isinstance(payload, dict) else None,
                }
            )
        if pause_seconds:
            time.sleep(pause_seconds)

    summary = summarize_timings(timings)
    return {
        "name": scenario.name,
        "method": scenario.method_path,
        "iterations": iterations,
        "warmup": warmup,
        "errors": errors,
        "error_count": len(errors),
        **summary,
    }


def print_table(results: list[dict[str, Any]]) -> None:
    headers = ["scenario", "iter", "errors", "avg", "p50", "p95", "p99", "min", "max"]
    rows = []
    for row in results:
        rows.append(
            [
                row["name"],
                str(row["iterations"]),
                str(row["error_count"]),
                f"{row['avg_ms']:.2f}",
                f"{row['p50_ms']:.2f}",
                f"{row['p95_ms']:.2f}",
                f"{row['p99_ms']:.2f}",
                f"{row['min_ms']:.2f}",
                f"{row['max_ms']:.2f}",
            ]
        )
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))

    def fmt(row_items: list[str]) -> str:
        return " | ".join(cell.ljust(widths[i]) for i, cell in enumerate(row_items))

    print(fmt(headers))
    print("-+-".join("-" * w for w in widths))
    for row in rows:
        print(fmt(row))


def evaluate_results(results: list[dict[str, Any]], args: argparse.Namespace) -> list[str]:
    violations: list[str] = []
    max_p95_ms = float(args.max_p95_ms or 0)
    max_p99_ms = float(args.max_p99_ms or 0)
    fail_on_error = bool(args.fail_on_error)

    for row in results:
        scenario = row.get("name") or "unknown"
        if fail_on_error and int(row.get("error_count") or 0) > 0:
            violations.append(f"{scenario}: error_count={int(row.get('error_count') or 0)}")
        if max_p95_ms > 0 and float(row.get("p95_ms") or 0) > max_p95_ms:
            violations.append(f"{scenario}: p95_ms={float(row.get('p95_ms') or 0):.2f} > {max_p95_ms:.2f}")
        if max_p99_ms > 0 and float(row.get("p99_ms") or 0) > max_p99_ms:
            violations.append(f"{scenario}: p99_ms={float(row.get('p99_ms') or 0):.2f} > {max_p99_ms:.2f}")
    return violations


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="ERPNext/Frappe dashboard endpoint benchmark (p50/p95/p99) for acentem_takipte.acentem_takipte."
    )
    parser.add_argument("--base-url", required=True, help="Frappe site URL (e.g. http://localhost:8000)")
    parser.add_argument("--auth-token", help="API token in '<api_key>:<api_secret>' format")
    parser.add_argument("--sid", help="Frappe session cookie sid (alternative to auth token)")
    parser.add_argument("--preset", help="Optional benchmark preset name")
    parser.add_argument("--list-presets", action="store_true", help="Print available preset names and exit.")
    parser.add_argument("--list-presets-json", action="store_true", help="Print preset summaries as JSON and exit.")
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--warmup", type=int, default=2)
    parser.add_argument("--pause-ms", type=int, default=100, help="Pause between requests")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--tabs", default="daily,sales,renewals,collections")
    parser.add_argument("--scenarios", help="Optional comma-separated scenario names to run")
    parser.add_argument("--page", type=int, default=1)
    parser.add_argument("--page-length", type=int, default=20)
    parser.add_argument("--filters-json", help="Dashboard filters JSON string (for KPI/tab payload)")
    parser.add_argument("--filters-file", help="Dashboard filters JSON file path")
    parser.add_argument("--workbench-filters-json", help="Workbench filters JSON string")
    parser.add_argument("--workbench-filters-file", help="Workbench filters JSON file path")
    parser.add_argument("--output-json", help="Optional path to write JSON report")
    parser.add_argument("--artifact-name", help="Optional artifact name to write under scripts/benchmark_presets/output/")
    parser.add_argument("--fail-on-error", action="store_true", help="Exit non-zero if any scenario returns an error.")
    parser.add_argument("--max-p95-ms", type=float, help="Optional p95 latency threshold per scenario.")
    parser.add_argument("--max-p99-ms", type=float, help="Optional p99 latency threshold per scenario.")
    parser.add_argument("--allow-private-target", action="store_true", help="Allow localhost/private benchmark targets.")
    args = parser.parse_args()
    if args.list_presets or args.list_presets_json:
        return args
    if not args.auth_token and not args.sid:
        parser.error("Either --auth-token or --sid is required.")
    return args


def main() -> int:
    args = parse_args()
    if args.list_presets_json:
        print(json.dumps(get_all_preset_summaries(), ensure_ascii=False, indent=2))
        return 0
    if args.list_presets:
        for preset_name in get_available_presets():
            preset_summary = get_preset_summary(preset_name)
            print(
                f"{preset_summary['name']}: "
                f"p95<={preset_summary['max_p95_ms']}, "
                f"p99<={preset_summary['max_p99_ms']} - "
                f"{preset_summary['description']}"
            )
        return 0
    args = apply_preset_args(args)
    if args.artifact_name and not args.output_json:
        args.output_json = str(resolve_artifact_output_path(args.artifact_name))
    headers = build_headers(args)
    scenarios = build_scenarios(args)
    results = []

    print(f"Running {len(scenarios)} scenarios against {args.base_url} ...")
    for scenario in scenarios:
        result = run_scenario(scenario, args, headers)
        results.append(result)
        print(
            f"[ok] {scenario.name}: p95={result['p95_ms']:.2f} ms, "
            f"p99={result['p99_ms']:.2f} ms, errors={result['error_count']}"
        )

    print()
    print_table(results)
    violations = evaluate_results(results, args)
    if violations:
        print("\nThreshold violations:")
        for violation in violations:
            print(f"- {violation}")

    report = {
        "base_url": args.base_url,
        "generated_at_epoch": time.time(),
        "preset": args.preset or None,
        "scenarios": [scenario.name for scenario in scenarios],
        "iterations": args.iterations,
        "warmup": args.warmup,
        "pause_ms": args.pause_ms,
        "max_p95_ms": args.max_p95_ms,
        "max_p99_ms": args.max_p99_ms,
        "results": results,
        "violations": violations,
    }
    if args.output_json:
        output_path = resolve_json_output_path(args.output_json)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\nJSON report written to {output_path}")
    if args.artifact_name:
        markdown_path = resolve_artifact_markdown_path(args.artifact_name)
        markdown_report = build_markdown_report(report)
        with open(markdown_path, "w", encoding="utf-8") as f:
            f.write(markdown_report)
        print(f"Markdown report written to {markdown_path}")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
