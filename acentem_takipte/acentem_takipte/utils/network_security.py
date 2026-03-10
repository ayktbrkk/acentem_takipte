from __future__ import annotations

from urllib.parse import urlparse, urlunparse


ALLOWED_WHATSAPP_API_HOSTS = {"graph.facebook.com"}


def normalize_whatsapp_api_url(raw_url: str) -> str:
    parsed = urlparse(str(raw_url or "").strip())
    if parsed.scheme != "https":
        raise ValueError("WhatsApp API url must use https.")
    if not parsed.hostname:
        raise ValueError("WhatsApp API url must include a hostname.")
    if parsed.username or parsed.password:
        raise ValueError("WhatsApp API url must not include credentials.")

    hostname = parsed.hostname.lower().rstrip(".")
    if hostname not in ALLOWED_WHATSAPP_API_HOSTS:
        raise ValueError("WhatsApp API url host is not allowed.")

    netloc = hostname
    if parsed.port:
        netloc = f"{hostname}:{parsed.port}"

    return urlunparse(
        (
            parsed.scheme,
            netloc,
            parsed.path.rstrip("/"),
            "",
            parsed.query,
            "",
        )
    )
