# WBHelper - Marketplace Seller Optimizer

**Wildberries & Ozon seller optimization platform with AI-powered analytics**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Haskell](https://img.shields.io/badge/Haskell-9.x-purple.svg)](https://www.haskell.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)

## Features

- **Competitor Price Tracking** - Monitor real-time pricing from Wildberries and Ozon competitors
- **Niche Analysis** - Identify profitable product categories and market gaps
- **Returns Forecast** - Predict return rates using AI-powered analytics
- **Pricing Optimization** - AI-driven pricing recommendations for maximum profit
- **SEO Content Generation** - Auto-generate optimized product descriptions

## Architecture

```
┌─────────┐     ┌─────────┐     ┌─────────────────┐     ┌─────────┐
│ Browser │────▶│  Nginx  │────▶│ Haskell Backend │────▶│ SQLite  │
└─────────┘     └─────────┘     └────────┬────────┘     └─────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │   OpenRouter API    │
                              │  (AI Model Router)  │
                              └──────────┬──────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │   Wildberries / Ozon APIs    │
                         └───────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Nginx** | Reverse proxy, TLS termination, static file serving |
| **Haskell Backend** | REST API, business logic, AI orchestration, rate limiting |
| **SQLite** | Persistent storage with WAL mode for concurrent reads |
| **OpenRouter API** | Unified AI model interface (GPT-4, Claude, Gemini) |
| **Wildberries/Ozon APIs** | Marketplace data integration |

## Tech Stack

### Backend
- **Language**: Haskell (GHC 9.x+)
- **Effect System**: `effectful` for clean effect handling
- **JSON**: `aeson` with generic deriving
- **HTTP**: `http-client` + `req` for API calls
- **Database**: `persistent` + `sqlite-simple` with WAL mode
- **Authentication**: JWT with HMAC-SHA256 signatures
- **Rate Limiting**: Token bucket algorithm with usage tracking

### Frontend
- **Framework**: React 18 + TypeScript 5.6
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3.4 + ShadCN UI
- **State Management**: Zustand + TanStack Query
- **Charts**: Recharts
- **i18n**: react-i18next (EN/RU)
- **Routing**: react-router-dom v6

### Infrastructure
- **Containerization**: Docker Compose
- **Web Server**: Nginx (Alpine)
- **Database**: SQLite with WAL mode
- **TLS**: Let's Encrypt (production)

## Development Setup

### Prerequisites

- **Backend**: GHC 9.x, Cabal 3.x
- **Frontend**: Node.js 20+, npm 10+
- **Runtime**: Docker & Docker Compose (for full stack)

### Backend Setup

```bash
cd backend

# Build the project
cabal build

# Run all tests
cabal test

# Run tests with verbose output
cabal test --test-show-details=direct

# Run REPL for interactive development
cabal repl
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Type check
npm run typecheck

# Lint
npm run lint
```

### End-to-End Testing

```bash
cd frontend

# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup instructions.

### Quick Start with Docker Compose

```bash
# Clone and start
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Security

### Authentication

- JWT tokens with HMAC-SHA256 signatures
- Bearer token via Authorization header (no cookies)
- 64-character hex API key format validation

### Rate Limiting

- Token bucket algorithm implementation
- Per-user usage tracking in SQLite
- Configurable limits per subscription tier

### Security Audit

See [docs/security-audit.md](./docs/security-audit.md) for detailed security analysis.

## Subscription Tiers

| Feature | Free | Pro | Enterprise |
|---------|:----:|:---:|:----------:|
| Daily Requests | 1,000 | Unlimited | Unlimited |
| Competitor Tracking | ✅ | ✅ | ✅ |
| Niche Analysis | ❌ | ✅ | ✅ |
| Returns Forecast | ❌ | ✅ | ✅ |
| Pricing Optimization | ❌ | ❌ | ✅ |
| SEO Content Gen | Basic | Advanced | Advanced |
| API Access | ❌ | ❌ | ✅ |

### Upgrade Mechanism

Users can upgrade their subscription tier through the web interface. API requests are gated by tier based on the JWT claims.

## Project Structure

```
wbhelper/
├── backend/
│   └── src/
│       ├── Api/           # REST endpoints and routing
│       ├── Auth/          # JWT, session, middleware
│       ├── AI/            # OpenRouter, model routing, prompts
│       ├── Database/      # Schema, migrations
│       ├── Domain/        # Business logic (margin, price analysis)
│       ├── Effect/        # Effect system abstractions
│       ├── Infra/         # HTTP client, cache, rate limiting
│       ├── Integration/   # Marketplace API clients
│       ├── App.hs         # Application entry
│       └── Main.hs        # Executable entry
├── frontend/
│   └── src/
│       ├── components/    # React components (ShadCN)
│       ├── features/      # Feature modules
│       ├── hooks/         # Custom React hooks
│       ├── pages/         # Route pages
│       ├── stores/        # Zustand stores
│       └── i18n/          # Internationalization
├── docs/                  # Security audit, architecture docs
├── docker-compose.yml     # Container orchestration
└── nginx.conf             # Nginx configuration
```

## License

MIT License - see LICENSE file for details
