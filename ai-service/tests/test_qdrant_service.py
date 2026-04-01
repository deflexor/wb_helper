"""Qdrant service unit tests with mocked client."""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.config import Settings
from app.qdrant_service import QdrantVectorService


@pytest.mark.asyncio
async def test_upsert_documents_ensures_collection_and_upserts() -> None:
    settings = Settings(
        openrouter_api_key="k",
        qdrant_url="http://localhost:6333",
        qdrant_collection="test_col",
    )
    qdrant = AsyncMock()
    qdrant.collection_exists.return_value = False
    qdrant.create_collection = AsyncMock()
    qdrant.upsert = AsyncMock()

    svc = QdrantVectorService(settings, httpx.AsyncClient(), qdrant=qdrant)
    svc.embed_texts = AsyncMock(return_value=[[0.1, 0.2, 0.3]])  # type: ignore[method-assign]

    n = await svc.upsert_documents(
        user_id="u1",
        documents=[{"id": "d1", "text": "hello", "sku": "x"}],
    )
    assert n == 1
    qdrant.create_collection.assert_awaited()
    qdrant.upsert.assert_awaited()
    await svc.close()


@pytest.mark.asyncio
async def test_search_similar_filters_by_user() -> None:
    settings = Settings(openrouter_api_key="k")
    qdrant = AsyncMock()
    hit = MagicMock()
    hit.score = 0.9
    hit.payload = {"user_id": "u1", "text": "t"}
    qdrant.search = AsyncMock(return_value=[hit])

    svc = QdrantVectorService(settings, httpx.AsyncClient(), qdrant=qdrant)
    svc.embed_texts = AsyncMock(return_value=[[0.0, 1.0, 0.0]])  # type: ignore[method-assign]

    out = await svc.search_similar(user_id="u1", query="q", limit=5)
    assert len(out) == 1
    assert out[0]["score"] == pytest.approx(0.9)
    args, kwargs = qdrant.search.await_args
    assert kwargs["query_filter"] is not None
    await svc.close()
