"""Retrieval tests with a deterministic bag-of-words embedder (no model download)."""

import hashlib
import re

import numpy as np
import pytest
from fastapi.testclient import TestClient

import main

DIM = 256


class FakeEmbedder:
    def encode(self, texts, convert_to_numpy=True, normalize_embeddings=False):
        vectors = np.zeros((len(texts), DIM), dtype=np.float32)
        for row, text in enumerate(texts):
            for token in re.findall(r"[a-z]+", text.lower()):
                bucket = int(hashlib.md5(token.encode()).hexdigest(), 16) % DIM
                vectors[row, bucket] += 1.0
        if normalize_embeddings:
            norms = np.linalg.norm(vectors, axis=1, keepdims=True)
            vectors = vectors / np.where(norms == 0, 1, norms)
        return vectors


@pytest.fixture()
def client():
    embedder = FakeEmbedder()
    docs = main._all_docs()
    main._state.update(embedder=embedder, index=main._build_index(embedder, docs), docs=docs, ready=True)
    main._retrieve_cache.clear()
    yield TestClient(main.app)
    main._state.update(embedder=None, index=None, docs=[], ready=False)


def test_every_document_is_citable():
    docs = main._all_docs()
    ids = [d["id"] for d in docs]
    assert len(ids) == len(set(ids)), "document ids must be unique"
    assert all(d["title"] and d["source"] and d["text"] for d in docs)


def test_retrieve_returns_scored_evidence(client):
    res = client.post("/retrieve", json={"query": "award flight taxes and fees paid in cash", "k": 3})
    assert res.status_code == 200
    body = res.json()
    assert body["sufficient"] is True
    assert body["evidence"][0]["id"] == "policy-award-taxes"
    scores = [e["score"] for e in body["evidence"]]
    assert scores == sorted(scores, reverse=True)
    assert all(e["score"] >= body["min_score"] for e in body["evidence"])


def test_irrelevant_query_is_insufficient(client):
    res = client.post("/retrieve", json={"query": "zebra quantum volcano", "min_score": 0.3})
    body = res.json()
    assert res.status_code == 200
    assert body["evidence"] == []
    assert body["sufficient"] is False


def test_program_boost_and_metadata(client):
    res = client.post(
        "/retrieve",
        json={"query": "fifth night free on award stays", "programs": ["Hilton Honors"], "k": 2},
    )
    top = res.json()["evidence"][0]
    assert top["id"] == "policy-hilton-fifth-night"
    assert top["program_key"] == "hilton"


def test_results_are_cached(client):
    payload = {"query": "value per point", "k": 2}
    first = client.post("/retrieve", json=payload).json()
    second = client.post("/retrieve", json=payload).json()
    assert first["cached"] is False
    assert second["cached"] is True
    assert first["evidence"] == second["evidence"]


@pytest.mark.parametrize(
    "payload",
    [{"query": ""}, {"query": "x" * 501}, {"query": "ok", "k": 0}, {"query": "ok", "k": 99}],
)
def test_invalid_requests_rejected(client, payload):
    assert client.post("/retrieve", json=payload).status_code == 422


def test_not_ready_returns_503():
    main._state.update(ready=False)
    res = TestClient(main.app).post("/retrieve", json={"query": "anything"})
    assert res.status_code == 503
