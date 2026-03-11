from __future__ import annotations

from unittest.mock import patch

from frappe.tests import UnitTestCase

from acentem_takipte.acentem_takipte.utils.network_security import (
    normalize_outbound_url,
    normalize_whatsapp_api_url,
    safe_urlopen,
)


class TestNetworkSecurity(UnitTestCase):
    def test_normalize_outbound_url_rejects_private_hosts_by_default(self):
        with self.assertRaises(ValueError):
            normalize_outbound_url("http://127.0.0.1:8080/api/test", allowed_schemes=("http", "https"))

    def test_normalize_outbound_url_allows_private_hosts_when_explicit(self):
        normalized = normalize_outbound_url(
            "http://127.0.0.1:8080/api/test/",
            allowed_schemes=("http", "https"),
            allow_private_hosts=True,
        )
        self.assertEqual(normalized, "http://127.0.0.1:8080/api/test")

    def test_normalize_whatsapp_api_url_restricts_host(self):
        with self.assertRaises(ValueError):
            normalize_whatsapp_api_url("https://example.com/messages")

    def test_safe_urlopen_validates_and_delegates(self):
        with patch("urllib.request.urlopen") as urlopen_mock:
            safe_urlopen(
                "http://127.0.0.1:8080/api/test/",
                timeout=5,
                allowed_schemes=("http", "https"),
                allow_private_hosts=True,
            )

        urlopen_mock.assert_called_once_with("http://127.0.0.1:8080/api/test", timeout=5)
