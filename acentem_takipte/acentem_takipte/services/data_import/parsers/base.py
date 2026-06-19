from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ParsedSheet:
    headers: list[str] = field(default_factory=list)
    rows: list[dict[str, str]] = field(default_factory=list)
    sheet_names: list[str] = field(default_factory=list)
    active_sheet: str | None = None
