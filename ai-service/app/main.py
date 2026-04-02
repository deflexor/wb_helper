"""FastAPI entrypoint: health, orchestrated chat, embeddings, Qdrant, niche analysis."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.routing import APIRouter

from app.circuit_breaker import CircuitBreaker
from app.config import Settings, get_settings
from app.orchestrator import AllModelsFailedError, run_chat_orchestration
from app.qdrant_service import QdrantVectorService
from app.schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    NicheAnalysisRequest,
    NicheAnalysisResponse,
    TokenUsage,
    VectorSearchRequest,
    VectorSearchResponse,
    VectorUpsertRequest,
    VectorUpsertResponse,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.http = httpx.AsyncClient()
    app.state.breaker = CircuitBreaker(
        settings.circuit_failure_threshold,
        settings.circuit_open_seconds,
    )
    yield
    await app.state.http.aclose()


app = FastAPI(title="WB Helper AI Service", version="0.2.0", lifespan=lifespan)


def require_internal(
    settings: Annotated[Settings, Depends(get_settings)],
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
) -> None:
    if settings.internal_api_key and (x_internal_key or "") != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="invalid or missing X-Internal-Key")


v1 = APIRouter(prefix="/v1", dependencies=[Depends(require_internal)])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@v1.post("/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(body: ChatCompletionRequest, request: Request) -> ChatCompletionResponse:
    settings: Settings = request.app.state.settings
    if not settings.openrouter_api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured")
    try:
        result = await run_chat_orchestration(
            settings=settings,
            breaker=request.app.state.breaker,
            client=request.app.state.http,
            subscription_tier=body.subscription_tier,
            tool=body.tool,
            user_messages=body.messages,
            context=body.context,
        )
    except AllModelsFailedError as e:
        logger.error("chat all models failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail={"message": str(e), "events": e.events},
        ) from e
    usage: TokenUsage | None = None
    if result.usage:
        usage = TokenUsage(
            prompt_tokens=int(result.usage.get("prompt_tokens", 0)),
            completion_tokens=int(result.usage.get("completion_tokens", 0)),
            total_tokens=int(result.usage.get("total_tokens", 0)),
        )

    return ChatCompletionResponse(
        content=result.content,
        model_used=result.model_used,
        warnings=result.warnings,
        events=result.events,
        usage=usage,
    )


@v1.post("/embeddings", response_model=EmbeddingResponse)
async def embeddings(body: EmbeddingRequest, request: Request) -> EmbeddingResponse:
    settings: Settings = request.app.state.settings
    if not settings.openrouter_api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured")
    from app.openrouter_client import OpenRouterHttpError, fetch_embeddings

    client: httpx.AsyncClient = request.app.state.http
    try:
        vectors = await fetch_embeddings(client, settings, body.texts)
    except OpenRouterHttpError as e:
        raise HTTPException(status_code=502, detail=e.detail) from e
    return EmbeddingResponse(vectors=vectors, model=settings.embedding_model)


@v1.post("/vectors/upsert", response_model=VectorUpsertResponse)
async def vectors_upsert(body: VectorUpsertRequest, request: Request) -> VectorUpsertResponse:
    settings: Settings = request.app.state.settings
    if not settings.openrouter_api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured")
    client: httpx.AsyncClient = request.app.state.http
    svc = QdrantVectorService(settings, client)
    try:
        n = await svc.upsert_documents(user_id=body.user_id, documents=body.documents)
    finally:
        await svc.close()
    return VectorUpsertResponse(upserted=n)


@v1.post("/vectors/search", response_model=VectorSearchResponse)
async def vectors_search(body: VectorSearchRequest, request: Request) -> VectorSearchResponse:
    settings: Settings = request.app.state.settings
    if not settings.openrouter_api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured")
    client: httpx.AsyncClient = request.app.state.http
    svc = QdrantVectorService(settings, client)
    try:
        matches = await svc.search_similar(
            user_id=body.user_id,
            query=body.query,
            limit=body.limit,
        )
    finally:
        await svc.close()
    return VectorSearchResponse(matches=matches)


@v1.post("/analysis/niche", response_model=NicheAnalysisResponse)
async def niche_analysis(body: NicheAnalysisRequest, request: Request) -> NicheAnalysisResponse:
    settings: Settings = request.app.state.settings
    client: httpx.AsyncClient = request.app.state.http
    if not settings.openrouter_api_key:
        return NicheAnalysisResponse(matches=[], summary=None)

    svc = QdrantVectorService(settings, client)
    try:
        matches = await svc.search_similar(
            user_id=body.user_id,
            query=body.query,
            limit=body.limit,
        )
    except Exception as e:
        logger.warning("niche search failed: %s", e)
        await svc.close()
        raise HTTPException(status_code=502, detail="vector search failed") from e
    await svc.close()

    summary: str | None = None
    if matches:
        lines = [str(m.get("payload", {}).get("text", "")) for m in matches[:8]]
        ctx = {"user": body.user_id, "competitor": "see_retrieved_texts"}
        user_msgs = [
            {
                "role": "user",
                "content": "Summarize niche trends from these product texts:\n"
                + "\n---\n".join(lines[:20]),
            }
        ]
        try:
            orch = await run_chat_orchestration(
                settings=settings,
                breaker=request.app.state.breaker,
                client=client,
                subscription_tier=body.subscription_tier,
                tool="default",
                user_messages=user_msgs,
                context=ctx,
            )
            summary = orch.content
        except AllModelsFailedError as e:
            logger.warning("niche summary LLM failed: %s", e)
            summary = None

    return NicheAnalysisResponse(matches=matches, summary=summary)


app.include_router(v1)
