# Monorepo initialization — implementation plan

> **For agentic workers:** Use **executing-plans** or **subagent-driven-development** task-by-task. Track work in **Beads (`bd`)**, not markdown TODOs.

**Goal:** Scaffold backend, frontend, ai-service, E2E, infra, README, and Beads epic/tasks; TDD for `/api/hello`.

**Architecture:** Axum + sqlx; Vite React + Tailwind + shadcn + i18n; FastAPI; Playwright in `/tests/e2e`; Docker Compose for Postgres, Qdrant, Redis, app images.

**Tech Stack:** Rust 2021, Node 20+, Python 3.11+, Docker Compose.

---

## Task 1: Backend crate and failing hello test (RED)

**Files:**
- Create: `backend/Cargo.toml`, `backend/src/main.rs`, `backend/src/lib.rs`, `backend/tests/hello_world.rs`

- [ ] Add `backend` binary+lib crate with axum, tokio, serde, tower, tower-http, sqlx (postgres runtime, no migrations yet).
- [ ] Write `tests/hello_world.rs`: `GET /api/hello` → 200, JSON body contains expected welcome key.
- [ ] Run `cargo test -p backend` — expect failure (404 or missing route).

## Task 2: Implement hello route (GREEN)

**Files:**
- Modify: `backend/src/lib.rs`, `backend/src/main.rs`

- [ ] Export `create_app()` router with `GET /api/hello` returning JSON `{ "message": "..." }`.
- [ ] Run `cargo test -p backend` — all pass.

## Task 3: Frontend scaffold + Vitest + Tailwind + shadcn + i18n

**Files:**
- Create: `frontend/*` (Vite template), `frontend/src/locales/en/translation.json`, `frontend/src/locales/ru/translation.json`, `frontend/src/i18n.ts`, `frontend/src/hooks/useTranslation.ts`, update `App.tsx` with `t('...')`.

- [ ] `npm create vite@latest` react-ts; install Tailwind, Zustand, TanStack Query, i18next, react-i18next.
- [ ] `npx shadcn@latest init` (defaults); add button, input, card, table, dialog, select, tabs, badge, alert, skeleton, dropdown-menu.
- [ ] Vitest + basic sanity test.
- [ ] Wrap UI strings in translation keys.

## Task 4: ai-service FastAPI + pytest (TDD)

**Files:**
- Create: `ai-service/pyproject.toml` or `requirements.txt`, `ai-service/app/main.py`, `ai-service/tests/test_health.py`

- [ ] Failing test for `GET /health` then implement.

## Task 5: Playwright E2E

**Files:**
- Create: `tests/e2e/package.json`, `tests/e2e/playwright.config.ts`, `tests/e2e/e2e.spec.ts`

- [ ] Install Playwright; spec visits base URL and asserts title or root visible.

## Task 6: Infra + README + gitignore

**Files:**
- Create: `infra/docker-compose.yml`
- Create/update: `README.md`, `.gitignore`

- [ ] Compose: postgres, qdrant, redis, backend, ai-service (build contexts); document profiles if needed.
- [ ] README: `docker compose -f infra/docker-compose.yml up`, local dev commands, Beads workflow.

## Task 7: Beads + AGENTS.md

- [ ] Epic “MVP Launch” and phase placeholders (done if already present).
- [ ] Ensure `AGENTS.md` references `bd` workflow (existing file extended if needed).
