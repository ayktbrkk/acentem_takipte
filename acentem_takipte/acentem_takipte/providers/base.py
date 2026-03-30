from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ProviderMessage:
    recipient: str
    body: str
    subject: str | None = None
    template_name: str | None = None
    template_language: str | None = None
    components: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    channel: str = ""


@dataclass(slots=True)
class ProviderResult:
    ok: bool
    provider: str
    message_id: str | None = None
    provider_message_id: str | None = None
    status_code: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    response_payload: Any | None = None
    response_log: str | None = None

    def __post_init__(self) -> None:
        if self.provider_message_id is None and self.message_id is not None:
            self.provider_message_id = self.message_id
        elif self.message_id is None and self.provider_message_id is not None:
            self.message_id = self.provider_message_id

    @property
    def error(self) -> str | None:
        return self.error_message


class ProviderAdapter(ABC):
    provider_name = "base"
    supported_channels: tuple[str, ...] = ()

    def supports(self, channel: str) -> bool:
        return str(channel or "").strip().upper() in {item.upper() for item in self.supported_channels}

    @abstractmethod
    def send(self, message: ProviderMessage) -> ProviderResult:
        raise NotImplementedError
