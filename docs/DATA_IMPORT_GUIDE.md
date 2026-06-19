# Data Import Guide

This guide documents the `/at/data-import` workbench for bulk loading **customers**, **offers**, and **policies**.

## Supported formats

- CSV (UTF-8, optional BOM)
- XLSX (first sheet auto-selected; multi-sheet files expose a sheet picker)

Limits:

- Preview: 200 rows
- Import: 5000 rows
- File size: 10 MB

## Duplicate policy

Duplicates are **skipped** and reported in preview and job summary.

| Dataset | Duplicate key |
|---------|---------------|
| customers | normalized `tax_id` |
| offers | `customer` + `insurance_company` + `offer_date` |
| policies | `insurance_company` + `policy_no` |

## Required columns

### Customers

| Column | Maps to | Required |
|--------|---------|----------|
| Full name | `full_name` | yes |
| Tax ID / TCKN | `tax_id` | yes |
| Mobile phone | `phone` | no |
| Email | `email` | no |
| Customer type | `customer_type` | no |

### Offers

| Column | Maps to | Required |
|--------|---------|----------|
| Customer (tax_id or name) | `customer` | yes |
| Sales entity | `sales_entity` | yes |
| Insurance company | `insurance_company` | yes |
| Branch | `branch` | yes |
| Offer date | `offer_date` | yes |
| Gross premium | `gross_premium` | yes |
| Status | `status` | no (default Draft) |

### Policies

| Column | Maps to | Required |
|--------|---------|----------|
| Policy number | `policy_no` | yes |
| Customer | `customer` | yes |
| Sales entity | `sales_entity` | yes |
| Insurance company | `insurance_company` | yes |
| Branch | `branch` | yes |
| Issue date | `issue_date` | yes |
| Start date | `start_date` | yes |
| End date | `end_date` | yes |
| Gross premium | `gross_premium` | yes |
| Status | `status` | no (default Active) |

## Link resolution

Reference fields accept DocType `name` or common lookup labels:

- `AT Customer`: tax_id, name, full_name
- `AT Branch`: name, branch_name, branch_code
- `AT Insurance Company`: name, company_name, company_code
- `AT Sales Entity`: name, full_name

## Sample templates

Download from the import workbench UI or directly:

- `/assets/acentem_takipte/import_templates/customers.csv`
- `/assets/acentem_takipte/import_templates/offers.csv`
- `/assets/acentem_takipte/import_templates/policies.csv`

Source copies also live under `docs/examples/import_templates/`.

## Operator flow

1. Upload file (Frappe private `upload_file`)
2. Map columns to system fields
3. **Preview** — review `ready` / `skipped` / `error` rows
4. **Import** — async job on `long` queue
5. Poll job status or wait for `at_import_ready` realtime event

## WSL validation

```bash
cd ~/frappe-bench
bench --site at.localhost migrate
bench worker --queue long   # separate terminal
```

Then open `http://at.localhost:8000/at/data-import`.

API smoke (from bench `sites/` directory):

```bash
cd ~/frappe-bench/sites
../env/bin/python ../apps/acentem_takipte/scripts/smoke_data_import_wsl.py
```

## Fixtures

Example CSV: `acentem_takipte/acentem_takipte/tests/fixtures/data_import/customers_valid.csv`
