# Load simulation — AI proxy

Small Node script to hammer `/api/ai/chat` concurrently for local smoke testing of the Rust backend.

## Prerequisites

- Backend running with reachable `BASE_URL` (e.g. `http://127.0.0.1:8080`).
- Valid JWT for a test user (`TOKEN`). Obtain via register/login against your dev API or fixture.

## Usage

```bash
node tests/load/ai_proxy_load.mjs --help
```

Example:

```bash
export TOKEN="your-jwt-here"
node tests/load/ai_proxy_load.mjs \
  --base http://127.0.0.1:8080 \
  --token "$TOKEN" \
  --concurrency 20 \
  --total 200
```

The script prints per-status counts and rough latency stats. It does not substitute for production load testing; use it to sanity-check concurrency before a release.
