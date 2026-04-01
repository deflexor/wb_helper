# Monorepo initialization — design

**Date:** 2026-04-01  
**Status:** Approved (requirements provided by product owner)

## Goal

Initialize a lightweight monorepo for a seller SaaS (Wildberries / Ozon): Rust API, React dashboard, Python AI gateway, shared E2E tests, and Docker-based local dependencies.

## Architecture

| Area | Choice | Rationale |
|------|--------|-----------|
| HTTP (Rust) | **Axum** | Async, Tower ecosystem, small surface; fits a small VDS better than a heavier stack. |
| DB access | **sqlx** (Postgres) | Compile-time checked queries when used; dependency declared now for upcoming features. |
| Frontend | **Vite + React + TS** | Fast dev server, standard tooling. |
| Styling | **Tailwind + shadcn/ui** | Accessible primitives, theme via CSS variables in `globals.css`. |
| State / server cache | **Zustand + TanStack Query** | Minimal client state; server state via Query. |
| AI | **FastAPI** | Async-friendly; OpenRouter + Qdrant integration in later tasks. |
| E2E | **Playwright** in `/tests/e2e` | Single place for cross-app checks. |
| Task tracking | **Beads (`bd`)** | Epic “MVP Launch” with phase placeholders. |

## Repository layout

```
/backend          — Axum app, sqlx, `cargo test`
/frontend         — Vite React app, Vitest, shadcn, i18n
/ai-service       — FastAPI, pytest
/tests/e2e        — Playwright config + specs
/infra            — docker-compose.yml
```

## Testing

- **TDD:** Add a failing integration test for `GET /api/hello` before implementing the handler; verify red then green.
- Backend: unit/integration via `cargo test`.
- Frontend: Vitest for units; Playwright for smoke load.
- ai-service: pytest + httpx `TestClient`.

## Constraints

- English for code comments and documentation.
- Keep images and default resource limits modest for small VPS/VDS hosting.

## Out of scope (this change)

- Production TLS, Kubernetes, and CI pipelines (follow-up beads).
- Real OpenRouter/Qdrant wiring beyond placeholders in compose.
