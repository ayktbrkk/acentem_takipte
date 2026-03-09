from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ProviderMessage:
    channel: str
    recipient: str
    body: str
    subject: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ProviderResult:
    ok: bool
    provider: str
    message_id: str | None = None
    response_log: str | None = None
    error: str | None = None


class ProviderAdapter(ABC):
    provider_name = "base"
    supported_channels: tuple[str, ...] = ()

    def supports(self, channel: str) -> bool:
        return str(channel or "").strip().upper() in {item.upper() for item in self.supported_channels}

    @abstractmethod
    def send(self, message: ProviderMessage) -> ProviderResult:
        raise NotImplementedError
