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
from typing import Any


@dataclass
class Scenario:
    name: str
    method_path: str
    query_params: dict[str, Any]


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
) -> tuple[float, int, Any]:
    encoded_params = {}
    for key, value in (query_params or {}).items():
        if value is None:
            continue
        if isinstance(value, (dict, list)):
            encoded_params[key] = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        else:
            encoded_params[key] = str(value)
    url = f"{base_url.rstrip('/')}/api/method/{method_path}"
    if encoded_params:
        url = f"{url}?{urllib.parse.urlencode(encoded_params)}"

    req = urllib.request.Request(url=url, headers=headers, method="GET")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
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
        with open(args.filters_file, "r", encoding="utf-8") as f:
            filters_payload = json.load(f)

    workbench_filters = None
    if args.workbench_filters_json:
        workbench_filters = json.loads(args.workbench_filters_json)
    elif args.workbench_filters_file:
        with open(args.workbench_filters_file, "r", encoding="utf-8") as f:
            workbench_filters = json.load(f)

    tabs = [tab.strip() for tab in (args.tabs or "").split(",") if tab.strip()]
    scenarios: list[Scenario] = [
        Scenario(
            name="dashboard_kpis",
            method_path="acentem_takipte.api.dashboard.get_dashboard_kpis",
            query_params={"filters": filters_payload} if filters_payload is not None else {},
        )
    ]
    for tab in tabs:
        scenarios.append(
            Scenario(
                name=f"dashboard_tab_{tab}",
                method_path="acentem_takipte.api.dashboard.get_dashboard_tab_payload",
                query_params={"tab": tab, "filters": filters_payload} if filters_payload is not None else {"tab": tab},
            )
        )

    scenarios.extend(
        [
            Scenario(
                name="customer_workbench",
                method_path="acentem_takipte.api.dashboard.get_customer_workbench_rows",
                query_params={
                    "filters": workbench_filters or {},
                    "page": args.page,
                    "page_length": args.page_length,
                },
            ),
            Scenario(
                name="lead_workbench",
                method_path="acentem_takipte.api.dashboard.get_lead_workbench_rows",
                query_params={
                    "filters": workbench_filters or {},
                    "page": args.page,
                    "page_length": args.page_length,
                },
            ),
        ]
    )
    return scenarios


def summarize_timings(ms_values: list[float]) -> dict[str, float]:
    return {
        "min_ms": round(min(ms_values), 2) if ms_values else 0.0,
        "max_ms": round(max(ms_values), 2) if ms_values else 0.0,
        "avg_ms": round(statistics.mean(ms_values), 2) if ms_values else 0.0,
        "p50_ms": round(percentile(ms_values, 50), 2) if ms_values else 0.0,
        "p95_ms": round(percentile(ms_values, 95), 2) if ms_values else 0.0,
        "p99_ms": round(percentile(ms_values, 99), 2) if ms_values else 0.0,
    }


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="ERPNext/Frappe dashboard endpoint benchmark (p50/p95/p99) for acentem_takipte."
    )
    parser.add_argument("--base-url", required=True, help="Frappe site URL (e.g. http://localhost:8000)")
    parser.add_argument("--auth-token", help="API token in '<api_key>:<api_secret>' format")
    parser.add_argument("--sid", help="Frappe session cookie sid (alternative to auth token)")
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--warmup", type=int, default=2)
    parser.add_argument("--pause-ms", type=int, default=100, help="Pause between requests")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--tabs", default="daily,sales,renewals,collections")
    parser.add_argument("--page", type=int, default=1)
    parser.add_argument("--page-length", type=int, default=20)
    parser.add_argument("--filters-json", help="Dashboard filters JSON string (for KPI/tab payload)")
    parser.add_argument("--filters-file", help="Dashboard filters JSON file path")
    parser.add_argument("--workbench-filters-json", help="Workbench filters JSON string")
    parser.add_argument("--workbench-filters-file", help="Workbench filters JSON file path")
    parser.add_argument("--output-json", help="Optional path to write JSON report")
    args = parser.parse_args()
    if not args.auth_token and not args.sid:
        parser.error("Either --auth-token or --sid is required.")
    return args


def main() -> int:
    args = parse_args()
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

    report = {
        "base_url": args.base_url,
        "generated_at_epoch": time.time(),
        "iterations": args.iterations,
        "warmup": args.warmup,
        "pause_ms": args.pause_ms,
        "results": results,
    }
    if args.output_json:
        with open(args.output_json, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\nJSON report written to {args.output_json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
