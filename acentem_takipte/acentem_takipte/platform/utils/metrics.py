from __future__ import annotations

from typing import Any


def build_metric_event(
    name: str,
    *,
    status: str = "ok",
    dimensions: dict[str, Any] | None = None,
    values: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "metric": str(name or "").strip() or "unknown_metric",
        "status": str(status or "").strip() or "ok",
        "dimensions": dict(dimensions or {}),
        "values": dict(values or {}),
    }
