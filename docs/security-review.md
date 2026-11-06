# Security review summary

The requirements below were written before the build and used as the checklist for both review passes.

## Requirements

1. Every authenticated route resolves the session user and scopes every query by owner. Cross-tenant access returns 404, never 403.
2. Public token routes accept only HS256 tokens with a matching `purpose` claim and expiry. Tokens are never logged.
3. OAuth `state` is signed, short-lived and bound to the organization and provider. Redirect URIs are fixed server-side. Refresh tokens and tenant credentials are encrypted before storage and never returned to the client.
4. CSV uploads are limited to 2 MB and 20,000 rows, parsed server-side, and the raw content is never persisted or logged. Only aggregated vendor matches are stored.
5. Survey answers are encrypted at rest and answer values are never logged.
6. Registration is closed once an account exists unless an invite code matches.
7. Cron and webhook routes are authenticated.
8. All rendered documents escape user-entered text.
9. Rate limits on auth, public token routes, uploads and the contact form.
10. Security headers and CSP in `next.config.ts`, no external scripts.
11. No secrets in the repo; `.env.example` lists every variable.

## Pass 1 (backend)

Found 2 high, 6 medium, 10 low.

- High: magic links were logged to the console and never emailed. Fixed: emailed through Resend, single-use, never logged.
- High: no login rate limit. Fixed: per IP and per account, plus a dummy bcrypt compare for unknown emails.
- Medium: a shared survey link collapsed all respondents into one id; sign-off links could be used to sign as someone else; survey flooding; Stripe webhook did not check `payment_status`; OAuth state was not bound to the browser; uploads were buffered without a size check. All fixed.
- Low: 8 of 10 fixed.

## Pass 2 (full app and landing site)

Confirmed the pass 1 fixes. Found 0 critical or high, 3 medium, 5 low.

- Medium: magic links redirected to a removed route; the end-to-end script could be pointed at a non-local server; the Google connector lacked a domain cross-check and the Microsoft one failed open. All fixed (the e2e script now refuses non-local hosts unless explicitly allowed).
- Low: landing contact form honeypot, subject handling and logging; landing `.gitignore` and `.env.example`; the general sign-off link could pad the roster; pages relying only on layout-level auth. All fixed except one kept on purpose: the cardholder name from an expense export is stored with the aggregate, because the business owner needs to know whose personal subscription to migrate.

## Still open

- In-memory rate limiter (per instance on serverless).
- `'unsafe-inline'` in the CSP.
