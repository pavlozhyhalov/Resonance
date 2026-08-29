# App Review Notes

> Paste the block below into **App Store Connect → App Review Information →
> Notes** at submission. Two bracketed placeholders are filled in later (after
> the paywall + reviewer test account exist). Everything else is final.

```
RESONANCE — APP REVIEW NOTES

APP OVERVIEW
Resonance is a self-improvement and habit-gamification app. Users build daily
practices (breathing exercises, cold exposure, static holds, cardio/strength
tracking, reading), and progress through an RPG-style system (XP, levels,
skill trees, titles). The app includes a personal AI mentor for motivation
and habit guidance, and a daily mood check-in.

DEMO / TEST ACCOUNT
Login: [TO BE FILLED — after paywall + entitlement field exist]
Password: [TO BE FILLED]
This account has full access so all features, including the AI mentor chat,
can be reviewed.

WHY THIS IS NOT A REPACKAGED WEBSITE (Guideline 4.2)
Resonance is a Capacitor-wrapped PWA. The iOS build adds capabilities the
website cannot provide: APNs push notifications for streak reminders (web
push does not work inside an iOS wrapper), and native iOS presentation
(standalone display, safe-area handling, pull-to-refresh). The app already
works offline after first load via a service worker — the app shell,
assets, and practice screens are cached locally, so daily practice logging
does not depend on connectivity. The interaction model is built around
short, repeated daily sessions on a phone, not passive content browsing.

AI MENTOR — THIRD-PARTY AI DISCLOSURE
The AI mentor sends the user's chat messages and a short profile context to
Google Gemini via our backend (Supabase Edge Function) to generate replies.
This is disclosed explicitly in our Privacy Policy (all 7 languages, Google
Gemini named directly) and in a one-time in-app consent notice shown before
the user's first chat message. The chat interface is permanently labelled as
AI. No payment data exists in the app at all; no health-device or government
ID data is collected. Rate limits (15/hour, 40/day per user) are enforced
server-side.

HEALTH & SAFETY CONTENT
Breathing, cold exposure, and static hold practices each display a safety
disclaimer directly on the practice screen (not hidden behind a dismiss),
covering: medical consultation for pregnancy, heart and blood-pressure
conditions; never submerging alone in cold water; not practising breathwork
while driving or in water; stopping on dizziness or numbness. Shown in all
7 languages.

PRIVACY & DATA
Users can export all their own data as JSON and delete their account from
within the app; deletion cascades across all related records. Analytics is
Umami (cookieless, no personal data, no cross-app tracking) — the App
Privacy card declares Tracking = none and no ATT prompt is required.

SUBSCRIPTION MODEL
[TO BE FILLED after paywall is built — will describe: 14-day full-access
trial tracked server-side, after which new progress is locked while all
earned history stays visible; unlock via Apple In-App Purchase, monthly
and annual auto-renewable tiers.]

LANGUAGES
Fully localized in 7 languages: Ukrainian, Russian, English, Polish,
Spanish, French, German — including AI-facing prompts and notification copy.

CONTACT
pavlozhyhalov@gmail.com
Support page: https://youresonance.com/#/support
```

---

## Placeholders to fill before submission

1. **DEMO / TEST ACCOUNT** — needs the paywall + an entitlement field (e.g.
   `profiles.premium_until` or a `subscriptions` table) so a reviewer account
   can be flagged premium. Create the account in Supabase Auth, set the flag,
   put the credentials here (this file is in the repo — if that repo is public,
   move the credentials to a private note and reference it instead).
2. **SUBSCRIPTION MODEL** — fill once the paywall is built (final copy already
   drafted inside the brackets; confirm the trial/lock behavior matches the
   shipped implementation).

The claims about offline, third-party AI disclosure, the one-time AI consent,
the permanent AI label, the safety disclaimers, data export/delete, and the
`/support` page are all **already true in the shipped web app** (build
20260825000009+).
