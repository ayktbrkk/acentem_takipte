from __future__ import annotations

from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    details_lead as lead_detail_builder,
)
from acentem_takipte.acentem_takipte.api.dashboard_v2 import (
    details_offer as offer_detail_builder,
)


def build_lead_detail_payload(*args, **kwargs) -> dict:
    return lead_detail_builder.build_lead_detail_payload(*args, **kwargs)


def build_offer_detail_payload(*args, **kwargs) -> dict:
    return offer_detail_builder.build_offer_detail_payload(*args, **kwargs)
