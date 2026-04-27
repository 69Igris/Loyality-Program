"""Ledger RAG explanation service.

Production upgrades over the v0 prototype:
* FAISS index is built once at startup and persisted to disk for fast restarts.
* LLM completions are cached (LRU + TTL) keyed by a hash of the prompt context.
* Groq calls retry with exponential backoff on transient failures.
* /health/live and /health/ready signal liveness vs. readiness for orchestrators.
* Tighter system prompt + structured constraints reduce hallucination risk.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, cast

import faiss
import numpy as np
from cachetools import TTLCache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from groq import Groq
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from tenacity import (
    RetryError,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# ---------------------------------------------------------------------------
# Config & logging
# ---------------------------------------------------------------------------

load_dotenv()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s [rag] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)
log = logging.getLogger("rag")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
CACHE_TTL_SECONDS = int(os.getenv("LLM_CACHE_TTL", "3600"))
CACHE_MAX_ENTRIES = int(os.getenv("LLM_CACHE_MAX", "512"))

CACHE_DIR = Path(os.getenv("RAG_CACHE_DIR", ".cache"))
INDEX_PATH = CACHE_DIR / "faiss-index.bin"
META_PATH = CACHE_DIR / "faiss-meta.json"

# ---------------------------------------------------------------------------
# Knowledge base
# ---------------------------------------------------------------------------

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

CARD_BENEFIT_DOCS = {
    "hdfc regalia": "HDFC Regalia handles residual cash with strong reward earnings.",
    "sbi prime": "SBI Prime card pays remaining amounts and earns reward points.",
    "axis atlas": "Axis Atlas earns boosted miles on travel-coded transactions.",
    "amex platinum travel": "Amex Platinum Travel offers travel vouchers and accelerated points on bookings.",
}

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class OptionUsage(BaseModel):
    flight: list[dict[str, Any]] = Field(default_factory=list)
    hotel: list[dict[str, Any]] = Field(default_factory=list)


class OptionItem(BaseModel):
    name: str
    effective_cost: float | int
    usage: OptionUsage
    programTypes: dict[str, str] = Field(default_factory=dict)


class ExplainRequest(BaseModel):
    userContext: dict[str, Any] | str
    options: list[OptionItem]
    bestOption: OptionItem | None = None
    programTypes: dict[str, str] = Field(default_factory=dict)


class ExplainResponse(BaseModel):
    explanation: str
    cached: bool = False
    model: str = LLM_MODEL


# ---------------------------------------------------------------------------
# Index + cache state
# ---------------------------------------------------------------------------

_state: dict[str, Any] = {
    "embedder": None,
    "index": None,
    "docs": [],
    "client": None,
    "ready": False,
}

# Cache identical prompts → completions to cut latency & token cost.
_completion_cache: TTLCache[str, str] = TTLCache(
    maxsize=CACHE_MAX_ENTRIES, ttl=CACHE_TTL_SECONDS
)


def _all_docs() -> list[dict[str, Any]]:
    items = [{"type": "base", "text": text} for text in BASE_DOCS]
    items.extend(
        {"type": "loyalty", "key": k, "text": v} for k, v in LOYALTY_PROGRAM_DOCS.items()
    )
    items.extend(
        {"type": "card", "key": k, "text": v} for k, v in CARD_BENEFIT_DOCS.items()
    )
    return items


def _signature_for(docs: list[dict[str, Any]]) -> str:
    payload = json.dumps([d["text"] for d in docs], sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _initialize_retrieval() -> None:
    """Build (or load) the FAISS index. Persisted across restarts when possible."""
    if _state["index"] is not None and _state["embedder"] is not None:
        return

    log.info("Initializing embedder + FAISS index (model=%s)", EMBEDDING_MODEL)

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    docs = _all_docs()
    sig = _signature_for(docs)

    embedder = SentenceTransformer(EMBEDDING_MODEL)

    # Try loading the persisted index if its signature matches the current corpus.
    if INDEX_PATH.exists() and META_PATH.exists():
        try:
            meta = json.loads(META_PATH.read_text())
            if meta.get("signature") == sig and meta.get("model") == EMBEDDING_MODEL:
                index = faiss.read_index(str(INDEX_PATH))
                _state.update(embedder=embedder, index=index, docs=docs, ready=True)
                log.info("Loaded persisted FAISS index (%d docs)", len(docs))
                return
            log.info("Persisted index signature mismatched — rebuilding")
        except Exception as exc:  # noqa: BLE001
            log.warning("Could not load persisted index: %s — rebuilding", exc)

    # Rebuild
    embeddings = embedder.encode(
        [d["text"] for d in docs], convert_to_numpy=True
    ).astype(np.float32)
    index = cast(Any, faiss.IndexFlatL2(embeddings.shape[1]))
    index.add(embeddings)

    try:
        faiss.write_index(index, str(INDEX_PATH))
        META_PATH.write_text(json.dumps({"signature": sig, "model": EMBEDDING_MODEL}))
        log.info("Persisted FAISS index to %s", INDEX_PATH)
    except Exception as exc:  # noqa: BLE001
        log.warning("Could not persist FAISS index: %s", exc)

    _state.update(embedder=embedder, index=index, docs=docs, ready=True)


def _initialize_llm_client() -> None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        log.warning("GROQ_API_KEY missing — explanations will fall back to rule-based output")
        return
    if _state["client"] is None:
        _state["client"] = Groq(api_key=api_key)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _initialize_retrieval()
    _initialize_llm_client()
    yield


app = FastAPI(title="Ledger RAG Service", version="0.5.0", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Domain validation helpers
# ---------------------------------------------------------------------------


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _normalize_program_type(value: str | None) -> str | None:
    if not value:
        return None
    text = _normalize_text(value)
    if any(t in text for t in ("flight", "airline", "mile", "miles", "air india", "vistara", "indigo")):
        return "flight"
    if any(t in text for t in ("hotel", "stay", "accommodation", "airbnb", "marriott", "hilton", "ihg")):
        return "hotel"
    if any(t in text for t in ("wallet", "flex", "mmt", "makemytrip", "smartbuy")):
        return "wallet"
    return None


def _merge_program_types(request: ExplainRequest) -> dict[str, str]:
    merged: dict[str, str] = {}
    for name, ptype in request.programTypes.items():
        normalized = _normalize_program_type(ptype)
        if normalized:
            merged[name] = normalized
    for option in request.options:
        for name, ptype in option.programTypes.items():
            if name in merged:
                continue
            normalized = _normalize_program_type(ptype)
            if normalized:
                merged[name] = normalized
    return merged


def _lookup_program_type(name: str, program_types: dict[str, str]) -> str | None:
    target = _normalize_text(name)
    for known, ptype in program_types.items():
        if _normalize_text(known) == target:
            return ptype
    return None


def _validate_usage_entries(
    entries: list[dict[str, Any]],
    allowed: set[str],
    section: str,
    program_types: dict[str, str],
) -> tuple[list[dict[str, Any]], list[str]]:
    valid: list[dict[str, Any]] = []
    notes: list[str] = []
    for entry in entries:
        program_name = str(entry.get("program", "")).strip()
        if not program_name:
            notes.append(f"Removed {section} entry with missing program name")
            continue
        ptype = _lookup_program_type(program_name, program_types)
        if ptype is None:
            notes.append(f"Removed {section} entry for {program_name} (type unknown)")
            continue
        if ptype not in allowed:
            notes.append(f"Removed {section} entry for {program_name} (type {ptype} not allowed)")
            continue
        sanitized = dict(entry)
        sanitized["type"] = ptype
        valid.append(sanitized)
    return valid, notes


def _filter_options(
    options: list[OptionItem], program_types: dict[str, str]
) -> tuple[list[OptionItem], list[str]]:
    filtered: list[OptionItem] = []
    notes: list[str] = []
    for option in options:
        flight, n_flight = _validate_usage_entries(
            option.usage.flight, {"flight", "wallet"}, "flight", program_types
        )
        hotel, n_hotel = _validate_usage_entries(
            option.usage.hotel, {"hotel", "wallet"}, "hotel", program_types
        )
        notes.extend(n_flight + n_hotel)
        filtered.append(
            OptionItem(
                name=option.name,
                effective_cost=option.effective_cost,
                usage=OptionUsage(flight=flight, hotel=hotel),
                programTypes=option.programTypes,
            )
        )
    non_empty = [o for o in filtered if o.usage.flight or o.usage.hotel]
    return (non_empty if non_empty else filtered), notes


def _pick_best(options: list[OptionItem], requested: OptionItem | None) -> OptionItem:
    if requested:
        for o in options:
            if _normalize_text(o.name) == _normalize_text(requested.name):
                return o
    return min(options, key=lambda o: float(o.effective_cost))


def _retrieve_relevant_docs(query_text: str, k: int = 6) -> list[str]:
    embedder = _state["embedder"]
    index = _state["index"]
    docs = _state["docs"]
    if not embedder or not index or not docs:
        return [d["text"] for d in _all_docs()][:k]

    q = embedder.encode([query_text], convert_to_numpy=True).astype(np.float32)
    _, indices = index.search(q, min(k, len(docs)))
    retrieved = [docs[i]["text"] for i in indices[0] if i >= 0 and i < len(docs)]
    seen: set[str] = set()
    deduped: list[str] = []
    for doc in retrieved:
        norm = _normalize_text(doc)
        if norm not in seen:
            seen.add(norm)
            deduped.append(doc)
    return deduped


# ---------------------------------------------------------------------------
# Prompt + LLM
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are Ledger, a calm and precise travel-redemption analyst. "
    "Your job is to explain *why* a chosen redemption strategy is the best one — "
    "in 3 to 5 short sentences (one per line, no bullets, no numbered lists, no markdown). "
    "Hard rules you must obey:\n"
    "1. Airline (flight-type) points only ever cover flights.\n"
    "2. Hotel points only ever cover accommodation.\n"
    "3. Wallet points can apply to either domain.\n"
    "4. Use the exact program names provided. Never invent programs or numbers.\n"
    "5. Reference the savings figure if present. Stay matter-of-fact, not promotional."
)


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.4, min=0.4, max=2.0),
    retry=retry_if_exception_type(Exception),
)
def _call_llm(messages: list[dict[str, str]]) -> str:
    client = _state["client"]
    if client is None:
        raise RuntimeError("LLM client is not initialized")

    completion = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=220,
    )
    raw = completion.choices[0].message.content or ""
    return raw.strip()


def _format_explanation(raw: str) -> str:
    text = raw.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in {'"', "'"}:
        text = text[1:-1].strip()
    lines = [line.strip(" -*•") for line in text.splitlines() if line.strip()]
    if 3 <= len(lines) <= 5:
        return "\n".join(lines)
    sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", re.sub(r"\s+", " ", text))
        if s.strip()
    ]
    if len(sentences) >= 3:
        return "\n".join(sentences[:5])
    return text


def _rule_based_explanation(
    user_context: dict[str, Any] | str, best: OptionItem
) -> str:
    flight_progs = [e.get("program", "") for e in best.usage.flight if e.get("program")]
    hotel_progs = [e.get("program", "") for e in best.usage.hotel if e.get("program")]

    flight_phrase = (
        f"{', '.join(flight_progs)} cover flight costs"
        if flight_progs
        else "flight payments are settled via your card"
    )
    hotel_phrase = (
        f"{', '.join(hotel_progs)} cover the hotel stay"
        if hotel_progs
        else "the stay is paid in cash without consuming points"
    )

    savings_line = (
        "The plan respects the rule that flight points stay on flights and hotel points stay on hotels."
    )
    if isinstance(user_context, dict) and "savings" in user_context:
        amount = user_context["savings"]
        if isinstance(amount, (int, float)):
            savings_line = f"The strategy preserves ₹{amount:,.2f} in savings versus a full-cash booking."

    return "\n".join(
        [
            f"{best.name} is the strongest option for this trip given your wallet.",
            f"For flights, {flight_phrase}.",
            f"For hotels, {hotel_phrase}.",
            savings_line,
        ]
    )


def _needs_fallback(text: str, best: OptionItem) -> bool:
    norm = _normalize_text(text)
    bad_markers = ("i will explain", "here is a breakdown", "here's a breakdown", "step 1", "1.")
    if any(m in norm for m in bad_markers):
        return True
    if best.usage.flight and "flight" not in norm:
        return True
    if best.usage.hotel and not any(t in norm for t in ("hotel", "stay", "accommodation")):
        return True
    return False


def _cache_key(prompt_text: str) -> str:
    return hashlib.sha256(prompt_text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/")
def root():
    return {"service": "ledger-rag", "version": app.version, "ready": _state["ready"]}


@app.get("/health/live")
def health_live():
    return {"status": "live"}


@app.get("/health/ready")
def health_ready():
    if not _state["ready"]:
        raise HTTPException(status_code=503, detail="Index not yet initialized")
    return {
        "status": "ready",
        "indexSize": len(_state["docs"]),
        "llmConfigured": _state["client"] is not None,
        "cacheSize": len(_completion_cache),
    }


@app.post("/explain", response_model=ExplainResponse)
def explain(request: ExplainRequest):
    if not _state["ready"]:
        raise HTTPException(status_code=503, detail="RAG service not ready yet — try again in a moment.")

    if not request.options:
        raise HTTPException(status_code=400, detail="At least one option is required.")

    program_types = _merge_program_types(request)
    filtered_options, validation_notes = _filter_options(request.options, program_types)
    best_option = _pick_best(filtered_options, request.bestOption)

    user_context_payload: dict[str, Any] | str = request.userContext
    if isinstance(user_context_payload, dict) and validation_notes:
        user_context_payload = {**user_context_payload, "validationNotes": validation_notes}

    user_context_text = (
        json.dumps(user_context_payload, indent=2, ensure_ascii=False)
        if isinstance(user_context_payload, dict)
        else user_context_payload
    )
    options_text = json.dumps(
        [o.model_dump() for o in filtered_options], indent=2, ensure_ascii=False
    )
    best_option_text = json.dumps(best_option.model_dump(), indent=2, ensure_ascii=False)
    program_types_text = json.dumps(program_types, indent=2, ensure_ascii=False)

    retrieval_query = (
        f"{user_context_text}\n{options_text}\nBest:{best_option_text}\nProgramTypes:{program_types_text}"
    )
    docs = _retrieve_relevant_docs(retrieval_query, k=6)
    docs_text = "\n".join(f"- {d}" for d in docs)

    user_prompt = (
        "User data:\n"
        f"{user_context_text}\n\n"
        "Options considered:\n"
        f"{options_text}\n\n"
        "Best option:\n"
        f"{best_option_text}\n\n"
        "Program types (canonical):\n"
        f"{program_types_text}\n\n"
        "Relevant constraints:\n"
        f"{docs_text}\n\n"
        "Explain in 3–5 short sentences (one per line) why this strategy is best. "
        "Mention the programs by name and respect the constraints absolutely."
    )

    cache_key = _cache_key(SYSTEM_PROMPT + "\n" + user_prompt)
    if cached := _completion_cache.get(cache_key):
        log.info("LLM cache hit (key=%s…)", cache_key[:8])
        return ExplainResponse(explanation=cached, cached=True, model=LLM_MODEL)

    if _state["client"] is None:
        explanation = _rule_based_explanation(user_context_payload, best_option)
        _completion_cache[cache_key] = explanation
        return ExplainResponse(explanation=explanation, cached=False, model="rule-based")

    try:
        raw = _call_llm(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
        )
        explanation = _format_explanation(raw)
        if _needs_fallback(explanation, best_option):
            log.info("LLM output failed quality check — using rule-based fallback")
            explanation = _rule_based_explanation(user_context_payload, best_option)
    except RetryError as exc:
        log.warning("LLM retries exhausted: %s — falling back", exc)
        explanation = _rule_based_explanation(user_context_payload, best_option)
    except Exception as exc:  # noqa: BLE001
        log.error("Unexpected LLM error: %s — falling back", exc)
        explanation = _rule_based_explanation(user_context_payload, best_option)

    _completion_cache[cache_key] = explanation
    return ExplainResponse(explanation=explanation, cached=False, model=LLM_MODEL)


# Allow running with `python main.py` for local dev.
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
