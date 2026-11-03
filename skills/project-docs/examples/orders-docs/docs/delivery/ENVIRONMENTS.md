# Environments

Snapshot: 2026-11-03. Only Local exists for this example; Staging and Production are described as the product
would need them, with no real hosts. Secrets are named by where they live, never by value.

## Local

```md
URL:         http://127.0.0.1:8765
Database:    in-memory store, reset per test run (the reference server's POST /_reset; a product suite resets through its factories)
Secrets:     signing key — environment variable ORDERS_SIGNING_KEY; the reference implementation falls back to a documented example value, a product build must not
Deployment:  python app.py [port]   (reference implementation)
Backup:      none
Monitoring:  server stdout
Access:      developer's machine only; loopback interface
Test data:   specs/seed-data.json — six example users across two tenants; every seeded user shares one example password documented in the reference implementation
```

## Staging (to be defined by the product)

```md
URL:         a host whose name marks it as a test environment, named in the suite's allow-list
Database:    isolated from Production
Secrets:     ORDERS_SIGNING_KEY from the platform's secret store; a different key from Production
Deployment:  the same artefact that goes to Production
Backup:      none required (no persistence)
Monitoring:  request log with the 500 reference; audit log export
Access:      the team; the API suite writes data here and nowhere else
```

## Production (to be defined by the product)

```md
URL:         the product host behind the TLS-terminating proxy
Database:    the product store
Secrets:     ORDERS_SIGNING_KEY from the platform's secret store; rotation per DEPLOYMENT.md
Deployment:  promoted artefact; rollback = previous artefact
Backup:      none until persistence exists; then a restore verification before go-live
Monitoring:  as Staging plus alerting on 5xx rate and on lockouts per minute
Access:      no test suite writes here; the suite's guard refuses any host not in its allow-list
```

## Rule

A test suite that writes data guards its target in code: Local or the allow-listed Staging host; never
Production. Example values in this package (`tenant-a`, `alice`, `https://app.example.test`) are not real hosts
or people.
