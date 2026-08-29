# Resonance — project memory

> This file is auto-loaded into every Claude Code session. It exists so a **fresh
> conversation is immediately in context**: what Resonance is, how it's built, the
> conventions, and where we're headed (an iPhone App Store app).
> **For the full picture — every feature, decision already made, and how to take a
> ТЗ without breaking anything — read `Resonance_povnyy_kontekst.md` (the master
> onboarding doc).** For the App Store work specifically, read
> **`docs/HANDOFF-iOS.md`**.

## What Resonance is (idea & focus)

A gamified **wellness / self-development PWA** (Ukrainian-first). Tagline:
"Прокачуй себе, як персонажа" — level yourself up like an RPG character.

The user tracks and builds real-life practices; the app turns that into an RPG
progression. Main pillars:

- **Practices** (the core): breathing (Wim Hof; box 4-4-4-4, 4-7-8, coherent 5.5),
  cold (shower / ice bath), static holds (plank, arch, hang), antistress
  (grounding, PMR, autogenic, body-scan), frequency music (binaural, Solfeggio),
  reading.
- **Habits**: breaking bad habits — the user marks *relapse* days ("зрив"); clean
  days accrue streaks. (Green = clean, dark-neutral = relapse; never red.)
- **Goals** with auto-progress, tied to trackable conditions.
- **Development system** (RPG): levels, skill branches (Дихальна сила,
  Загартування, Вправи, Спокій, Знання), "Воля" multiplier for consistency,
  titles every 3 levels, a class from Body/Mind balance.
- **Day ratings**: morning / noon / evening scores + notes → analytics chart.
- **AI assistant**: a customizable persona (name + tone) mentor, profile-aware.
- **Community**: communities, challenges, feed (secondary).
- **Reader/demo mode**: unregistered visitors explore with mocked data, fully
  isolated from the backend (security-critical — see below).

**Languages**: uk (default) + ru / en / pl / es / fr / de — everything is localized.
**Design**: warm, **flat** (no glows/shadows-as-decoration), oklch palette,
light + dark themes, rounded cards (`--radius:16px`).

## Tech & architecture

- **Static PWA**, no build step. Key files at repo root:
  - `app.bundle.js` — the whole app, **minified onto a few very long lines**.
  - `index.html`, `sw.js` (service worker; network-first for navigations so new
    deploys propagate), `css/styles.css`, `manifest.webmanifest`.
  - `i18n/{en,ru,pl,es,fr,de}.json` + `patterns.json` (uk is the in-code base language).
  - `icons/`, `audio/`, `fonts/`.
- **Hosting**: Cloudflare Pages, **auto-deploys from `main`**.
- **Backend**: Supabase — project id **`xnfkuflpsbroxzpltvqq`**, region
  **eu-west-1** (EU data residency). Postgres 17 + RLS, Deno edge functions,
  `pg_cron`, `app_config` table holds secrets (gemini key, resend, vapid, cron).
- **AI**: Google **Gemini 2.5 Flash** via the `assistant` edge function
  (thinkingBudget 0, maxOutputTokens 512). Free tier → **rate-limited**.
- **Push**: Web Push (VAPID) + **email fallback (Resend)**.
  ⚠️ Web push does **not** work inside an iOS wrapper — the app needs **APNs**
  (this is the main backend task for the App Store; see the handoff doc).

### Live edge functions (deployed via Supabase MCP; not in the repo)
- `assistant` **v13** — Gemini chat + daily tip + greeting. Per-user rate limit
  (15/h, 40/day via `bump_assistant_usage` RPC + `assistant_usage` table,
  configurable in `app_config`), a DB-independent per-isolate global backstop,
  and durable `assistant_events` logging of fail-open/backstop events. **v13 adds
  a server-side entitlement gate** (`isEntitled`) on `kind:"chat"` — returns
  `{paywall:true}` when access has lapsed, so the paywall can't be bypassed from
  the console.
- `delete-account` **v2** — GDPR account deletion (all FKs to `auth.users` are
  ON DELETE CASCADE) + PII-free `account_deletions` audit row.
- `send-reminders`, `send-winback` — cron push + email nudges (web-push today).

### Key DB tables
`profiles, settings, sessions, habits, habit_days, tasks, task_completions,
rewards, goals, books, day_ratings, water_intake, reminders, notifications,
push_subscriptions, assistant_threads, communities, community_members,
community_invites, community_challenges, challenge_participants,
assistant_usage, assistant_events, account_deletions, app_config`.

## How the code is organized (for editing app.bundle.js)

- **Supabase client** = `P`. In reader/demo mode `P` is swapped for
  `__rsDemoClient()` so **every** `P.functions.invoke` / `P.from` is mocked —
  guests never touch the backend or Gemini. Demo flag: `window.__rsDemo`;
  `__rsDemoActive()`; any guest action should call `__rsDemoNudge()`.
- **Router**: `js` route table; `V(route,{theme,navKey,render})` registers;
  `$s()` re-renders the current hash route (used by pull-to-refresh); `C(route)`
  navigates via `location.hash`. Boot calls `Ir()`.
- **Screens**: home `Xn`, settings `ki`, auth `ec`, about `__rsAboutRender`,
  privacy `__rsPrivacyRender`; analytics chart builds bars + `__rsSpline` trend.
- **Helpers**: element `o(tag,attrs,...children)`; SVG `mr('<path .../>')`;
  modal `$e(node)`→`{close}`; confirm `ve(text,{okText,danger})`; toast
  `$(text,type)`; date `X(date)`→`YYYY-MM-DD`; language `__rsGetLang()`.
- **Localization of NEW UI**: use `__rsT({uk,ru,en,pl,es,fr,de})` — it picks the language
  itself, so it's always correct regardless of the i18n dicts. (Runtime
  translation of base-uk strings also exists via `__rsTr`/`__rsObserve`.)
- **Assistant persona**: `window.__rsAsst` = `{name, tone}`.

## Dev conventions (do these every time)

1. Edit the minified bundle **surgically** using long, unique anchor strings.
   After **every** edit run `node --check app.bundle.js`.
2. Any client change → **bump the cache-busting version** in all three files:
   `Ht="…"` in `app.bundle.js`, `VERSION = "…"` in `sw.js`, `?v=…` in
   `index.html`. They must match. Verify with **`bash scripts/release-check.sh`**.
   (Format: `YYYYMMDD` + 6 digits, monotonically increasing.)
3. New user-facing text must be localized (uk/ru/en/pl/es/fr/de) via `__rsT`.
4. Edge-function / DB changes go through the **Supabase MCP** (apply_migration,
   deploy_edge_function). They are **not** in the repo.
5. Deploy flow: Cloudflare serves `main`. Work on the session's assigned branch,
   then fast-forward `main` when the user approves shipping.
6. Keep the design **flat** and theme-aware (light + dark); colors live as oklch
   tokens in `css/styles.css`. For any chart work, load the `dataviz` skill first.

## Environment limitations (important)

- **Outbound web is blocked** in this build environment: you cannot curl prod,
  hit the live site, or device-test. Verify with `node --check`, static
  inspection, and **PIL/oklch renders** (there are examples in the scratchpad
  history: contrast/spline previews). Ask the user to verify on device.
- Edge functions are deployed straight to prod (no staging) — be careful.

## Monetization / access (paywall — built 2026-08-29)

Model: **6.99 €/mo, 44.99 €/yr, 14-day full-access trial**, then a hard paywall.
**Founders:** everyone who signs up **before the App Store release gets lifetime
free** (a deliberate "last carriage" owner decision). Access lives in
`profiles.access_type` (`founder`/`trial`/`subscribed`/`expired`) +
`trial_started_at` + `access_until`; the founder cutoff is `app_config
.founder_cutoff` (changeable without a deploy — only affects future signups, never
demotes existing founders). Server is the source of truth: `is_entitled(uid)` SQL,
a `profiles_guard_access` trigger (users can't self-grant), an RLS gate on
`sessions` INSERT, and the `assistant` edge gate. Client mirror: `__rsEntitled()`
+ `__rsPaywall()`. **Payment is a stub** (`TODO(payment)` in `app.bundle.js`) —
Apple IAP/Stripe plug into that single point later; entitlement logic is decoupled
and must not be rewritten when adding a provider. Locked when not entitled: AI
chat, new practice logging, XP, streaks. Never locked: history, stats, level.

## Where we're headed

Ship Resonance as an **iPhone app on the App Store**, by **wrapping** the existing
web app (Capacitor) + adding **APNs** — not a rewrite. The full ordered plan,
the "who does what" split, the App Privacy data map, and rejection risks are in
**`docs/HANDOFF-iOS.md`**. Read it before starting App Store work.

Current build version: **20260825000011**.
