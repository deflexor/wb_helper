# Deployment

## Small VDS Compose Profile

- Default production compose keeps only Nginx public (`80/443`).
- `backend` and `ai-service` are internal-only (`expose`) and reachable over Docker network via service names.
- For direct local troubleshooting, use an override file (`infra/docker-compose.dev-ports.yml`) to publish `8080`/`8000` temporarily.

## Security Boundaries

- API authentication is bearer-token based (`Authorization: Bearer <jwt>`).
- The backend does not rely on browser cookies for auth state, so no cookie write/read assumptions are required for API authorization.
- CSRF protection is based on this boundary: requests without a valid bearer token are rejected, and cross-site browser requests cannot auto-attach the token the way cookies can.
- If a future deployment introduces cookie-based auth, explicit CSRF mitigations (same-site policy, anti-CSRF token, origin checks) must be added before rollout.
- Frontend bundles must not include backend secret identifiers or values (`JWT_SECRET`, `AI_SERVICE_INTERNAL_KEY`, `OPENROUTER_API_KEY`).
- Reproducible dist secret check:
  - `cd frontend && npm run build && npm run scan:build-secrets`

## TLS Issuance (Certbot + Nginx)

1. Set real DNS `A/AAAA` records to the VPS and replace `server_name` in `infra/nginx/default.conf`.
2. Start stack: `docker compose -f infra/docker-compose.yml up -d nginx`.
3. Issue cert (webroot mode via shared volume):
   - `docker compose -f infra/docker-compose.yml run --rm certbot certonly --webroot -w /var/www/certbot -d <your-domain> -d www.<your-domain> --email <you@example.com> --agree-tos --no-eff-email`
4. Enable TLS server block in `infra/nginx/default.conf` using:
   - `/etc/letsencrypt/live/<your-domain>/fullchain.pem`
   - `/etc/letsencrypt/live/<your-domain>/privkey.pem`
5. Reload Nginx:
   - `docker compose -f infra/docker-compose.yml exec nginx nginx -s reload`
6. Enable HTTP->HTTPS redirect only after TLS confirms healthy.

Required security headers in active Nginx config:

- `Strict-Transport-Security` (HSTS) on HTTPS traffic
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (or stricter)
- `Referrer-Policy` and `Content-Security-Policy` aligned with frontend needs

## Renewal Automation (systemd timer/service)

Create `/etc/systemd/system/wb-helper-certbot-renew.service`:

```ini
[Unit]
Description=Renew Let's Encrypt certificates for wb-helper
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/wb_helper
ExecStart=/usr/bin/docker compose -f infra/docker-compose.yml run --rm certbot renew --webroot -w /var/www/certbot
ExecStartPost=/usr/bin/docker compose -f infra/docker-compose.yml exec -T nginx nginx -s reload
```

Create `/etc/systemd/system/wb-helper-certbot-renew.timer`:

```ini
[Unit]
Description=Twice-daily Let's Encrypt renewal check

[Timer]
OnCalendar=*-*-* 03,15:00:00
RandomizedDelaySec=30m
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and verify:

- `sudo systemctl daemon-reload`
- `sudo systemctl enable --now wb-helper-certbot-renew.timer`
- `systemctl list-timers --all | grep wb-helper-certbot-renew`
