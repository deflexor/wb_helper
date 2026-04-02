# Deployment

## Security Boundaries

- API authentication is bearer-token based (`Authorization: Bearer <jwt>`).
- The backend does not rely on browser cookies for auth state, so no cookie write/read assumptions are required for API authorization.
- CSRF protection is based on this boundary: requests without a valid bearer token are rejected, and cross-site browser requests cannot auto-attach the token the way cookies can.
- If a future deployment introduces cookie-based auth, explicit CSRF mitigations (same-site policy, anti-CSRF token, origin checks) must be added before rollout.
- Frontend bundles must not include backend secret identifiers or values (`JWT_SECRET`, `AI_SERVICE_INTERNAL_KEY`, `OPENROUTER_API_KEY`).
- Reproducible dist secret check:
  - `cd frontend && npm run build && npm run scan:build-secrets`
