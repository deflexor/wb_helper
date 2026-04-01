"""Integration tests: real Qdrant + OpenRouter when env is set."""

import os
import uuid

import httpx
import pytest

from app.config import Settings
from app.qdrant_service import QdrantVectorService

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_embed_upsert_search_roundtrip(monkeypatch: pytest.MonkeyPatch) -> None:
    qurl = os.environ.get("QDRANT_URL", "").strip()
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not qurl:
        pytest.skip("QDRANT_URL not set")
    if not key:
        pytest.skip("OPENROUTER_API_KEY not set")

    coll = f"wb_helper_it_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("QDRANT_URL", qurl)
    monkeypatch.setenv("OPENROUTER_API_KEY", key)
    monkeypatch.setenv("AI_QDRANT_COLLECTION", coll)
    settings = Settings()

    uid = f"it-user-{uuid.uuid4().hex[:6]}"
    async with httpx.AsyncClient() as http:
        svc = QdrantVectorService(settings, http)
        try:
            n = await svc.upsert_documents(
                user_id=uid,
                documents=[
                    {"id": "p1", "text": "wireless earbuds battery life", "kind": "product"},
                    {"id": "p2", "text": "bluetooth headphones noise cancelling", "kind": "product"},
                ],
            )
            assert n == 2
            hits = await svc.search_similar(user_id=uid, query="earbuds sound", limit=5)
            assert len(hits) >= 1
        finally:
            await svc.close()

    from qdrant_client import QdrantClient

    sync = QdrantClient(url=qurl)
    try:
        sync.delete_collection(collection_name=coll)
    except Exception:
        pass
