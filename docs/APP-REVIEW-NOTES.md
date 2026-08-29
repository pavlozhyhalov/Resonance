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
Login: [TO BE FILLED — private note]
Password: [TO BE FILLED — private note]
This account has full access (founder tier) so all features, including the
AI mentor chat, can be reviewed without a purchase.

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
New users get 14 days of full access (a trial tracked server-side). After
that, three things lock: the AI mentor chat, logging new practices, and the
XP/streak progression tied to them. Everything already earned stays fully
visible and usable — history, statistics, charts, current level and titles
are never locked. Unlock is via an auto-renewable Apple In-App Purchase:
monthly (€6.99) or annual (€44.99, ~46% cheaper). The subscription renews
automatically and can be cancelled anytime in App Store settings; this is
stated on the paywall screen (all 7 languages), which also links to the
Privacy Policy. Entitlement is enforced server-side (Postgres RLS + a check
inside the assistant Edge Function), not only in the client.

LANGUAGES
Fully localized in 7 languages: Ukrainian, Russian, English, Polish,
Spanish, French, German — including AI-facing prompts and notification copy.

CONTACT
pavlozhyhalov@gmail.com
Support page: https://youresonance.com/#/support
```

---

## Placeholders to fill before submission

1. **DEMO / TEST ACCOUNT** — the entitlement field now exists
   (`profiles.access_type`). Simplest path: **register a fresh account in the
   app before the App Store release** — every pre-release signup is
   automatically a lifetime *founder* (full access), which is exactly what a
   reviewer needs. Put those credentials in a **private note**, not in this
   repo file. (Alternatively, create the account and set `access_type='founder'`
   with the service role in Supabase.)

2. **SUBSCRIPTION MODEL** — the copy above is final and matches the shipped
   entitlement logic. **One caveat to wire before actual submission:** the
   paywall's purchase button is currently a stub ("payment available soon") —
   Apple In-App Purchase must be connected (single integration point, marked
   `TODO(payment)` in `app.bundle.js`) so the described purchase actually works
   at review time. Until then, do **not** submit to Apple.

The claims about offline, third-party AI disclosure, the one-time AI consent,
the permanent AI label, the safety disclaimers, data export/delete, the
`/support` page, and the paywall/entitlement (server-enforced) are all
**already true in the shipped web app** (build 20260825000011+); only the
payment-provider hookup remains.
