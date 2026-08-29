# Apple Review — Repo/Backend readiness audit (Section B)

> Facts gathered by **Claude Code** directly from the repository and the live
> Supabase schema. Read-only investigation — no product decisions made here.
> Pairs with `docs/HANDOFF-iOS.md` (the ordered plan) and the task split in
> `03_Rozpodil_zavdan.md`. Chat-Claude (Section A) reconciles this against the
> checklist; the owner (Section C) acts on what needs money/Mac.

_Last updated: 2026-08-29 · build 20260825000006+_

---

## B4 — Login methods → **Sign in with Apple is NOT required**

The app authenticates with **email + password only**. Calls found in
`app.bundle.js`:

- `P.auth.signUp({email, password})`
- `P.auth.signInWithPassword({email, password})`
- `P.auth.resetPasswordForEmail(...)`
- `P.auth.updateUser({password})`
- `P.auth.signOut()`, `getSession`, `getUser`, `onAuthStateChange`

There is **no `signInWithOAuth`** call — no Google, Facebook, or any social/
third-party login is offered anywhere in the UI. (The `@gmail.com` addresses
in the users table are ordinary email/password signups, not Google login.)

**Apple relevance:** Guideline **4.8 (Sign in with Apple)** applies *only when*
the app offers a third-party or social login. It does not. → **Sign in with
Apple is not required.** Plan items **C1.4 and C2.4 can be closed as
"not applicable"**, unless a social login is added later.

---

## B5 — In-app purchases / monetization → **none exist yet**

- **No `package.json`**, no Node/build tooling, no Capacitor project in the repo
  (confirmed: static PWA, no build step).
- **No StoreKit / IAP / purchase code** of any kind.
- **No paywall, no "premium", no subscription concept** anywhere in the app —
  every feature is currently free. (Grep for paywall/premium/subscription only
  hit Supabase-realtime's internal `SUBSCRIBED` noise.)

**Consequences for the plan:**
- **B10** (review the paywall screen) — nothing to review; no paywall exists.
- **B2** (test "premium" account for the reviewer) — premature; there is no
  premium concept to flag. Do this only after a subscription is designed.
- **B9 / C1.5 / Guideline 3.1.2** — monetization must first be decided **as a
  product** (what's paid, price, trial), before any StoreKit code is worth
  writing. Writing IAP code now would have nothing to test against.

**Owner decision needed (not a code task):** will v1 ship free, or with a
subscription? Everything IAP-related waits on that answer.

---

## B6 — Audio provenance → **only 3 cue files are actually played locally** ✅

How audio really works in the shipped app:

- **Breath cues (played locally, via Web Audio):** `cue-in`, `cue-out`,
  `cue-gong` — short in/out/gong beeps during practices. **The only local
  audio the app plays.** Synthesized short tones → no licensing question.
- **Frequency practices (binaural / Solfeggio):** play via **external search
  links** (Spotify / Apple Music / YouTube Music) rendered on the frequency
  screen, and logged with `source:"youtube"`. The local `tone-*` / `bin-*`
  mp3s were mapped to a `.file` field that **nothing ever reads** — dead code.
- **Ambient beds** `amb-*` — referenced nowhere at all.

**Actions:**
- `amb-*` (5 files) — deleted (earlier commit).
- Dead `.file` audio map removed from `app.bundle.js`.
- `tone-*` (10) + `bin-*` (6) — unused local files, **deleted**.

Net: **no third-party-licensed audio ships in the app** — the only bundled
audio is the three synthesized cue beeps (`cue-in/out/gong`). The B6 copyright
question for App Review is closed.

---

## B7 — Data inventory (for the App Privacy Label)

From the live schema + `delete-account` GDPR function. **No payment data is
collected.** Personal / usage data stored:

| Data | Where | Privacy-label bucket |
|------|-------|----------------------|
| Email | `auth.users` | Contact info — account + reminders |
| Display name, avatar | `profiles` | Contact info / User content |
| Practice sessions, habits, goals, books, water | `sessions, habits, habit_days, goals, books, water_intake, tasks` | Health & Fitness / Usage |
| Day ratings + free-text notes | `day_ratings` | Health & Fitness / User content |
| AI chat messages | `assistant_threads` | User content (sent to Google Gemini — see A4) |
| Push device token | `push_subscriptions` | Identifiers (device) |
| AI usage counters, audit events | `assistant_usage, assistant_events, account_deletions` | Diagnostics (PII-free) |

- **Third party:** AI chat content is sent to **Google Gemini** via the
  `assistant` edge function → must be disclosed (plan A4, Guideline 5.1.2(i)).
- **Deletion:** `delete-account` v2 cascades all FKs to `auth.users` → account
  deletion requirement (5.1.1(v)) is already covered.

Owner (C1.8) transfers this table into the App Privacy Label; chat-Claude (A)
turns it into the privacy-policy wording.

---

## B8 — Push opt-out → **fixed** (was: opt-out worked, but left an orphan row)

Settings already had the **"Отримувати нагадування"** toggle. Before: turning it
**off** saved the preference (so the cron stopped sending) but did **not**
unsubscribe the browser push or remove the `push_subscriptions` row.

**Done in this pass:** added `__rsDisablePush()` — on toggle-off it now calls
`PushSubscription.unsubscribe()` and deletes the row by `endpoint`. Clean opt-out
end to end. (Best-effort, wrapped in try/catch; never blocks the UI.)

---

## Status summary

| Item | Status |
|------|--------|
| B1 audit | ✅ this document |
| B4 login methods | ✅ email/password only → **no Sign in with Apple needed** |
| B5 IAP present? | ✅ none; monetization is an unmade product decision |
| B6 audio origin | ✅ only 3 synth cue beeps ship; freqs via external links; all unused `amb-*`/`tone-*`/`bin-*` deleted |
| B7 data inventory | ✅ table above; no payment data |
| B8 push opt-out toggle | ✅ implemented (unsubscribe + row delete) |
| B10 paywall text | n/a — no paywall exists |
| B3 insert disclaimer/privacy texts | ⏳ blocked on Section A drafts |
| B2 reviewer premium account | ⏳ blocked on the monetization decision |
| B9 StoreKit stub | ⏳ needs the Capacitor project (C1.3) |

**One thing genuinely waiting on the owner:** decide whether v1 is free or paid
(unblocks B2/B9/C1.5). The audio-licensing question (B6) is now moot — the only
unlicensed files were unused and have been deleted. Everything else in Section B
is either done above or waiting on Section A texts.
