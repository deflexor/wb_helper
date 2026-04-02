"""HTTP JSON contract for the Rust backend and internal callers."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatCompletionRequest(BaseModel):
    subscription_tier: Literal["free", "paid"]
    tool: Literal["seo", "review", "pricing", "returns", "default"]
    messages: list[dict[str, Any]]
    context: dict[str, Any] = Field(default_factory=dict)


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatCompletionResponse(BaseModel):
    content: str
    model_used: str
    warnings: list[str] = Field(default_factory=list)
    events: list[dict[str, Any]] = Field(default_factory=list)
    usage: TokenUsage | None = None


class EmbeddingRequest(BaseModel):
    texts: list[str]


class EmbeddingResponse(BaseModel):
    vectors: list[list[float]]
    model: str


class VectorUpsertRequest(BaseModel):
    user_id: str
    documents: list[dict[str, Any]]


class VectorUpsertResponse(BaseModel):
    upserted: int


class VectorSearchRequest(BaseModel):
    user_id: str
    query: str
    limit: int = Field(default=10, ge=1, le=100)


class VectorSearchResponse(BaseModel):
    matches: list[dict[str, Any]]


class NicheAnalysisRequest(BaseModel):
    user_id: str
    query: str
    limit: int = Field(default=15, ge=1, le=50)
    subscription_tier: Literal["free", "paid"] = "free"


class NicheAnalysisResponse(BaseModel):
    matches: list[dict[str, Any]]
    summary: str | None = None
