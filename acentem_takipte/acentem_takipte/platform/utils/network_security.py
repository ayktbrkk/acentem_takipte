from __future__ import annotations

import ipaddress
import socket
import urllib.request
from urllib.parse import urlparse, urlunparse


ALLOWED_WHATSAPP_API_HOSTS = {"graph.facebook.com"}


def _normalize_url(
    raw_url: str,
    *,
    allowed_schemes: tuple[str, ...],
    allowed_hosts: set[str] | None = None,
    allow_private_hosts: bool = False,
) -> str:
    parsed = urlparse(str(raw_url or "").strip())
    scheme = str(parsed.scheme or "").lower()
    if scheme not in {item.lower() for item in allowed_schemes}:
        raise ValueError(f"Outbound url must use one of: {', '.join(allowed_schemes)}.")
    if not parsed.hostname:
        raise ValueError("Outbound url must include a hostname.")
    if parsed.username or parsed.password:
        raise ValueError("Outbound url must not include credentials.")

    hostname = parsed.hostname.lower().rstrip(".")
    if allowed_hosts and hostname not in {item.lower().rstrip('.') for item in allowed_hosts}:
        raise ValueError("Outbound url host is not allowed.")
    if not allow_private_hosts and _is_private_host(hostname):
        raise ValueError("Outbound url host resolves to a private or loopback address.")

    netloc = hostname
    if parsed.port:
        netloc = f"{hostname}:{parsed.port}"

    return urlunparse(
        (
            scheme,
            netloc,
            parsed.path.rstrip("/"),
            "",
            parsed.query,
            "",
        )
    )


def _is_private_host(hostname: str) -> bool:
    try:
        ip = ipaddress.ip_address(hostname)
        return _is_private_ip(ip)
    except ValueError:
        pass

    try:
        resolved = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return False

    for item in resolved:
        sockaddr = item[4]
        if not sockaddr:
            continue
        candidate = sockaddr[0]
        try:
            ip = ipaddress.ip_address(candidate)
        except ValueError:
            continue
        if _is_private_ip(ip):
            return True
    return False


def _is_private_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def normalize_outbound_url(
    raw_url: str,
    *,
    allowed_schemes: tuple[str, ...] = ("https",),
    allowed_hosts: set[str] | None = None,
    allow_private_hosts: bool = False,
) -> str:
    return _normalize_url(
        raw_url,
        allowed_schemes=allowed_schemes,
        allowed_hosts=allowed_hosts,
        allow_private_hosts=allow_private_hosts,
    )


def normalize_whatsapp_api_url(raw_url: str) -> str:
    return _normalize_url(
        raw_url,
        allowed_schemes=("https",),
        allowed_hosts=ALLOWED_WHATSAPP_API_HOSTS,
        allow_private_hosts=False,
    )


def safe_urlopen(
    request_or_url,
    *,
    timeout: float | None = None,
    allowed_schemes: tuple[str, ...] = ("https",),
    allowed_hosts: set[str] | None = None,
    allow_private_hosts: bool = False,
    **kwargs,
):
    target_url = getattr(request_or_url, "full_url", request_or_url)
    normalized_url = normalize_outbound_url(
        str(target_url or ""),
        allowed_schemes=allowed_schemes,
        allowed_hosts=allowed_hosts,
        allow_private_hosts=allow_private_hosts,
    )

    if isinstance(request_or_url, urllib.request.Request):
        request_or_url = urllib.request.Request(
            normalized_url,
            data=request_or_url.data,
            headers=dict(request_or_url.header_items()),
            origin_req_host=request_or_url.origin_req_host,
            unverifiable=request_or_url.unverifiable,
            method=request_or_url.get_method(),
        )
    else:
        request_or_url = normalized_url

    return urllib.request.urlopen(request_or_url, timeout=timeout, **kwargs)
