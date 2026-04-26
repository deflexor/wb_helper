.PHONY: help run-backend run-frontend run-all test test-backend test-frontend test-e2e

# Default target - show help
help:
	@echo "WBHelper - Marketplace Seller Optimizer"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Development targets:"
	@echo "  run-backend        Start backend server (requires JWT_SECRET env var)"
	@echo "  run-frontend      Start frontend dev server"
	@echo "  run-all           Start both backend and frontend"
	@echo ""
	@echo "Test targets:"
	@echo "  test              Run all tests (backend + frontend)"
	@echo "  test-backend      Run backend Hspec tests"
	@echo "  test-frontend     Run frontend unit tests"
	@echo "  test-e2e          Run Playwright E2E tests"
	@echo ""
	@echo "Environment variables:"
	@echo "  JWT_SECRET        Required for backend (min 32 chars)"
	@echo "  DATABASE_PATH     Optional, defaults to ./data/wbhelper.db"
	@echo "  PORT              Optional, defaults to 8080"
	@echo ""
	@echo "Examples:"
	@echo "  # Set JWT_SECRET for development"
	@echo "  export JWT_SECRET=$$(openssl rand -base64 32)"
	@echo "  make run-backend"
	@echo ""
	@echo "  # Run with custom JWT_SECRET"
	@echo "  JWT_SECRET=my-dev-secret-at-least-32-chars make run-all"
	@echo ""
	@echo "  # Run backend on custom port"
	@echo "  PORT=9000 JWT_SECRET=$$(openssl rand -base64 32) make run-backend"

# Backend targets
run-backend:
	@if [ -z "$$JWT_SECRET" ]; then \
		echo "Error: JWT_SECRET environment variable is not set"; \
		echo "Set it with: export JWT_SECRET=$$(openssl rand -base64 32)"; \
		exit 1; \
	fi
	cd backend && cabal run

run-frontend:
	cd frontend && npm run dev

run-all:
	@if [ -z "$$JWT_SECRET" ]; then \
		echo "Error: JWT_SECRET environment variable is not set"; \
		echo "Set it with: export JWT_SECRET=$$(openssl rand -base64 32)"; \
		echo ""; \
		echo "Then run: make run-all"; \
		exit 1; \
	fi
	cd backend && JWT_SECRET="$$JWT_SECRET" cabal run & \
	cd frontend && npm run dev & \
	wait

# Test targets
test: test-backend test-frontend

test-backend:
	cd backend && cabal test

test-frontend:
	cd frontend && npm test

test-e2e:
	cd frontend && npm run test:e2e
