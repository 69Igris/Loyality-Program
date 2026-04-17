import json
import os
import re
from typing import Any, cast

import faiss
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from groq import Groq
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

load_dotenv()

app = FastAPI(title="Loyalty RAG Service")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
embedder = SentenceTransformer("all-MiniLM-L6-v2")

BASE_DOCS = [
    "Airline points are used for flights.",
    "Hotel points are used for stays and accommodation.",
    "Wallet points can be used flexibly for both flights and hotels.",
    "Airline points should never be used in hotel redemption steps.",
    "Hotel points should never be used in flight redemption steps.",
    "Card payments are used for remaining cash amount after point redemption.",
]

LOYALTY_PROGRAM_DOCS = {
    "air india": "Air India is a flight-type program and should be applied to flights only.",
    "vistara": "Vistara is a flight-type program and points should be used for airfare.",
    "indigo": "IndiGo is a flight-type program for airfare redemption use cases.",
    "marriott": "Marriott is a hotel-type program and points should be used for stays.",
    "hilton": "Hilton is a hotel-type program and should be applied to accommodation.",
    "airbnb": "Airbnb credits are hotel-type and must be used for accommodation only.",
    "makemytrip": "MakeMyTrip credits are wallet-type and can be used flexibly across travel spend.",
}

CARD_BENEFIT_DOCS = {
    "hdfc regalia": "HDFC Regalia is useful for paying remaining balances while earning additional rewards.",
    "sbi prime": "SBI Prime can be used on remaining payable amount to optimize rewards.",
    "axis atlas": "Axis Atlas supports travel spend with strong reward potential.",
}

index = None
base_docs_with_meta = []


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


@app.on_event("startup")
def startup_event():
    global index, base_docs_with_meta
    print("Initializing FAISS index and generating embeddings...")
    try:
        base_docs_with_meta = [{"type": "base", "text": text} for text in BASE_DOCS]
        base_docs_with_meta.extend(
            [{"type": "loyalty", "key": key, "text": text} for key, text in LOYALTY_PROGRAM_DOCS.items()]
        )
        base_docs_with_meta.extend(
            [{"type": "card", "key": key, "text": text} for key, text in CARD_BENEFIT_DOCS.items()]
        )

        embeddings = embedder.encode(
            [item["text"] for item in base_docs_with_meta],
            convert_to_numpy=True,
        ).astype(np.float32)

        dim = embeddings.shape[1]
        index = cast(Any, faiss.IndexFlatL2(dim))
        index.add(embeddings)
        print(f"✅ Successfully loaded {len(base_docs_with_meta)} documents into FAISS.")
    except Exception as error:
        print(f"⚠️ Warning: Could not initialize embeddings. Error: {error}")


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _normalize_program_type(value: str | None) -> str | None:
    if not value:
        return None

    text = _normalize_text(value)
    if any(token in text for token in ["flight", "airline", "mile", "miles", "air india", "vistara", "indigo"]):
        return "flight"
    if any(token in text for token in ["hotel", "stay", "accommodation", "airbnb"]):
        return "hotel"
    if any(token in text for token in ["wallet", "flex", "mmt", "makemytrip"]):
        return "wallet"
    return None


def _merge_program_types(request: ExplainRequest) -> dict[str, str]:
    merged: dict[str, str] = {}

    for program_name, program_type in request.programTypes.items():
        normalized = _normalize_program_type(program_type)
        if normalized:
            merged[program_name] = normalized

    for option in request.options:
        for program_name, program_type in option.programTypes.items():
            normalized = _normalize_program_type(program_type)
            if normalized and program_name not in merged:
                merged[program_name] = normalized

    return merged


def _lookup_program_type(program_name: str, program_types: dict[str, str]) -> str | None:
    target = _normalize_text(program_name)
    for known_name, program_type in program_types.items():
        if _normalize_text(known_name) == target:
            return program_type
    return None


def _validate_usage_entries(
    entries: list[dict[str, Any]],
    allowed_types: set[str],
    section_name: str,
    program_types: dict[str, str],
) -> tuple[list[dict[str, Any]], list[str]]:
    valid_entries: list[dict[str, Any]] = []
    removed_notes: list[str] = []

    for entry in entries:
        program_name = str(entry.get("program", "")).strip()
        if not program_name:
            removed_notes.append(f"Removed {section_name} usage with missing program name")
            continue

        program_type = _lookup_program_type(program_name, program_types)
        if program_type is None:
            removed_notes.append(
                f"Removed {section_name} usage for {program_name} because program type is missing"
            )
            continue

        if program_type not in allowed_types:
            removed_notes.append(
                f"Removed {section_name} usage for {program_name} because type is {program_type}"
            )
            continue

        sanitized_entry = dict(entry)
        sanitized_entry["type"] = program_type
        valid_entries.append(sanitized_entry)

    return valid_entries, removed_notes


def _filter_options_by_domain_rules(
    options: list[OptionItem],
    program_types: dict[str, str],
) -> tuple[list[OptionItem], list[str]]:
    filtered_options: list[OptionItem] = []
    validation_notes: list[str] = []

    for option in options:
        valid_flight, removed_flight = _validate_usage_entries(
            option.usage.flight,
            {"flight", "wallet"},
            "flight",
            program_types,
        )
        valid_hotel, removed_hotel = _validate_usage_entries(
            option.usage.hotel,
            {"hotel", "wallet"},
            "hotel",
            program_types,
        )

        validation_notes.extend(removed_flight)
        validation_notes.extend(removed_hotel)

        filtered_options.append(
            OptionItem(
                name=option.name,
                effective_cost=option.effective_cost,
                usage=OptionUsage(flight=valid_flight, hotel=valid_hotel),
                programTypes=option.programTypes,
            )
        )

    # Keep only options with at least one valid usage entry when possible.
    non_empty = [
        option for option in filtered_options if len(option.usage.flight) > 0 or len(option.usage.hotel) > 0
    ]
    if non_empty:
        return non_empty, validation_notes

    return filtered_options, validation_notes


def _pick_best_option(filtered_options: list[OptionItem], requested_best: OptionItem | None) -> OptionItem:
    if requested_best:
        for option in filtered_options:
            if _normalize_text(option.name) == _normalize_text(requested_best.name):
                return option

    return min(filtered_options, key=lambda option: float(option.effective_cost))


def _retrieve_relevant_docs(
    user_context: dict[str, Any] | str,
    options: list[OptionItem],
    best_option: OptionItem,
    program_types: dict[str, str],
) -> list[str]:
    runtime_docs = [item["text"] for item in base_docs_with_meta]

    # Add strict rule docs explicitly so retrieval always includes domain constraints.
    runtime_docs.extend(
        [
            "Airline points are used for flights.",
            "Hotel points are used for stays.",
            "Wallet points are flexible and can be used in both domains.",
        ]
    )

    options_text = json.dumps([option.model_dump() for option in options], ensure_ascii=False)
    user_text = user_context if isinstance(user_context, str) else json.dumps(user_context, ensure_ascii=False)
    type_text = " ".join([f"{name}:{ptype}" for name, ptype in program_types.items()])

    runtime_docs.append(options_text)
    query_text = f"{user_text}\n{options_text}\nBest:{best_option.model_dump_json()}\nProgramTypes:{type_text}"

    runtime_embeddings = embedder.encode(runtime_docs, convert_to_numpy=True).astype(np.float32)
    runtime_index = cast(Any, faiss.IndexFlatL2(runtime_embeddings.shape[1]))
    runtime_index.add(runtime_embeddings)

    query_embedding = embedder.encode([query_text], convert_to_numpy=True).astype(np.float32)
    k = min(8, len(runtime_docs))
    _, indices = runtime_index.search(query_embedding, k)
    retrieved = [runtime_docs[index] for index in indices[0] if index >= 0]

    unique_docs: list[str] = []
    seen = set()
    for doc in retrieved:
        normalized = _normalize_text(doc)
        if normalized in seen:
            continue
        seen.add(normalized)
        unique_docs.append(doc)

    return unique_docs[:8]


def _format_explanation(raw_text: str) -> str:
    text = raw_text.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in {'"', "'"}:
        text = text[1:-1].strip()

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if 3 <= len(lines) <= 5:
        return "\n".join(lines)

    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", re.sub(r"\s+", " ", text))
        if sentence.strip()
    ]
    if len(sentences) >= 3:
        return "\n".join(sentences[:5])

    return text


def _build_rule_based_explanation(user_context: dict[str, Any] | str, best_option: OptionItem) -> str:
    flight_usage = best_option.usage.flight
    hotel_usage = best_option.usage.hotel

    flight_programs = [entry.get("program", "") for entry in flight_usage if entry.get("program")]
    hotel_programs = [entry.get("program", "") for entry in hotel_usage if entry.get("program")]

    flight_phrase = (
        f"{', '.join(flight_programs)} points are used for flight costs"
        if flight_programs
        else "flight payments are covered with allowed wallet/card methods"
    )
    hotel_phrase = (
        f"{', '.join(hotel_programs)} points are used for hotel stays"
        if hotel_programs
        else "hotel costs are handled without violating point-domain rules"
    )

    savings_line = ""
    if isinstance(user_context, dict) and "savings" in user_context:
        raw_savings = user_context["savings"]
        if isinstance(raw_savings, (int, float)):
            savings_value = f"₹{raw_savings:,.2f}"
        else:
            savings_value = str(raw_savings)
        savings_line = f"This strategy still preserves strong savings of {savings_value} versus full-cash booking."

    lines = [
        f"{best_option.name} is the most consistent option for this trip because it keeps redemption usage domain-correct.",
        f"For flights, {flight_phrase}.",
        f"For hotels, {hotel_phrase}.",
        "The plan is valid because flight-type points stay on flights, hotel-type points stay on accommodation, and wallet points remain flexible.",
    ]

    if savings_line:
        lines[-1] = savings_line

    return "\n".join(lines)


def _needs_fallback(explanation: str, best_option: OptionItem) -> bool:
    normalized = _normalize_text(explanation)
    low_quality_markers = ["i will explain", "here's a breakdown", "1.", "2."]
    if any(marker in normalized for marker in low_quality_markers):
        return True

    # If we have both flight and hotel usage, ensure explanation references both concepts.
    if best_option.usage.flight and "flight" not in normalized:
        return True
    if best_option.usage.hotel and all(token not in normalized for token in ["hotel", "stay", "accommodation"]):
        return True

    return False


@app.post("/explain", response_model=ExplainResponse)
def explain(request: ExplainRequest):
    if index is None:
        raise HTTPException(status_code=500, detail="Vector DB unavailable.")
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="Missing GROQ_API_KEY in environment variables.")

    try:
        if len(request.options) == 0:
            raise HTTPException(status_code=400, detail="At least one option is required")

        program_types = _merge_program_types(request)
        filtered_options, validation_notes = _filter_options_by_domain_rules(request.options, program_types)
        best_option = _pick_best_option(filtered_options, request.bestOption)

        user_context_payload: dict[str, Any] | str = request.userContext
        if isinstance(user_context_payload, dict) and validation_notes:
            user_context_payload = {
                **user_context_payload,
                "validationNotes": validation_notes,
            }

        retrieved_docs = _retrieve_relevant_docs(
            user_context_payload,
            filtered_options,
            best_option,
            program_types,
        )

        user_context_text = (
            json.dumps(user_context_payload, indent=2, ensure_ascii=False)
            if isinstance(user_context_payload, dict)
            else user_context_payload
        )
        options_text = json.dumps(
            [option.model_dump() for option in filtered_options],
            indent=2,
            ensure_ascii=False,
        )
        best_option_text = json.dumps(best_option.model_dump(), indent=2, ensure_ascii=False)
        program_types_text = json.dumps(program_types, indent=2, ensure_ascii=False)
        retrieved_docs_text = "\n".join([f"- {doc}" for doc in retrieved_docs])

        prompt = f"""You are a travel optimization assistant.

STRICT RULES:

* Airline (flight-type) points can ONLY be used for flights
* Hotel points can ONLY be used for accommodation
* Wallet points can be used flexibly

User data:
{user_context_text}

Options:
{options_text}

Best option:
{best_option_text}

Program types:
{program_types_text}

Relevant knowledge:
{retrieved_docs_text}

Explain the strategy while STRICTLY respecting program usage rules.

If any option violates these rules, IGNORE that usage and explain correctly."""

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You explain travel optimization plans clearly and must obey strict domain usage constraints.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=180,
        )

        raw_content = completion.choices[0].message.content or ""
        explanation = _format_explanation(raw_content)
        if _needs_fallback(explanation, best_option):
            explanation = _build_rule_based_explanation(user_context_payload, best_option)
        return ExplainResponse(explanation=explanation)
    except HTTPException:
        raise
    except Exception as error:
        print(f"Error during RAG generation: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to generate explanation. Error: {str(error)}")


# To run locally:
# uvicorn main:app --reload --port 8000
