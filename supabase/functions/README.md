# Supabase Edge Functions

> **These are deployed via the Supabase MCP / dashboard, NOT auto-deployed from
> the repo.** Cloudflare Pages serves the static web app from `main`; edge
> functions live in Supabase and must be deployed explicitly
> (`deploy_edge_function`). This directory exists so the function source is
> **version-controlled and has a rollback point** (Risk plan §5.1) — it mirrors
> what is live, it does not drive deployment.

Snapshot taken 2026-09-06. Live versions at snapshot time:

| Function | Version | verify_jwt | Purpose |
|---|---|---|---|
| `assistant` | v13 | true | Gemini chat + daily tip + greeting. Per-user rate limit (15/h, 40/day via `bump_assistant_usage`), per-isolate global backstop (90/min), durable `assistant_events` logging, **server-side entitlement gate** (`isEntitled`) on `kind:"chat"`. |
| `delete-account` | v3 | true | GDPR deletion — deletes the auth user; every user table cascades (`ON DELETE CASCADE`). Writes a PII-free `account_deletions` audit row. |
| `send-reminders` | v6 | false | Cron: daily practice reminder — web-push, email (Resend) fallback. Gated by `x-cron-secret`. |
| `send-winback` | v2 | false | Cron: win-back nudge for lapsed users. Gated by `x-cron-secret`. |
| `test-push` | v3 | true | Retired smoke-test — inert (returns 410). Safe to delete in the dashboard. |

## Redeploy

Via the Supabase MCP `deploy_edge_function` (or `supabase functions deploy <slug>`).
Secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, VAPID, Resend, cron secret)
live in function env / `app_config` — **never commit them here**.

## Keeping this in sync

After changing a deployed function, re-pull its source and update the file here so
the repo stays the source of truth for review and rollback.
