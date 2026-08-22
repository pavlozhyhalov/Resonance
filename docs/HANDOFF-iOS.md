# Resonance → iPhone App Store — handoff & plan

Read `../CLAUDE.md` first (what the app is, how it's built, conventions,
environment limits). This file is the **execution plan** for shipping Resonance
to the App Store.

## Goal & approach

Ship Resonance on the App Store by **wrapping the existing web app in Capacitor**
(a thin native iOS shell that renders the current web code and adds native
capabilities) **+ adding APNs push**. **No rewrite.** PWABuilder is the fallback;
full-native Swift is not needed.

**Apple Guideline 4.2**: an app that is "just a website" gets rejected. The shell
must add real native value — primarily **real push (APNs)**, offline, native
behavior. That's built into the steps below.

## Legend for who does each task

- **[CLAUDE]** — I can do it from this environment (edit `app.bundle.js`/CSS,
  Supabase MCP: migrations + edge functions, docs, renders).
- **[OWNER]** — needs a Mac/Xcode, an Apple account, App Store Connect, a real
  device, or the Apple Developer portal. Only you can do it.
- **[BOTH]** — you set something up (e.g. an APNs key), I wire it in.

I **cannot** device-test here (outbound web blocked) — you verify on device.

## Quick-start phrase for a new dialog

Tell a fresh session: *"Read CLAUDE.md and docs/HANDOFF-iOS.md, then do `<the next
unblocked step>`."* Name the step that is **actually unblocked**.

> ⚠️ **Step 3 (APNs) requires Step 0.5 answered first.** The push-eligibility
> decision (who gets which pushes, free vs paid) defines the `apns_tokens`
> schema — starting Step 3 without it risks designing the token table against
> undefined business logic and reworking it after the monetization call. So do
> **not** open a new dialog with *"do Step 3"* until you have a one-sentence
> answer to Step 0.5. If 0.5 isn't decided yet, the correct opener is
> *"…let's settle Step 0.5"* (that's a decision, not code).

## Already done toward the App Store (do NOT redo)

- **GDPR**: in-app account deletion (`delete-account` v2 + audit), data export,
  privacy policy page (`/privacy`, 4 langs, incl. a Gemini disclosure), sign-up
  consent checkbox. *(Apple requires in-app account deletion — we have it.)*
- **AI cost control**: per-user rate limit + DB-independent backstop + durable
  event logging (`assistant` v10). Demo mode is **verified** to not call Gemini,
  so an App Reviewer using reader mode can't burn budget.
- **Safety**: disclaimers on breathing/cold/exercise practices (4 langs).
- **UX/design**: neutral (non-red) relapse colors with low-brightness-legible
  contrast; interim home declutter; refined analytics trend line.
- **iOS-readiness (web side)**: top **safe-area** for the notch on the sticky
  top bar; webview touch polish (no long-press callout / double-tap-zoom on
  controls); **custom pull-to-refresh** (native PTR doesn't exist in installed
  PWAs / iOS webviews — this works everywhere).
- **Ops**: external uptime monitor (`.github/workflows/uptime.yml`), release
  version-parity check (`scripts/release-check.sh`, also syncs the iOS bundle
  once a Capacitor project exists); **daily DB backup to Cloudflare R2 with a
  passing restore test** (`docs/BACKUP.md`); **Umami analytics** live (cookieless,
  demo excluded).
- **App Privacy data map** — documented below (reconciled with Umami).

## Open items (status) — not done yet

These were agreed earlier but are **not** complete; they're listed here so they
don't get lost. Both need the owner (I can't reach prod or the Supabase dashboard
from here).

- **Live-prod smoke-test, all 4 languages — OPEN.** Final "done" on the shipped
  web work is only confirmed by a manual pass on the live URL across uk/ru/en/pl
  (registration, AI chat, disclaimers, GDPR UI, calendar, pull-to-refresh). I
  cannot device-test (outbound web blocked); **owner runs this**. Until then,
  treat client features as "coded & merged", not "verified on prod".
- **Supabase backups — DONE (2026-08-22).** Not via paid PITR — instead a free
  own-backup pipeline: GitHub Actions → daily `pg_dump` → gzip → Cloudflare R2
  (`resonance-db-backups`, 14-day retention, Telegram alerts). The automated
  **restore test** (`db-restore-test.yml`) passed on 2026-08-22 — all 25 tables
  restored and reconciled against prod ("restore works", not just "has a backup").
  Docs: `docs/BACKUP.md`. (PITR remains an optional ~92€/mo add-on, intentionally
  not used.)
- **Live start/finish timer for cardio & strength — DEFERRED TO THE APP.** A web
  page can't run a foreground timer while the phone is in a pocket mid-run (iOS
  suspends the tab's JS), so the "почати / закінчити" flow was unreliable for
  moving activities. **Web behaviour now:** cardio & strength log time manually,
  like books — pick the activity, enter minutes, save (still `type:"exercise"`,
  so it feeds the same time currency and "Вправи" skill). Static holds keep the
  live timer (screen is in hand, so it works). **In the native app:** wire a real
  background-capable timer (or Live Activity / background task) for cardio/strength
  so start/finish works while running, then swap those screens back to the timer
  path — the group wiring in `hi`/`__rsExManual` already branches on
  `r.group==="static"`, so this is a targeted change. Custom user-added exercises
  are stored client-side (`localStorage rs_ex_custom`); consider syncing them via
  Supabase `settings` when the app lands so they follow the user across devices.

## Hard prerequisites (no way around these)

- **[OWNER]** Apple Developer Program — **99 USD/yr**. Choose account type
  deliberately up front (Individual is faster, but payouts tie to banking/tax
  forms and the type/country; switching later is painful if ФОП/company is
  planned).
- **[OWNER]** A **Mac with Xcode**, or a cloud build (Codemagic, Ionic Appflow,
  GitHub Actions macOS, Xcode Cloud). iOS builds/signing require macOS.
- **[BOTH]** **APNs Auth Key (.p8)** — you create it in the Apple Developer
  portal; I place it in `app_config` and use it from the edge functions.

## The steps

### Step 0 — Accounts & account type  **[OWNER]**
Enroll in Apple Developer; get App Store Connect access; decide Individual vs
company; prepare Mac/Xcode or a cloud builder.
**Done when:** account active, build environment ready.

### Step 0.5 — Fix the push-eligibility logic  **[OWNER decision → CLAUDE implements]**
Not full pricing — just answer: **who gets which pushes** (e.g. free users get
habit reminders; AI win-back push is paid-only?). This decides the shape of the
APNs token/eligibility table in Step 3, so decide it **before** that schema.
**Done when:** a written answer on whether free/paid notification logic differs.

> **Access model now decided** (see `../Resonance_povnyy_kontekst.md` §4): 14-day
> full access → hard block of *new* progress (AI off, new practices not recorded),
> history stays visible. That yields three notification states — **trial-active**
> (notify like paid), **trial-ending** (soft T-3/T-1/T-0), **trial-expired**
> (gentle "unlock your progress", not habit-specific). Draft copy for all three,
> 4 langs, is in **`docs/NOTIFICATIONS-COPY.md`** — awaiting owner sign-off, then it
> feeds the Step 3 copy. Still owner-open: the exact **send cadence** for the
> expired state and whether a subscription-status field lands with IAP.

### Step 1 — Web prep + bundle-sync process  **[CLAUDE, mostly done]**
- Safe-area, webview touch polish, custom pull-to-refresh — **done**.
- Remaining: confirm manifest/icons are complete for iOS; decide content model
  (recommended: bundle the shell locally, API to Supabase).
- **Bundle sync**: `scripts/release-check.sh` already verifies version parity and
  will `npx cap copy ios` once the Capacitor project exists, so the App Store
  build never drifts from Cloudflare.
**Done when:** one command guarantees the web code in the iOS bundle matches prod.

### Step 2 — Create the Capacitor iOS project  **[BOTH — CLAUDE preps, OWNER runs]**
```
npm i @capacitor/core @capacitor/cli
npx cap init Resonance app.resonance.mobile --web-dir=.
npm i @capacitor/ios && npx cap add ios
npx cap copy ios && npx cap open ios     # opens Xcode
```
**Split (explicit, so it's not ambiguous next dialog):**
- **[CLAUDE]** prepares the exact config — `appId`, `webDir`, the
  `capacitor.config` contents, plugin list, and any web-side tweaks the wrapper
  needs — and reviews the result.
- **[OWNER]** runs these commands and everything in **Xcode** on the Mac. Xcode
  and the CLI are macOS-dependent and cannot run in my environment, so the
  actual execution is yours; I hand you ready-to-run config/commands.
**Done when:** the project runs on a simulator/device showing the app.

### Step 3 — Native APNs + push-denial fallback  **[BOTH]**
**Prerequisite: Step 0.5 is answered** — its decision defines the `apns_tokens`
schema. Do not start this step without it.
- **[CLAUDE]** Create an `apns_tokens` table (schema per Step 0.5) and teach
  `send-reminders` / `send-winback` to send **APNs** (HTTP/2 + JWT signed with
  the .p8) alongside web-push.
- **[OWNER]** Create the APNs Auth Key (.p8) in Apple Developer; enable Push in
  the app's capabilities; add `@capacitor/push-notifications`.
- **[CLAUDE]** Client: register the device, get the APNs token, send it to
  Supabase; **in-app fallback** (if the user denies push, reminders degrade to an
  in-app banner instead of vanishing; optional gentle re-ask after N days);
  **deep links / Universal Links** so email confirm & password reset return to
  the app, not Safari.
**Done when:** a real iPhone receives a native push from the server; users who
denied push still see an in-app reminder.

### Step 4 — App Store materials + App Privacy  **[OWNER, CLAUDE assists]**
1024² icon, 6.7" screenshots, localized listing (4 langs — base exists),
category **Health & Fitness**, privacy URL (`/privacy`), support URL, age
rating, export-compliance (HTTPS → usually "exempt"), and the **App Privacy**
label filled per the map below.
**Drafted (owner-editable now):** localized name / subtitle / keywords / promo /
description (4 langs) + a 6-screenshot plan are in **`docs/APP-STORE-LISTING.md`**.
The **App Privacy** answers, including the Umami reconciliation, are in the map
below. Remaining is owner-only (entering it in App Store Connect, capturing the
screenshots on a Mac/simulator in demo mode).
**Done when:** the App Store Connect listing is complete and privacy matches reality.

### Step 5 — Build, sign, upload  **[OWNER]**
Register Bundle ID; enable Push; Automatic Signing; Archive → upload (Xcode /
Transporter); test via **TestFlight** (internal then external).
**Done when:** the build installs via TestFlight on a real iPhone.

### Step 6 — Submit for review  **[OWNER]**
Give the reviewer access via **reader mode** (safe — no Gemini) or a test account;
double-check the rejection risks below; submit; respond to reviewers.
**Done when:** status is Approved / Ready for Sale.

### Step 7 — Post-release  **[BOTH]**
Small web fixes can ship fast; **new big features must go through review** — not
around it. Watch APNs key expiry, the 99 USD/yr renewal, certificates, and the
Supabase backup/PITR check (see Open items). Adding crash reporting/analytics
later flips the **Diagnostics** privacy category to "collected" — update the
label then.

## App Privacy data map (all 6 Apple categories) — verified vs Supabase schema

| Apple category | Data | Status |
|---|---|---|
| Contact Info | email | Collected · Linked · App Functionality |
| Health & Fitness | practices, day ratings, habits, water | Collected · Linked · App Functionality (sensitive — must declare) |
| User Content | day notes, assistant chat, books | Collected · Linked · App Functionality (chat text → Gemini) |
| Identifiers | user ID | Collected · Linked · App Functionality |
| Usage Data | activity / sessions (app) **+ page views (Umami)** | Collected · **two purposes: App Functionality (linked, from Supabase) and Analytics (NOT linked, from Umami)** |
| Diagnostics | — | Not Collected (no crash/analytics yet) |

**Tracking (across apps/sites): none.**

### Umami reconciliation (done — settles Open-item #4 / screenshot item 4)

The site embeds **Umami** (cookieless, anonymous, EU) and the Capacitor webview
loads that same site, so Umami runs **inside the app** and must be reflected in the
label. Conclusion after review — **no new category is needed**, only a purpose is
added:

- **What Umami collects:** page views / product interaction, referrer, browser, OS,
  device type, and **country only** (derived from IP for the count; the IP itself is
  **not stored**). No cookies, no stable cross-session device ID, no user identity.
- **How it maps:** it is **Usage Data → Product Interaction**, added with the purpose
  **Analytics**, marked **NOT linked to the user's identity** and **NOT used for
  tracking**. So on the App Privacy form, Usage Data is declared with **both**
  purposes — *App Functionality* (the app's own linked activity from Supabase) and
  *Analytics* (Umami's anonymous stream).
- **What Umami does NOT trigger:**
  - **Identifiers** — cookieless, no persistent device/user ID → not added.
  - **Location** — country-level from IP for a count is not Apple "Coarse Location"
    (city-level); IP is not stored → not added.
  - **Diagnostics** — Umami is not crash/performance telemetry → stays Not Collected.
  - **Tracking** — no cross-app/site linking, no data broker, no ad networks →
    the overall **Tracking = none** answer is unchanged.
- **Net effect on the form vs. the old map:** exactly one change — Usage Data gains the
  **Analytics** purpose and an explicit **not-linked** anonymous sub-stream. Everything
  else stands. Re-confirm on the day of submission that no crash/analytics SDK was
  added in the meantime (that would flip **Diagnostics** to Collected).

## Common rejection reasons → how they're covered

| Reason | Coverage |
|---|---|
| 4.2 "just a website" | Native APNs push, offline, native behavior (Step 3) |
| 5.1.1 account deletion | Already in-app — confirm it's reachable in the build |
| Privacy label mismatch | Map above must match reality, incl. Gemini |
| No reviewer access | Reader mode (no Gemini) or a test account |
| 4.8 Sign in with Apple | Only if you add Google/social login; email-only today → N/A |
| IAP / payments | Digital subscriptions must use Apple IAP (30% cut) — an owner decision (Step 0.5 push-eligibility / Etap-3 monetization) |

## The concrete tasks I (Claude) will pick up in a new dialog

Once you've done Step 0 and decided Step 0.5, ask me to do the parts I can:
1. `apns_tokens` table + migration (schema from the push-eligibility decision).
2. APNs sending in `send-reminders` / `send-winback` (needs the .p8 in `app_config`).
3. Client: APNs token registration bridge + send to Supabase.
4. Client: in-app reminder fallback banner (push-denied case).
5. Deep-link handling for email confirm / password reset.

Everything with Xcode, signing, App Store Connect, device testing, and the Apple
portal is yours; I'll prep everything that lands in code or Supabase.
