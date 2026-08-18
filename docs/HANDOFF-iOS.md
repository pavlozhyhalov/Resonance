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
  once a Capacitor project exists).
- **App Privacy data map** — documented below.

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

### Step 1 — Web prep + bundle-sync process  **[CLAUDE, mostly done]**
- Safe-area, webview touch polish, custom pull-to-refresh — **done**.
- Remaining: confirm manifest/icons are complete for iOS; decide content model
  (recommended: bundle the shell locally, API to Supabase).
- **Bundle sync**: `scripts/release-check.sh` already verifies version parity and
  will `npx cap copy ios` once the Capacitor project exists, so the App Store
  build never drifts from Cloudflare.
**Done when:** one command guarantees the web code in the iOS bundle matches prod.

### Step 2 — Create the Capacitor iOS project  **[OWNER]** (needs Xcode)
```
npm i @capacitor/core @capacitor/cli
npx cap init Resonance app.resonance.mobile --web-dir=.
npm i @capacitor/ios && npx cap add ios
npx cap copy ios && npx cap open ios     # opens Xcode
```
**Done when:** the project runs on a simulator/device showing the app.

### Step 3 — Native APNs + push-denial fallback  **[BOTH]**
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
around it. Watch APNs key expiry, the 99 USD/yr renewal, certificates. Adding
crash reporting/analytics later flips the **Diagnostics** privacy category to
"collected" — update the label then.

## App Privacy data map (all 6 Apple categories) — verified vs Supabase schema

| Apple category | Data | Status |
|---|---|---|
| Contact Info | email | Collected · Linked · App Functionality |
| Health & Fitness | practices, day ratings, habits, water | Collected · Linked · App Functionality (sensitive — must declare) |
| User Content | day notes, assistant chat, books | Collected · Linked · App Functionality (chat text → Gemini) |
| Identifiers | user ID | Collected · Linked · App Functionality |
| Usage Data | activity / sessions | Collected · Linked · App Functionality |
| Diagnostics | — | Not Collected (no crash/analytics yet) |

**Tracking (across apps/sites): none.**

## Common rejection reasons → how they're covered

| Reason | Coverage |
|---|---|
| 4.2 "just a website" | Native APNs push, offline, native behavior (Step 3) |
| 5.1.1 account deletion | Already in-app — confirm it's reachable in the build |
| Privacy label mismatch | Map above must match reality, incl. Gemini |
| No reviewer access | Reader mode (no Gemini) or a test account |
| 4.8 Sign in with Apple | Only if you add Google/social login; email-only today → N/A |
| IAP / payments (Step 3 monetization) | Digital subscriptions must use Apple IAP (30% cut) — an Etap-3 owner decision |

## The concrete tasks I (Claude) will pick up in a new dialog

Once you've done Step 0 and decided Step 0.5, ask me to do the parts I can:
1. `apns_tokens` table + migration (schema from the push-eligibility decision).
2. APNs sending in `send-reminders` / `send-winback` (needs the .p8 in `app_config`).
3. Client: APNs token registration bridge + send to Supabase.
4. Client: in-app reminder fallback banner (push-denied case).
5. Deep-link handling for email confirm / password reset.

Everything with Xcode, signing, App Store Connect, device testing, and the Apple
portal is yours; I'll prep everything that lands in code or Supabase.
