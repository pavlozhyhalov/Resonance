# Resonance — резервне копіювання БД та відновлення

Автоматичний бекап бази Supabase (Postgres 17) у Cloudflare R2.
Workflow: [`.github/workflows/db-backup.yml`](../.github/workflows/db-backup.yml).

## Як це працює

- **Коли:** щодня о `00:00 UTC` (03:00 Київ) + вручну через
  GitHub → Actions → **DB backup to R2** → **Run workflow**.
- **Що:** `pg_dump` (клієнт PG17, `--no-owner --no-privileges`) → `gzip` →
  файл `backup-YYYY-MM-DD.sql.gz`.
- **Куди:** Cloudflare R2, бакет `resonance-db-backups` (S3-сумісний,
  endpoint `https://<account_id>.r2.cloudflarestorage.com`).
- **Скільки зберігається:** останні **14 днів** (старіші видаляються автоматично;
  керується `RETENTION_DAYS` у workflow).
- **Сповіщення:** якщо задані секрети Telegram — після кожного запуску
  приходить повідомлення (✅ успіх із розміром файлу / ❌ збій із лінком на лог).

## Секрети (GitHub → Settings → Secrets and variables → Actions)

| Секрет | Що це |
|---|---|
| `SUPABASE_DB_URL` | Рядок підключення, **Session pooler, порт 5432** (IPv4, бо GitHub не має IPv6). Формат: `postgresql://postgres.<ref>:<пароль>@aws-0-<region>.pooler.supabase.com:5432/postgres`. Спецсимволи в паролі — percent-encode (`@`→`%40`). |
| `R2_ACCOUNT_ID` | Cloudflare Account ID (лише ID, без `https://` і без `.r2...`). |
| `R2_ACCESS_KEY_ID` | Access Key ID з R2 API-токена (Object Read & Write). |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key того ж токена. |
| `R2_BUCKET_NAME` | `resonance-db-backups`. |
| `TELEGRAM_BOT_TOKEN` | *(необовʼязково)* токен бота від @BotFather. |
| `TELEGRAM_CHAT_ID` | *(необовʼязково)* твій chat id. |

Для цього проєкту: ref `xnfkuflpsbroxzpltvqq`, регіон `eu-west-1`,
pooler-host `aws-0-eu-west-1.pooler.supabase.com`.

## Як увімкнути Telegram-сповіщення

1. У Telegram напиши **@BotFather** → `/newbot` → дай імʼя → отримаєш
   **токен** (виду `1234567890:AAE...`). Це `TELEGRAM_BOT_TOKEN`.
2. Напиши своєму новому боту будь-що (щоб він міг тобі писати).
3. Дізнайся свій **chat id**: напиши боту **@userinfobot** — він поверне `Id`.
   Це `TELEGRAM_CHAT_ID`.
4. Додай обидва секрети в GitHub (як інші). Готово — далі бот пише сам.

## Як ВІДНОВИТИСЯ з бекапу

> ⚠️ Відновлення перезапише поточні дані. Для безпеки спершу зроби свіжий
> бекап (Run workflow вручну), а тренуйся відновлюватись на **тимчасовому**
> проєкті Supabase, а не на проді.

1. **Завантаж файл** з R2 (Cloudflare → R2 → `resonance-db-backups` → потрібний
   `backup-YYYY-MM-DD.sql.gz` → Download). Або через aws-cli:
   ```bash
   aws s3 cp s3://resonance-db-backups/backup-2026-08-21.sql.gz . \
     --endpoint-url https://<account_id>.r2.cloudflarestorage.com
   ```
2. **Розпакуй:**
   ```bash
   gunzip backup-2026-08-21.sql.gz
   ```
3. **Залий у базу** (той самий Session pooler рядок, що й у секреті):
   ```bash
   psql "postgresql://postgres.xnfkuflpsbroxzpltvqq:<пароль>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
     < backup-2026-08-21.sql
   ```
   Потрібен клієнт PG17: `psql --version` має бути 17.x
   (`/usr/lib/postgresql/17/bin/psql`).

Одним рядком (без розпакування на диск):
```bash
gunzip -c backup-2026-08-21.sql.gz | psql "<connection string>"
```

## Перевірка, що бекапи живі (раз на місяць-два)

- Відкрий R2 → бакет → переконайся, що файли зʼявляються щодня і мають
  розумний розмір (не 0–1 КБ).
- **Автоматичний тест відновлення:** Actions → **DB restore test** → Run workflow
  ([`.github/workflows/db-restore-test.yml`](../.github/workflows/db-restore-test.yml)).
  Він завантажує останній дамп із R2, відновлює його у **тимчасовий**
  Postgres-контейнер (прод не чіпається) і друкує кількість рядків у ключових
  таблицях. Падає, лише якщо core-таблиці порожні. Це підтверджує, що
  «є бекап» = «відновлення працює».
  - У лозі буде багато `ERROR: role "authenticated" does not exist`,
    `extension "pg_cron"/"pg_net"/"supabase_vault"`, схеми `auth`/`cron`/`vault` —
    це **очікувано** (керовані Supabase обʼєкти відсутні у чистому Postgres) і
    не впливає на дані схеми `public`.

## Це логічний бекап — не єдиний рівень

`pg_dump` — це знімок даних на момент запуску. Для відновлення **на будь-яку
хвилину** увімкни **PITR** на Supabase Pro (Dashboard → Database → Backups).
Разом: щоденні дампи в R2 (дешево, офсайт, довго) + PITR (точне відновлення).
Див. `docs/HANDOFF-iOS.md` — там PITR у списку відкритих задач.
