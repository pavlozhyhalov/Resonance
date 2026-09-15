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
- **Habits** — two kinds via `habits.kind`:
  - **bad** (default): breaking a habit; the user marks *relapse* ("зрив") / *slip*
    ("оступ") days, clean days accrue a streak (`__hbStats`).
  - **good**: building a habit; the user marks a day *done* and the streak counts
    consecutive done days (`__hbGoodStats`, inverse counting via the same
    `habit_days.used=true`).
  Good and bad are kept **apart everywhere**: the Habits-page tabs, the home hero
  widget («Утримання від шкідливих звичок» vs «Набуття корисних звичок» — each with
  its own stat), the «Звички сьогодні» daily widget (bad → Оступ/Зрив, good → a
  «Позначити/Виконано» toggle), and in the AI context/event pickers (a broken good
  streak is never reported as a "зрив"). Calendar, milestones, clean-day goals and
  the report table are bad-habit only. (Green = clean/done, dark-neutral = relapse;
  never red.)
- **Exercises → Yoga**: a standalone `yoga` route (in the Вправи submenu + a tile on
  the Static-exercises page). Picks an instructor by the current UI language
  (uk/ru → Oksana Taran, en → Yoga With Adriene, es → Xuan Lan, fr → YogaCoaching,
  de → Mady Morrison; pl → generic) and shows 3 level tiles
  (Початківець/Середній/Просунутий) that open the class on YouTube. All in the
  `__rsYoga` map (`__rsYogaPage` renderer) — links are trivial to swap. The page
  also has **manual time logging** (＋ Записати час → `exrun?type=yoga` →
  `__rsExManual`); yoga is a `__RS_EXX`/`__rsExGrp` group that records a
  `type:"exercise"` session with `details.group:"yoga"` (counts toward XP/streak).
- **Books**: reading tracker (reading / read / dropped) with per-book chapters —
  reorder (drag), mark done (tap), delete (✕), and **rename** (✎).
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
light + dark themes, rounded cards (`--radius:16px`). Nav/menu icons live in the
`M` glyph map — **Phosphor (regular)** paths inlined via `nf()` (256 viewBox, filled
`currentColor`; the older stroke builder `ne()` stays for non-icon SVG). Each menu
entry has a **unique, on-meaning** icon (no repeats).

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

### Live edge functions (deployed via Supabase MCP; **source snapshot in `supabase/functions/`** — versioned for review/rollback, NOT auto-deployed)
- `assistant` **v13** — Gemini chat + daily tip + greeting. Per-user rate limit
  (15/h, 40/day via `bump_assistant_usage` RPC + `assistant_usage` table,
  configurable in `app_config`), a DB-independent per-isolate global backstop,
  and durable `assistant_events` logging of fail-open/backstop events. **v13 adds
  a server-side entitlement gate** (`isEntitled`) on `kind:"chat"` — returns
  `{paywall:true}` when access has lapsed, so the paywall can't be bypassed from
  the console.
- `delete-account` **v3** — GDPR account deletion (all FKs to `auth.users` are
  ON DELETE CASCADE — verified: covers every user table incl. `learn_items`,
  `water_intake`) + PII-free `account_deletions` audit row.
- `send-reminders` **v7**, `send-winback` v2 — cron push + email nudges (web-push
  today). **v7:** email fallback fires whenever push did **not** deliver (a
  dead-but-present subscription no longer swallows the reminder); `sendPush()`
  provider-independent helper; `last_ok_at`/`fail_count` on `push_subscriptions`
  (+ `bump_push_fail` RPC). Client self-heals the subscription on boot
  (`__rsPushReconcile`, only when permission already granted) + `sw.js`
  `pushsubscriptionchange`. TZ lives in `reminders` (tz/hour/minute), cron every 15 min.

### Key DB tables
`profiles, settings, sessions, habits, habit_days, tasks, task_completions,
rewards, goals, books, day_ratings, water_intake, reminders, notifications,
push_subscriptions, assistant_threads, communities, community_members,
community_invites, community_challenges, challenge_participants,
assistant_usage, assistant_events, account_deletions, app_config, learn_items, streak_freezes, assistant_tips`.
(+ `profiles.ingest_token` and `sessions.external_id` — Apple Health workout bridge.)

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
   After **every** edit run `node --check app.bundle.js`; before shipping run
   **`bash scripts/smoke.sh`** (behavioural invariants beyond syntax).
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

Current build version: **20260915000001** (Apple Health workout bridge; LEVEL = cumulative practice days; SW black-screen fix; local-time days; edge v7 + test-push v4 + ingest-workout v1 live).

### Apple Health → Resonance workout bridge — since 20260915000001
Owner runs with Nike Run Club, which writes workouts to Apple Health. Since a
PWA can't read HealthKit, the bridge is **Apple Shortcuts → HTTP POST → edge
`ingest-workout` → `sessions`**. A workout becomes a `type:"exercise"` session
(`details.group:"cardio"`, `source:"health"`, optional `distance_km`/`kcal`), so
it counts toward the cumulative-days level.
- **Auth:** per-user secret `profiles.ingest_token` (a Shortcut can't hold a JWT).
  RPCs `get_or_create_ingest_token()` / `rotate_ingest_token()` (SECURITY DEFINER,
  authenticated). Settings → «Тренування з Apple Health» card (`__rsHealthSyncCard`,
  after the reminders card) shows the URL + token (masked/copy/rotate) + 7-lang
  setup steps.
- **Dedup:** `sessions.external_id` (nullable) + partial unique index
  `(user_id, external_id)`; the Shortcut passes the workout Start Date as
  `external_id`, so re-runs don't double-insert.
- **DB:** `ingest_workout(p_token,p_external_id,p_type,p_duration,p_started_at,p_details)`
  SECURITY DEFINER (service_role only) — resolves token→uid, checks `is_entitled`,
  inserts on-conflict-do-nothing. Edge fn is a thin wrapper, **verify_jwt=false**
  (token auth), snapshot in `supabase/functions/ingest-workout/`.
- **Not device-testable here** (prod outbound blocked); RPC path verified via SQL.
  Long-term this is replaced by native HealthKit in the Capacitor wrapper.

### Level model changed: cumulative practice days (not longest streak) — since 20260913000006
**Owner decision (motivation fix):** the old model tied LEVEL to the *longest
consecutive streak* — so a single miss meant the next level required beating your
all-time record (≈half a year), which is demotivating. Now **level = total number
of distinct practice days ever** (`activeDays`), which only ever goes up: a miss
costs exactly one day, nothing retroactive. Code: the level object is built from
`Sl(a.activeDays)` instead of `Sl(a.longest)` (single change in `Tl`'s consumer);
thresholds `gi=[0,7,21,50,100,175,275,400,560,770,1040,1370,1780,2280,2920]`
**kept** — for cumulative days they're well-paced (L10≈2y, L15≈8y of near-daily
practice; max 1 day/day so no grinding). **Streak is decoupled**: `current`
(momentum "flame", shown on home hero, resets on a miss) and `longest` (record)
are separate stats that DO NOT affect level. Owner now: activeDays 163 → **level
5**, days-to-next = 175 − 163 = **12 practice days**. The «Як рахується рівень»
explainer + profile/greeting/AI copy were rewritten (7 langs) so nothing calls
the level a "streak" anymore. **Open (not built):** owner mused thresholds could
be steepened later so higher levels aren't too easy — current `gi` kept pending a
decision.

### Service-worker black-screen fix — since 20260913000004
Installed iOS PWAs could go black after a deploy and only a **reinstall** fixed
it. Root cause: on a new deploy the SW `activate` purges old caches, then the
boot's `controllerchange`→`location.reload()` fires; if that reload's network
fetch of `index.html` raced/failed, the navigation handler's fallback found
nothing cached (caches were just purged) and returned `undefined` → blank page.
Fix (`sw.js`): **pre-cache the app shell on `install`** (`index.html` + `./`
into the versioned cache, before `skipWaiting`/`claim`), and the navigation
`.catch` now falls back `req → index.html → ./` and never returns `undefined`.
Because the NEW SW's `install` runs before it claims, the fix protects its own
transition and every future deploy. If the owner reports being **logged out**
in the PWA, that was tied to the poisoned state (SW cache deletion never touches
the localStorage auth token, key `supabase.auth.token`); watch for recurrence
after this fix before touching auth (client is `flowType:"implicit"`,
`persistSession`+`autoRefreshToken` on, default localStorage storage).

### Streak & level use local days (not UTC) — since 20260913000003
The RPG streak, level (`Tl`/`El`), "days to next level", calendar month grouping
and per-practice active-day counts all bucket a session's `started_at` by the
**device's local day** (`X(new Date(started_at))`), not the UTC date
(`started_at.slice(0,10)`). This removed a latent bug where the streak set was
built on UTC dates but compared against the local "today" (`X(n)`), and aligns
the visible streak with the reminder system (`reminders.tz`, local).
**Owner's real numbers (verified against `sessions`):** device-local for the
owner is **Warsaw/Krakow (UTC+2)**, where the longest gap-free run is **142 days
(2026-04-02 → 2026-08-21)** — the SAME as UTC for this data. An earlier note here
claimed "142 → 126 (local)"; that **126 was a Kyiv-tz miscalculation**, not the
owner's local time. The 16-day gap between Kyiv (126) and Warsaw/UTC (142) hinges
on ONE late-night session (2026-08-06 21:39 UTC = 23:39 Warsaw, still Aug 6 →
no gap; but 00:39 Kyiv Aug 7 → Aug 6 empty → run splits at 126). Owner is
**level 5**, days-to-next = 175 − 142 = **33**. The 6 missed days ever
(Warsaw tz): 04-01, 08-22, 08-23, 09-03, 09-05, 09-08 — all AFTER the 142-run,
so the record is intact. The «Як рахується рівень» explainer gained a localized
line (7 langs) stating a day is counted in local time, plus the days-to-next
arithmetic. **Open choice:** device-local is the standard, but since most
sessions predate the Poland move (Ukraine era), the owner may later prefer a
fixed Kyiv tz — not changed without a decision.
