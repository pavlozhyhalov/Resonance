# Security review — RLS, delete-account, advisors (RISK plan §5.5 + §1.6)

**Дата:** 2026-09-06. Джерело: Supabase MCP (`get_advisors`, `pg_policies`,
`pg_constraint`) для проєкту `xnfkuflpsbroxzpltvqq`. Це **ревізія (read-only)** —
жодних DDL-змін не застосовано; наприкінці — перелік рекомендованих правок, які
чекають окремого «так».

## §1.6 — `delete-account` покриває всі таблиці ✅ PASS

`delete-account` v3 видаляє auth-користувача; усе решта каскадить через
`ON DELETE CASCADE`. Перевірено `pg_constraint`: **прямий CASCADE-FK на
`auth.users`** мають усі користувацькі таблиці —
`profiles, settings, sessions, habits, habit_days, day_ratings, water_intake,
books, goals, tasks, task_completions, rewards, reminders, notifications,
push_subscriptions, assistant_threads, assistant_usage, communities,
community_members, community_invites, community_challenges,
challenge_participants, learn_items`. Транзитивний каскад теж на місці
(`habit_days→habits`, `task_completions→tasks`, `community_*→communities`,
`challenge_participants→community_challenges`).

**Навмисно НЕ каскадять** (правильно): `account_deletions`, `assistant_events`
(PII-free аудит), `app_config` (конфіг/секрети). Нові таблиці після серпня
(`learn_items`, `water_intake`) — **покриті**. Рекомендація: додати цей інваріант
у smoke-тест і повторювати перевірку при кожній новій таблиці.

## §5.5 — RLS

- **Усі 25 таблиць мають RLS enabled.** ✅
- **Deny-all (0 політик)** на `account_deletions`, `app_config`,
  `assistant_events`, `assistant_usage` — це **навмисно й безпечно**: доступ лише
  через service-role (edge-функції). Advisor позначає їх `INFO`, це не діра.
- **По 3–4 політики** (per-user CRUD) на всіх користувацьких таблицях. ✅
- **1 політика** на `water_intake` (записи йдуть через RPC `water_add`
  SECURITY DEFINER — SELECT-політики достатньо; **за задумом**) і на `learn_items`
  (фіча порожня, 0 рядків — **перевірити** її єдину політику перед запуском фічі).

## Advisor WARN — рекомендації (не застосовано, потребують «так»)

1. **Leaked-password protection вимкнено** (Supabase Auth). Увімкнути перевірку
   по HaveIBeenPwned — тумблер власника в дашборді. Найдешевший виграш.
   `[ВЛАСНИК]`
2. **`profiles_guard_access()` викликається як RPC** `anon`/`authenticated`. Це
   тригер-функція, її не має бути в публічному API. Рекомендація: `REVOKE
   EXECUTE ... FROM anon, authenticated` (безпечно — тригер працює незалежно від
   RPC-гранту). `[CODE]` — міграція, чекає «так».
3. **Інші SECURITY DEFINER RPC** (`is_entitled`, `water_add`, `community_*`,
   `challenge_*`, `invited_to`, `owns_community`, `winback_candidates`,
   `mark_winback_sent`, `notify_*`) — **переважно за задумом** (клієнт/крон їх
   викликає, DEFINER потрібен для контрольованого обходу RLS). Дію не потрібно;
   зафіксовано як свідомий стан.
4. **`pg_net` у схемі `public`** — мінорна гігієна; перенести в окрему схему.
   Низький пріоритет. `[CODE]`

## §5.3 — Шифрування бекапів у R2

`.github/workflows/db-backup.yml`: `pg_dump | gzip | aws s3 cp` у Cloudflare R2.
**Клієнтського шифрування дампа перед завантаженням немає** — єдиний `gpg` у
воркфлоу це імпорт apt-ключа PGDG, не шифрування даних. Тобто дамп лежить у R2
покладаючись лише на server-side encryption at rest від Cloudflare (не наш ключ).

**Рекомендація** `[CODE]` + `[ВЛАСНИК]` (потребує секрету):
- шифрувати дамп перед вивантаженням: `... | gzip | age -r $AGE_PUBLIC_KEY > dump.age`
  (або `gpg --symmetric --cipher-algo AES256`), і дешифрувати в `db-restore-test.yml`;
- ключ/пароль — у GitHub Secrets (`AGE_PUBLIC_KEY` для шифрування, приватний ключ —
  лише для відновлення, зберігати офлайн);
- готовий патч можу дати; **потрібен твій крок**: створити ключ і додати секрет.

Пріоритет: середній (at-rest від Cloudflare вже є; це додатковий шар «наш ключ»).

## Оновлення 2026-09-13 — нові таблиці (ТЗ B.3 / C.1)
- `push_subscriptions`: додано `last_ok_at`, `fail_count` + `bump_push_fail()`
  (SECURITY DEFINER, execute відкликано в anon/authenticated).
- `streak_freezes` (B.3): FK `auth.users` **ON DELETE CASCADE** ✓, RLS ✓
  (select/insert/delete для `auth.uid()=user_id`). delete-account покриває.
- `assistant_tips` (C.1): FK `auth.users` **ON DELETE CASCADE** ✓, RLS ✓
  (**SELECT-only** для власника; пише сервер через service role). delete-account покриває.

## Разом
Модель доступу міцна: RLS скрізь, deny-all на службових таблицях коректний,
видалення акаунта повне. Відкриті: дрібні харденінги RLS (1–2), клієнтське
шифрування бекапів (§5.3) — усі за окремим рішенням/кроком власника.
