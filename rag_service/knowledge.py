"""Policy knowledge base for the RAG service.

Every document carries an id, a title and a source label so retrieved passages
can be cited as evidence. Program documents also carry `program_key` /
`program_type` metadata (keys match the backend's sample catalog) so the agent
can detect conflicts between a user's stored data and the handbook.

All passages are Ledger's own illustrative handbook, not official program terms.
"""

from __future__ import annotations

from typing import Any

HANDBOOK = "Ledger redemption handbook (sample)"

BASE_DOCS = [
    "Airline points are used for flights only.",
    "Hotel points are used for stays and accommodation only.",
    "Wallet points can be used flexibly across both flights and hotels.",
    "Airline points should never appear in a hotel redemption step.",
    "Hotel points should never appear in a flight redemption step.",
    "Card payments cover the remaining cash amount after point redemption.",
    "Bounded redemption: points used = min(available, price / conversion).",
    "Sequential allocation per program: flights consume points first, then hotels.",
    "Best-card top-up: residual cash is paid on the highest reward-value card.",
]

LOYALTY_PROGRAM_DOCS = {
    "air india": "Air India is a flight-type program; apply only to flights.",
    "vistara": "Vistara is a flight-type program; use for airfare.",
    "indigo": "IndiGo BluChip is a flight-type program for airfare.",
    "marriott": "Marriott Bonvoy is a hotel-type program; use for stays.",
    "hilton": "Hilton Honors is a hotel-type program for accommodation.",
    "ihg": "IHG One Rewards is a hotel-type program.",
    "airbnb": "Airbnb credits are hotel-type and must apply only to accommodation.",
    "makemytrip": "MakeMyTrip credits are wallet-type and flexible across travel.",
    "hdfc smartbuy": "HDFC SmartBuy is a wallet-type program for flexible travel spend.",
}

# program doc key -> (catalog program key, program type)
PROGRAM_METADATA = {
    "air india": ("air-india", "flight"),
    "vistara": ("air-india", "flight"),
    "indigo": ("indigo", "flight"),
    "marriott": ("marriott", "hotel"),
    "hilton": ("hilton", "hotel"),
    "ihg": ("ihg", "hotel"),
    "airbnb": (None, "hotel"),
    "makemytrip": (None, "wallet"),
    "hdfc smartbuy": (None, "wallet"),
}

CARD_BENEFIT_DOCS = {
    "hdfc regalia": "HDFC Regalia handles residual cash with strong reward earnings.",
    "sbi prime": "SBI Prime card pays remaining amounts and earns reward points.",
    "axis atlas": "Axis Atlas earns boosted miles on travel-coded transactions.",
    "amex platinum travel": "Amex Platinum Travel offers travel vouchers and accelerated points on bookings.",
}

# (id, title, text, program_key)
REDEMPTION_POLICIES: list[tuple[str, str, str, str | None]] = [
    ("policy-award-taxes", "Award taxes and fees",
     "Award flight redemptions cover the base fare only; government taxes and carrier fees are still paid in cash as the award's cash component.", None),
    ("policy-value-per-point", "Value per point",
     "Value per point equals the cash price minus the cash payable on the award, divided by the points required. Higher is better.", None),
    ("policy-baseline-value", "Judging a redemption",
     "A redemption is worth making when its value per point is at or above what a point is normally worth; below that, paying cash and keeping the points is usually better.", None),
    ("policy-single-program", "No pooling across programs",
     "Fixed award-chart redemptions need the full points price in a single program; points from different programs cannot be combined on one award.", None),
    ("policy-wallet-partial", "Partial payment with flexible points",
     "Wallet and card reward points can pay part of a fare or stay at their conversion rate, with the remainder paid in cash.", None),
    ("policy-saver-vs-flex", "Saver versus flexible awards",
     "Saver awards cost fewer points but are non-refundable; flexible awards cost more points and allow changes or refunds.", None),
    ("policy-hotel-per-night", "Hotel award pricing",
     "Hotel award stays are priced per night: total points equal points per night multiplied by the number of nights.", None),
    ("policy-hilton-fifth-night", "Hilton fifth night free",
     "Hilton Honors standard award stays of five nights or more include every fifth night free.", "hilton"),
    ("policy-marriott-categories", "Marriott award categories",
     "Marriott Bonvoy award nights are priced by hotel category; higher categories need more points per night.", "marriott"),
    ("policy-ihg-midscale", "IHG mid-scale awards",
     "IHG One Rewards mid-scale hotels need fewer points per night, but each IHG point is typically worth less than a Marriott point.", "ihg"),
    ("policy-indigo-bluchip", "IndiGo BluChip redemptions",
     "IndiGo BluChip redemptions apply to the base fare at roughly one rupee per BluChip; taxes are paid in cash.", "indigo"),
    ("policy-air-india-chart", "Air India award chart",
     "Air India Maharaja Club domestic awards use a distance-based chart with short, medium and long-haul bands.", "air-india"),
    ("policy-expiry", "Points expiry",
     "Points expiry rules differ by program and are not tracked by Ledger; check your program account before relying on a balance.", None),
    ("policy-transfers", "Point transfers",
     "Transfers between programs, such as card points to airline miles, are not modelled; Ledger only uses balances already held in each program.", None),
    ("policy-sample-inventory", "Sample inventory",
     "Ledger's redemption catalog is illustrative sample data, not live award availability; confirm seats and rooms with the program before booking.", None),
    ("policy-read-only", "Read-only assistant",
     "Ledger's assistant cannot book, cancel or transfer anything; any future booking action will require explicit user confirmation.", None),
    ("policy-cancellation", "Award cancellations",
     "Cancelling an award may forfeit points or incur a redeposit fee depending on fare type; flexible awards are safest when plans may change.", None),
]


ACRONYMS = {"Hdfc": "HDFC", "Sbi": "SBI", "Ihg": "IHG"}


def _title(key: str) -> str:
    return " ".join(ACRONYMS.get(word, word) for word in key.title().split())


def all_documents() -> list[dict[str, Any]]:
    docs: list[dict[str, Any]] = [
        {"id": f"rule-{i + 1}", "type": "base", "title": "Allocation rule", "text": text, "source": HANDBOOK}
        for i, text in enumerate(BASE_DOCS)
    ]
    for key, text in LOYALTY_PROGRAM_DOCS.items():
        program_key, program_type = PROGRAM_METADATA.get(key, (None, None))
        docs.append({
            "id": f"program-{key.replace(' ', '-')}",
            "type": "loyalty",
            "key": key,
            "title": f"{_title(key)} program type",
            "text": text,
            "source": HANDBOOK,
            "program_key": program_key,
            "program_type": program_type,
        })
    for key, text in CARD_BENEFIT_DOCS.items():
        docs.append({
            "id": f"card-{key.replace(' ', '-')}",
            "type": "card",
            "key": key,
            "title": f"{_title(key)} card",
            "text": text,
            "source": HANDBOOK,
        })
    for doc_id, title, text, program_key in REDEMPTION_POLICIES:
        docs.append({
            "id": doc_id,
            "type": "policy",
            "title": title,
            "text": text,
            "source": HANDBOOK,
            "program_key": program_key,
        })
    return docs
