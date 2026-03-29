# API Versioning

The app now exposes a `v2` API namespace alongside the existing `v1` public methods.

## What changed

- Existing public endpoints stay available under `acentem_takipte.acentem_takipte.api.*`
- New versioned aliases resolve under `acentem_takipte.acentem_takipte.api.v2.*`
- The `v2` package is a thin compatibility layer that re-exports the current stable implementation

## How to build versioned method paths

- Use `build_versioned_api_method_path("acentem_takipte.acentem_takipte.api.quick_create.create_quick_customer", "v2")`
- The helper returns `acentem_takipte.acentem_takipte.api.v2.quick_create.create_quick_customer`

## Migration rule

- Keep `v1` paths stable for existing callers
- Introduce new behavior in `v2` paths first
- Switch clients to `v2` incrementally when a contract changes

## Notes

- The legacy `build_versioned_method_path()` helper is still available for internal version registry keys
- `v2` aliases are currently thin wrappers around the same implementation as `v1`
