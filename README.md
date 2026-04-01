# WB Helper

Monorepo for a SaaS platform helping **Wildberries** and **Ozon** sellers optimize costs and sales.

## Layout

| Path | Stack | Role |
|------|--------|------|
| `backend/` | Rust (Axum, sqlx) | HTTP API and persistence |
| `frontend/` | React, Vite, Tailwind, shadcn/ui, Zustand, TanStack Query | Dashboard UI |
| `ai-service/` | FastAPI | LLM calls (OpenRouter) and vector workflows (Qdrant) |
| `tests/e2e/` | Playwright | Cross-browser smoke tests |
| `infra/` | Docker Compose | Postgres, Redis, Qdrant, services |

## Prerequisites

- **Rust** (stable), **Node.js** 20+, **Python** 3.11+, **Docker** with Compose v2

## Local development

### Infrastructure and services

From the repository root:

```bash
docker compose -f infra/docker-compose.yml up --build
```

This starts Postgres (5432), Redis (6379), Qdrant (6333/6334), the Rust API (8080), and the AI service (8000). Set `OPENROUTER_API_KEY` in your environment when you wire LLM calls.

For a lighter machine, run only databases:

```bash
docker compose -f infra/docker-compose.yml up postgres redis qdrant
```

### Backend (host)

```bash
cd backend
cargo test
cargo run
# API: http://127.0.0.1:8080/api/hello
```

### Frontend (host)

```bash
cd frontend
npm install
npm run dev
# App: http://127.0.0.1:5173
```

### AI service (host)

On Debian/Ubuntu you may need `python3-venv` and `python3-pip` (`sudo apt install python3-venv python3-pip`) before creating a virtualenv.

```bash
cd ai-service
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Alternatively, run tests inside the `ai-service` image built by Compose.

### End-to-end tests

With dependencies installed:

```bash
cd tests/e2e
npm install
npx playwright install chromium
npm run test:e2e
```

Playwright starts the Vite dev server automatically unless one is already running. Override the URL with `PLAYWRIGHT_BASE_URL` if needed.

## Beads (issue tracking)

This project uses **[beads](https://github.com/gastownhall/beads)** (`bd`) for all task tracking.

```bash
bd ready              # Work ready to pick up
bd show <id>          # Issue details
bd update <id> --claim
bd close <id>         # Done
```

Agents should follow **`AGENTS.md`**: use `bd` for tasks (not ad-hoc markdown TODOs). The root epic **MVP Launch** groups phased work; add child issues as you define each phase.

## Documentation

- Design: `docs/superpowers/specs/2026-04-01-monorepo-init-design.md`
- Plan: `docs/superpowers/plans/2026-04-01-monorepo-init.md`

## Internationalization

The frontend keeps strings in `frontend/src/locales/{en,ru}/translation.json`. Theme and design tokens are customizable in `frontend/src/globals.css`.

The `shadcn` package stays in **devDependencies** so Tailwind can resolve the `@import "shadcn/tailwind.css"` entry in `globals.css` (see [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite)).
