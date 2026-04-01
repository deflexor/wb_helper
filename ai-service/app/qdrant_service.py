"""Qdrant collections, embedding via OpenRouter, upsert + semantic search."""

from __future__ import annotations

import logging
import uuid
from typing import Any, Sequence

import httpx
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.config import Settings
from app.openrouter_client import OpenRouterHttpError, fetch_embeddings

logger = logging.getLogger(__name__)


class QdrantVectorService:
    def __init__(
        self,
        settings: Settings,
        http_client: httpx.AsyncClient,
        qdrant: AsyncQdrantClient | None = None,
    ) -> None:
        self._settings = settings
        self._http = http_client
        self._qdrant = qdrant or AsyncQdrantClient(url=settings.qdrant_url)

    async def close(self) -> None:
        await self._qdrant.close()

    async def ensure_collection(self, vector_size: int) -> None:
        name = self._settings.qdrant_collection
        exists = await self._qdrant.collection_exists(name)
        if exists:
            return
        await self._qdrant.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        logger.info("qdrant created collection=%s dim=%s", name, vector_size)

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        return await fetch_embeddings(self._http, self._settings, list(texts))

    async def upsert_documents(
        self,
        *,
        user_id: str,
        documents: list[dict[str, Any]],
    ) -> int:
        """Each document: id (str), text (str), optional extra payload keys."""
        if not documents:
            return 0
        texts = [str(d["text"]) for d in documents]
        vectors = await self.embed_texts(texts)
        if not vectors:
            raise OpenRouterHttpError(502, "empty embeddings")
        dim = len(vectors[0])
        await self.ensure_collection(dim)

        points: list[PointStruct] = []
        for vec, doc in zip(vectors, documents, strict=True):
            raw_id = doc.get("id")
            if raw_id is None:
                point_id: str | int = str(uuid.uuid4())
            elif isinstance(raw_id, int):
                point_id = raw_id
            else:
                point_id = str(raw_id)
            payload = {
                "user_id": user_id,
                "text": doc["text"],
                **{k: v for k, v in doc.items() if k not in ("id", "text")},
            }
            points.append(PointStruct(id=point_id, vector=vec, payload=payload))

        await self._qdrant.upsert(
            collection_name=self._settings.qdrant_collection,
            points=points,
            wait=True,
        )
        logger.info("qdrant upsert count=%s user=%s", len(points), user_id)
        return len(points)

    async def search_similar(
        self,
        *,
        user_id: str,
        query: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        qvec = (await self.embed_texts([query]))[0]
        flt = Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))])
        res = await self._qdrant.search(
            collection_name=self._settings.qdrant_collection,
            query_vector=qvec,
            limit=limit,
            query_filter=flt,
            with_payload=True,
        )
        out: list[dict[str, Any]] = []
        for hit in res:
            out.append(
                {
                    "score": float(hit.score),
                    "payload": hit.payload or {},
                }
            )
        return out
