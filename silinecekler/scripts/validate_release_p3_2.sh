#!/usr/bin/env bash
set -euo pipefail

# Run from frappe-bench root:
#   bash apps/acentem_takipte/scripts/validate_release_p3_2.sh

if [[ ! -x "./env/bin/python" ]]; then
  echo "This script must be run from frappe-bench root (env/bin/python not found)." >&2
  exit 1
fi

echo "== P3.2 Release Validation =="
echo "[1/3] Backend test suites"
./env/bin/python -m pytest \
  apps/acentem_takipte/acentem_takipte/acentem_takipte/tests/test_branch_service.py \
  apps/acentem_takipte/acentem_takipte/acentem_takipte/tests/test_branch_access_service.py \
  apps/acentem_takipte/acentem_takipte/acentem_takipte/tests/test_branch_permission_hooks.py \
  apps/acentem_takipte/acentem_takipte/acentem_takipte/tests/test_p3_2_release_readiness.py \
  apps/acentem_takipte/acentem_takipte/acentem_takipte/tests/test_reports_runtime.py \
  -q

echo "[2/3] Break-glass stale expiry job"
bench --site at.localhost execute acentem_takipte.acentem_takipte.services.break_glass.expire_stale

echo "[3/3] Branch depth alarm check"
bench --site at.localhost execute acentem_takipte.acentem_takipte.scripts.branch_depth_check.run_check

echo "== Validation complete =="