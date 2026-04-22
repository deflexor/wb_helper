.PHONY: run-backend run-frontend run-all test test-backend test-frontend test-e2e

# Backend targets
run-backend:
	cd backend && cabal run

run-frontend:
	cd frontend && npm run dev

run-all:
	cd backend && cabal run & \
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
