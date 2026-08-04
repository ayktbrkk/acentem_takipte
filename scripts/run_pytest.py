"""Run the repo's pytest-function tests against a Frappe bench site.

Bench's `run-tests` is the canonical runner for `unittest.TestCase` classes (the
`bench run-tests --app ...` step in CI). Plain pytest-function tests are NOT
collected by that runner, so this script runs them with pytest after initializing
the same site the way frappe.test_runner does (init + connect + in_test).

Usage (from a bench working directory, or with SITES_PATH set):

    python scripts/run_pytest.py <path-or-module> [paths...]

Site is taken from SITE_NAME (default `test.localhost`). Sites path resolves to
`<cwd>/sites` unless SITES_PATH is provided.
"""
from __future__ import annotations

import os
import sys

import frappe

site = os.environ.get("SITE_NAME", "test.localhost")
sites_path = os.environ.get("SITES_PATH") or os.path.join(os.getcwd(), "sites")

frappe.init(site=site, sites_path=sites_path)
if not frappe.db:
    frappe.connect()
frappe.flags.in_test = True
frappe.flags.print_messages = False

import pytest  # noqa: E402

targets = sys.argv[1:]
if not targets:
    raise SystemExit("usage: python scripts/run_pytest.py <path-or-module> [paths...]")
sys.exit(pytest.main(targets))
