# Apple Review — Repo/Backend readiness audit (Section B)

> Facts gathered by **Claude Code** directly from the repository and the live
> Supabase schema. Read-only investigation — no product decisions made here.
> Pairs with `docs/HANDOFF-iOS.md` (the ordered plan) and the task split in
> `03_Rozpodil_zavdan.md`. Chat-Claude (Section A) reconciles this against the
> checklist; the owner (Section C) acts on what needs money/Mac.

_Last updated: 2026-08-29 · build 20260825000010 · +ТЗ part 2–4 (AI consent server-side, push priming reverts toggle, /support, review notes)_

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

## B-продовження (ТЗ частина 2)

_Факт + Статус, без інтерпретацій «чи достатньо для Apple». Build 20260825000008._

**Монетизація — уточнено (ТЗ ч.2):** 6.99 €/міс, 44.99 €/рік, хард-paywall після
14 днів. Це знімає «рішення власника» з B5 і розблоковує B2/B9. У **коді/схемі
такої моделі ще нема** (див. B5) — рішення продуктове, не реалізоване.

### 4. Gemini-розкриття
**Факт:** Політика приватності живе в коді (`__rsPrivacyContent` у
`app.bundle.js`), 7 мов через `__rsT`. Отримувача даних чату названо **явно —
«Google Gemini»**, не узагальнено «AI». uk-цитата: *«…запитання й короткий
контекст твого профілю надсилаються до Google Gemini, щоб згенерувати відповідь.
Не пиши туди чутливих персональних чи медичних даних.»* Плюс список передачі
даних: *«Supabase (база даних і вхід), Google (наставник), Resend
(листи-нагадування) та Umami (анонімна аналітика)»*. «Google Gemini» присутнє
дослівно в усіх 7 мовах (uk/ru/en/pl/es/fr/de — підтверджено grep).
**Статус:** ГОТОВО (4.1–4.3).

**Факт (4.4):** Окремого consent-екрана саме перед першим AI-чатом **немає**. Є
consent рівня реєстрації — чекбокс *«Реєструючись, я приймаю Політику
приватності»*, що блокує створення акаунта без згоди. Окремого AI-специфічного
gate нема.
**Статус:** ЧАСТКОВО (privacy-consent при реєстрації є; AI-specific — нема).

### 5. Дисклеймери фізичного ризику — повний текст
**Факт (5.1–5.2):** Функція `__rsSafety(kind)` в `app.bundle.js`, показує ⚠-картку
на екранах практик. Повний uk-текст (es/fr/de синхронізовано цією сесією; ru/pl/en
вже були):
- **Дихання:** *«Дихальні практики й затримки роби сидячи або лежачи — не за
  кермом і не у воді. При вагітності, хворобах серця чи тиску спершу порадься з
  лікарем.»*
- **Холод:** *«Холод протипоказаний при хворобах серця чи тиску та під час
  вагітності без дозволу лікаря. Ніколи не занурюйся сам. Виходь, якщо німіють
  кінцівки або різко погіршало.»*
- **Вправи:** *«Утримання роби плавно, диши рівно й не терпи гострий біль. При
  травмах спини чи суглобів або вагітності порадься з лікарем. Зупинись, якщо
  запаморочилось.»*

**Факт (5.3):** Присутні явно: «не за кермом» (дихання), «не у воді» (дихання),
«Ніколи не занурюйся сам» (холод), «порадься з лікарем» (усі три). Формулювання
«не у ванні на самоті» окремо нема — але холод покриває «не занурюйся сам».
**Факт (5.4):** Показується **inline при кожному відкритті екрана практики**
(частина рендера), не одноразово й не як окремий дисміс.
**Статус:** ГОТОВО.

### 6.2–6.4. Push — UI та consent
**Факт (6.2):** Окремого priming-екрана перед системним iOS-запитом **немає**.
Контекст дає підпис під тумблером у Налаштуваннях: *«Якщо о цей час сьогодні ще
не буде практики — нагадаємо push-сповіщенням (або листом), щоб не втратити
серію.»* Увімкнення тумблера одразу викликає `Notification.requestPermission()`
(у `__rsEnablePush`).
**Статус:** ЧАСТКОВО (пояснення є підписом; окремого priming-екрана нема).

**Факт (6.4):** Один спільний opt-in *«Отримувати нагадування»* покриває і push,
і email-фолбек (Resend) — розділення на «функціональні» vs «маркетингові» згоди в
UI **нема**. Re-engagement (`send-winback`) — серверна edge-функція, **не в
репозиторії**; її гейтинг з коду підтвердити не можна.
**Статус:** НЕ РОЗДІЛЕНО (єдиний opt-in у клієнті).

### 10. Категорія App Store і віковий рейтинг
**Факт (10.1):** Категорію обрано — **Health & Fitness**: `docs/HANDOFF-iOS.md`
(рядки 171, 203, 215) та `docs/APP-STORE-LISTING.md:5`.
**Факт (10.2):** Віковий рейтинг — лише чернетковий рядок
`docs/APP-STORE-LISTING.md:246`: *«Age Rating: ймовірно 4+ …; анкету заповнити
чесно.»* Повних відповідей на анкету нема.
**Статус:** ЧАСТКОВО (категорія — ГОТОВО; рейтинг — орієнтовно 4+, анкета не
розписана).

### 11. Аргумент «не thin wrapper» — факти
**Факт (11.1–11.2):** PWA-офлайн реалізовано в `sw.js` (service worker):
- HTML/навігації — **network-first** (свіжий `index.html`, офлайн-фолбек до кешу
  `./`);
- версійні асети (`app.bundle.js?v=`, `css/styles.css?v=`, іконки), медіа
  (`png/svg/woff2/mp3`) та Google Fonts — **cache-first**;
- i18n JSON і Supabase — завжди мережа.
`manifest.webmanifest`: `display: standalone`, `name`, `short_name`,
`start_url`. → після першого завантаження оболонка застосунку працює офлайн.
**Факт (11.3):** Нативне, заплановане для Capacitor понад звичайний сайт:
**APNs-пуш** (головна нативна задача — web-push не працює в iOS-обгортці, за
`CLAUDE.md`/`HANDOFF-iOS.md`). Інші нативні можливості в доках не зафіксовані.
**Статус:** ГОТОВО (факти зібрані; сам аргумент пише Chat-Claude).

### 13. Контакт і Support URL
**Факт (13.1):** Контактний email **є** — `pavlozhyhalov@gmail.com`, у політиці
приватності: *«Питання щодо приватності: pavlozhyhalov@gmail.com»*. Подано як
privacy-контакт, усередині сторінки `/privacy`; окремої форми зворотного зв'язку
в UI нема.
**Факт (13.2):** Окремої сторінки підтримки (Support URL) **не знайдено**;
`docs/HANDOFF-iOS.md:171` перелічує support URL як ще потрібний.
**Статус:** контакт-email — ГОТОВО (лише в privacy-контексті); Support URL — НЕ
ЗНАЙДЕНО.

### B2. Тестовий акаунт для рев'юера
**Факт:** Поля/концепту преміуму в схемі чи коді **нема** (див. B5). Прапорець
типу `premium_override` був би **неробочим** — застосунку нема що по ньому
відкривати (paywall відсутній). Отже осмислений преміум-акаунт можна створити
лише **після** появи paywall + поля прав (напр. `profiles.premium_until` або
таблиця `subscriptions`). Креденшли **не можна** класти в публічний репозиторій.
**Статус:** НЕ ГОТОВО (блоковано відсутністю поля прав; далі — створити юзера в
Supabase Auth + виставити прапорець, креденшли передати приватним каналом).

### B9. StoreKit — заготовка
**Факт:** Capacitor-проєкту нема (B5) → точки інтеграції ще не існує. План:
плагін-кандидат **RevenueCat `@revenuecat/purchases-capacitor`** (або
`@capacitor-community/in-app-purchases`); точка інтеграції — єдиний модуль
paywall/прав, що (а) перевіряє статус підписки при старті, (б) блокує преміум
після 14-денного вікна, (в) дає дії purchase/restore. У поточному коді природний
гейт — шар рендеру екранів (`V()`/render), через хелпер `__rsEntitled()`.
**Статус:** ЧАСТКОВО (план зафіксовано; нічого не підключено, треба Capacitor).

---

## B-продовження 2 (ТЗ частина 3 — вставлено/створено)

_Build 20260825000009. Не чіпав `__rsSafety` і Gemini-розкриття — вони вже добрі._

### Завдання 1 — AI-consent перед першим чатом ✅ ВСТАВЛЕНО
- **Що:** одноразовий gate `__rsAiConsentGate()` перед першим повідомленням у
  чаті Наставника (у `j(x)` — `if(!await __rsAiConsentGate())return`).
  Прапорець — `localStorage["rsrc_ai_consent"]` (один раз на пристрій; не при
  кожному відкритті). Файл: `app.bundle.js`.
- **Текст (7 мов):** «Перед початком розмови» + узгоджене з політикою
  формулювання про Google Gemini + «Наставник — це AI, а не заміна лікаря чи
  психолога.» Кнопка «Зрозуміло, почати».
- **Оновлено (ТЗ ч.4):** згода тепер **на сервері** — колонка
  `profiles.ai_consent_at` (timestamptz, nullable; міграція застосована в прод).
  При «Зрозуміло, почати» пишеться час згоди; gate читає з `profiles`, а
  `localStorage` лишився лише кешем (щоб не робити зайвий запит). Прив'язано до
  акаунта, з часовою міткою.

### Завдання 2 — постійна AI-мітка в чаті ✅ ВСТАВЛЕНО
- **Що:** постійний підпис угорі чату (`.assistant-ailabel`, перший елемент
  `.assistant-chat`). Файли: `app.bundle.js`, `css/styles.css`.
- **Текст (7 мов):** «AI-наставник · не медична порада».

### Завдання 3 — priming-екран перед push ✅ ВСТАВЛЕНО
- **Що:** `__rsPushPriming()` викликається в `__rsEnablePush` **перед**
  `Notification.requestPermission()`. При «Не зараз» / закритті —
  `requestPermission()` **не викликається взагалі** (критична вимога ТЗ
  виконана). Файл: `app.bundle.js`.
- **Текст (7 мов):** «Не втратити серію» + пояснення; кнопки «Увімкнути
  нагадування» / «Не зараз».
- **Оновлено (ТЗ ч.4):** при «Не зараз» **тумблер тепер скидається на OFF**.
  Компонент `ri()` розширено підтримкою veto: якщо колбек повертає `false`
  (або `Promise<false>`), перемикач вертається у попередній стан. Колбек
  нагадувань чекає на `__rsEnablePush()` і при відмові від priming робить
  revert + нічого не зберігає — дія юзера й стан UI більше не розходяться, і
  email-нагадування не йдуть. (Зміна `ri()` зворотно сумісна: інші тумблери
  повертають `undefined` → комітяться як раніше.)

### Завдання 4 — сторінка /support ✅ СТВОРЕНО
- **Що:** новий маршрут `#/support` (`__rsSupportRender`, дзеркало `/privacy`) +
  кнопка «Підтримка» в Налаштуваннях (поряд з політикою). Файли:
  `app.bundle.js`, `css/styles.css`.
- **Вміст (7 мов):** заголовок, email `pavlozhyhalov@gmail.com` (mailto), час
  відповіді, лінк на Політику приватності, FAQ з 5 питань (видалити акаунт /
  вивантажити дані / змінити мову / вимкнути сповіщення / зникла серія).
- **Support URL для App Store Connect:** `https://youresonance.com/#/support`.

### Завдання 5 — віковий рейтинг у docs ✅ ОНОВЛЕНО
- `docs/APP-STORE-LISTING.md`: рядок «ймовірно 4+» замінено розгорнутою
  чернеткою-таблицею (очікувано 9+/13+, з блоками Medical/Wellness та AI).
  Support URL там же оновлено на `/support`.

### Завдання 6 — Review Notes ✅ СТВОРЕНО
- `docs/APP-REVIEW-NOTES.md` — повний текст для App Review, з 2 заглушками
  (тестовий акаунт, subscription model) як вимагав ТЗ. Support URL заповнено.

### Завдання 7 — розділення consent (functional vs marketing) — ОПИС, НЕ ІМПЛЕМ.
- **Поточний стан:** один тумблер «Отримувати нагадування» покриває і push, і
  email-фолбек (Resend). Окремого маркетингового opt-in нема.
- **Складність розділення:** середня. Клієнт: додати другий тумблер і зберігати
  два прапорці в `settings` (напр. `notify_practice`, `notify_winback`) — ~пів
  години. Але реальний гейтинг **на боці edge-функцій** (`send-reminders`,
  `send-winback`), яких **немає в репозиторії** — їх треба правити через Supabase
  MCP, щоб `send-winback` поважав окремий прапорець. Тобто повне розділення = 1
  тумблер у клієнті + 1 колонка в `settings` + правка `send-winback`.
- **Статус:** не блокер для Apple; для GDPR (ЄС) бажано. **Не імплементував** —
  чекаю окремого підтвердження власника (за ТЗ).

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
| §4 Gemini disclosure | ✅ named in all 7 langs; ✅ one-time AI consent gate before first chat added (ТЗ3-1) |
| §5 risk disclaimers | ✅ full text present (breath/cold/exercise), all 7 langs, shown on every practice screen |
| AI label in chat | ✅ permanent "AI · not medical advice" label added, 7 langs (ТЗ3-2) |
| §6.2 push priming | ✅ custom priming screen before the system prompt; decline never calls requestPermission (ТЗ3-3) |
| §6.4 functional vs marketing | ◑ single shared opt-in; split described, not implemented (needs edge-fn change) (ТЗ3-7) |
| §10 category / age | ✅ Health & Fitness; ✅ age-rating draft expanded to 9+/13+ in docs (ТЗ3-5) |
| §11 thin-wrapper facts | ✅ SW offline + manifest standalone; APNs planned |
| §13 support URL | ✅ `/support` page created, 7 langs + settings link (ТЗ3-4) |
| review notes | ✅ `docs/APP-REVIEW-NOTES.md` created (2 placeholders) (ТЗ3-6) |
| B10 paywall text | n/a — no paywall exists |
| B3 insert disclaimer/privacy texts | ✅ all texts inserted (AI consent, AI label, push priming, /support) — nothing blocked |
| B2 reviewer premium account | ⏳ blocked: no entitlement field exists yet (paywall not built) |
| B9 StoreKit stub | ◑ plan documented (RevenueCat/Capacitor); needs the Capacitor project |

**Monetization is now decided** (6.99 €/mo, 44.99 €/yr, 14-day hard paywall), but
it is **not built** — no paywall/entitlement code or DB field exists yet. So B2
(reviewer premium account) and B9 (StoreKit) stay blocked on **building the
paywall**, not on a decision. The audio-licensing question (B6) is moot (unused
files deleted). All Section-A texts (AI-chat consent, AI label, safety
disclaimers, the Support page) are already inserted. **The only repo-side work
that remains is the paywall build.**
