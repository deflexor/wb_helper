# AI Orchestration Phase 3 Implementation Plan

> **For agentic workers:** Implement with strict TDD (failing test → minimal pass → refactor). Use `pytest` / `pytest-asyncio` / `respx` for HTTP mocks.

**Goal:** AI service with OpenRouter model routing by subscription tier, retries + circuit breaker + fallback chain, Qdrant embeddings/search, structured prompts, and HTTP API for the Rust backend.

**Architecture:** FastAPI app owns orchestration. Injected `httpx.AsyncClient` talks to OpenRouter; `qdrant_client` talks to Qdrant. Tier and tool name select an ordered model list; failures advance the chain after retries; per-model circuit breakers reduce hammering bad endpoints. Prompts are data-driven templates with context injection.

**Tech Stack:** Python 3.12, FastAPI, httpx, pydantic-settings, qdrant-client, pytest-asyncio, respx.

## Fallback decision tree (brainstorming)

1. **Primary chain** — `free` tier: ordered free/Open models; `paid` tier: ordered premium models (env-configurable slugs).
2. **Per model attempt** — If circuit for that model is **open**, skip to next model (log `circuit_open`).
3. **Retries** — For transient errors (timeout, HTTP 5xx, 429): up to N attempts with exponential backoff; each failure increments circuit failure count.
4. **Hard failure** — 4xx (except 429) or exhausted retries: record failure; if failures ≥ threshold, trip circuit; **try next model** in chain.
5. **Free exhaustion** — If optional `allow_paid_fallback_for_free` is true, append a **cheap paid** model (e.g. GPT-4o-mini) and add response warning `paid_fallback_used`; if false, return error with last error detail.
6. **Logging** — Structured log lines: `model_attempt`, `model_switch`, `retry`, `circuit_state`, `error` (no secrets).

**Backend contract:** HTTP JSON (no gRPC in this iteration). Rust calls `AI_SERVICE_URL` with optional `X-Internal-Key`. Endpoints: `POST /v1/chat/completions`, `POST /v1/embeddings`, `POST /v1/vectors/upsert`, `POST /v1/vectors/search`, `POST /v1/analysis/niche` (semantic aggregate stub calling search + optional LLM).

---

### Task 1: Config and schemas

**Files:** `ai-service/app/config.py`, `ai-service/app/schemas.py`, `ai-service/tests/test_config.py`

- [ ] Tests for default model lists and bounds (`max_total_message_chars`).
- [ ] Implement `Settings` via `pydantic-settings`.

### Task 2: Model router

**Files:** `ai-service/app/model_router.py`, `ai-service/tests/test_model_router.py`

- [ ] Test: free tier returns free chain; paid returns paid chain; unknown tool uses `default`.

### Task 3: Circuit breaker

**Files:** `ai-service/app/circuit_breaker.py`, `ai-service/tests/test_circuit_breaker.py`

- [ ] Test: opens after threshold failures; half-open after cooldown; success closes.

### Task 4: OpenRouter client (mocked)

**Files:** `ai-service/app/openrouter_client.py`, `ai-service/tests/test_openrouter_client.py`

- [ ] Test: chat completion success; maps 5xx to retryable; respects timeout.
- [ ] Test: embeddings endpoint parses vector dimensions.

### Task 5: Orchestrator

**Files:** `ai-service/app/orchestrator.py`, `ai-service/tests/test_orchestrator.py`

- [ ] Test: first model fails → second succeeds; logs/switch metadata in result.
- [ ] Test: message payload truncated to `max_total_message_chars` without crash.

### Task 6: Prompt templates

**Files:** `ai-service/app/prompts/templates.py`, `ai-service/tests/test_prompts.py`

- [ ] Test: SEO / review / pricing system prompts include injected `user` and `competitor` fields.

### Task 7: Qdrant service

**Files:** `ai-service/app/qdrant_service.py`, `ai-service/tests/test_qdrant_service.py` (mock client), `ai-service/tests/test_qdrant_integration.py` (real Qdrant if `QDRANT_URL` set)

- [ ] Test with mocks: ensure_collection, upsert, search flow.
- [ ] Integration: embed (mock OpenRouter) or real if key present — keep integration behind env.

### Task 8: FastAPI routes

**Files:** `ai-service/app/main.py`, `ai-service/tests/test_v1_api.py`

- [ ] Test: `/v1/chat/completions` returns 401 without key when configured; 200 with mocked orchestrator path via dependency override or respx global.

### Task 9: Dependencies and Docker

**Files:** `ai-service/requirements.txt`, `infra/docker-compose.yml` (embedding model env if needed)

- [ ] Add `qdrant-client`, `pydantic-settings`, `pytest-asyncio`, `respx`.

### Task 10: Backend hook (minimal)

**Files:** `backend/` — document env `AI_SERVICE_URL`, `AI_SERVICE_INTERNAL_KEY`; optional thin `ai_client` module for future calls (stub OK if no routes yet).

---

Quality gates: `cd ai-service && pytest -v` (all unit); `pytest -m integration` when Qdrant available.
