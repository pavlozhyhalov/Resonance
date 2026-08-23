# Тексти сповіщень за станом доступу (Крок 0.5)

> Чернетка текстів push / email сповіщень для трьох станів доступу користувача.
> Модель доступу вже **зафіксована** (див. `Resonance_povnyy_kontekst.md`, розділ 4):
> 14 днів повного доступу → після цього, без оплати, **жорсткий блок нового
> прогресу** (AI вимикається, нові практики не пишуться в календар/серії/XP), але
> **вся накопичена історія лишається видимою**.
>
> Тут — тільки **копірайтинг** (uk / ru / en / pl). Логіка розсилки (коли саме
> слати, через який канал) реалізується пізніше в edge-функціях `send-reminders` /
> `send-winback` разом із APNs (Крок 3). Це не потребує коду прямо зараз — спершу
> Павло затверджує формулювання, далі підставляємо в `__rsT` / шаблони функцій.

## Принципи тону

- Друге лице однини («ти»), тепло, без тиску й без вини — узгоджено з рештою застосунку.
- Ніколи не червоне, ніколи не «ти невдаха». Опора на **вже досягнуте** («ось усе,
  що ти зробив»), а не на страх втрати.
- Плейсхолдери: `{streak}` — поточна серія днів, `{days}` — днів до кінця тріалу,
  `{level}` — рівень персонажа, `{name}` — імʼя (якщо є). Усі опційні: якщо даних
  немає, речення має читатися й без них (варіанти без плейсхолдерів наведені).
- Push: **title ≤ 40 символів**, **body ≤ 110 символів** (щоб не обрізало на iOS).
  Email: тема коротка, тіло — 2–4 речення + одна CTA-кнопка.

> **Перевірка лімітів (2026-08-23):** усі push-рядки (A1–C4, 4 мови) звірено з
> підстановкою плейсхолдерів у найгіршому випадку (`{streak}`=365, `{level}`=99,
> `{days}`=14). **Жоден title не перевищує 40, жоден body — 110.** Найдовші: title —
> B1 (~27), body — B2 ru (80). Запас достатній.

---

## Стан A — Тріал активний (дні 0–13): звичайні нагадування

У перші 14 днів користувач — фактично «повний»: сповіщення йдуть як платному
(нагадування про практики, серія під загрозою). Це вже частково реалізовано;
нижче — узгоджені формулювання для APNs-версії.

### A1. Нагадування про практику (день без активності)

| Мова | Title | Body |
|---|---|---|
| uk | Час практики | Ти сьогодні ще не практикував. Кілька хвилин — і день зараховано. |
| ru | Время практики | Ты сегодня ещё не практиковал. Пара минут — и день засчитан. |
| en | Time to practice | You haven’t practiced today yet. A few minutes and the day counts. |
| pl | Czas na praktykę | Dziś jeszcze nie ćwiczyłeś. Kilka minut i dzień się liczy. |

### A2. Серія під загрозою (пізній вечір, день ще не закритий)

| Мова | Title | Body |
|---|---|---|
| uk | Серія {streak} під загрозою | Ще встигаєш зберегти серію сьогодні. Одна коротка практика — і вона ціла. |
| ru | Серия {streak} под угрозой | Ещё успеваешь сохранить серию. Одна короткая практика — и она цела. |
| en | Streak {streak} at risk | Still time to keep your streak. One short practice saves it. |
| pl | Seria {streak} zagrożona | Wciąż zdążysz uratować serię. Jedna krótka praktyka wystarczy. |

*Без плейсхолдера:* uk «Серія під загрозою» · ru «Серия под угрозой» · en «Your streak is at risk» · pl «Twoja seria jest zagrożona».

---

## Стан B — Тріал закінчується (дні 11–14): мʼяке попередження

Мета — не налякати, а нагадати, що повний доступ добігає кінця, і показати цінність.
Слати ненавʼязливо: орієнтовно за 3 дні, за 1 день, і в день закінчення.

### B1. За кілька днів до кінця (T-3, зазвичай {days}=3)

| Мова | Title | Body |
|---|---|---|
| uk | Ще {days} {дн_uk} повного доступу | Твій рівень {level} і серія {streak} з тобою. Усе поки повністю відкрито. |
| ru | Ещё {days} {дн_ru} полного доступа | Твой уровень {level} и серия {streak} с тобой. Всё пока полностью открыто. |
| en | {days} {day_en} of full access left | Your level {level} and streak {streak} are yours. Everything is still fully open. |
| pl | Pełny dostęp jeszcze {days} {dzień_pl} | Twój poziom {level} i seria {streak} są z tobą. Wszystko wciąż otwarte. |

*Без плейсхолдерів:* uk «Повний доступ ще кілька днів» · ru «Полный доступ ещё несколько дней» · en «A few days of full access left» · pl «Jeszcze kilka dni pełnego dostępu».

> **Числівник + слово «день» ({дн_uk} / {дн_ru} / {day_en} / {dzień_pl}):**
> хардкод «3 дні» прибрано з тіла — шаблон тепер коректний для будь-якого {days}.
> Форму слова підставляти за останньою цифрою {days}:
> - **uk:** `1,21,31…` (крім 11) → **день** · `2–4,22–24…` (крім 12–14) → **дні** ·
>   решта (`0,5–20,25–30…`) → **днів**.
> - **ru:** `1,21…` (крім 11) → **день** · `2–4,22–24…` (крім 12–14) → **дня** ·
>   решта → **дней**.
> - **pl:** `1` → **dzień** · решта → **dni**.
> - **en:** `1` → **day** · решта → **days**.
> Якщо форму не обчислено — використати безпечний фолбек «*Без плейсхолдерів*» вище.

### B2. За 1 день (T-1)

| Мова | Title | Body |
|---|---|---|
| uk | Завтра завершується тріал | Усе, що ти зібрав, лишиться з тобою. Щоб рухатись далі — обери підписку. |
| ru | Завтра заканчивается триал | Всё, что ты собрал, останется с тобой. Чтобы двигаться дальше — оформи подписку. |
| en | Your trial ends tomorrow | Everything you’ve built stays yours. To keep going, pick a plan. |
| pl | Jutro kończy się okres próbny | Wszystko, co zebrałeś, zostaje z tobą. Aby iść dalej — wybierz plan. |

### B3. День закінчення (T-0)

| Мова | Title | Body |
|---|---|---|
| uk | Сьогодні останній день доступу | 14 днів позаду. Твоя історія збережена — розблокуй, щоб рости далі. |
| ru | Сегодня последний день доступа | 14 дней позади. Твоя история сохранена — разблокируй, чтобы расти дальше. |
| en | Last day of full access | 14 days done. Your history is saved — unlock to keep growing. |
| pl | Ostatni dzień pełnego dostępu | 14 dni za tobą. Twoja historia zapisana — odblokuj, by rosnąć dalej. |

---

## Стан C — Тріал вичерпано, без оплати (день 14+): «розблокуй прогрес»

Це **головний новий блок** (пункт зі скріншоту). Тон — не про конкретні звички
(вони більше не пишуться), а про **вже накопичене** й запрошення продовжити.
Слати рідко й гідно: не щодня. Рекомендація — на 1-й, 3-й, 7-й, 14-й, 30-й день
після блокування, потім раз на місяць (частоту фіналізуємо в Кроці 3).

### C1. Одразу після блокування (день 14, ввечері)

| Мова | Title | Body |
|---|---|---|
| uk | Твій прогрес на паузі | Рівень {level}, серія {streak} днів — усе на місці. Розблокуй, щоб продовжити. |
| ru | Твой прогресс на паузе | Уровень {level}, серия {streak} дней — всё на месте. Разблокируй, чтобы продолжить. |
| en | Your progress is paused | Level {level}, a {streak}-day streak — all still here. Unlock to continue. |
| pl | Twój postęp jest wstrzymany | Poziom {level}, seria {streak} dni — wszystko na miejscu. Odblokuj, by kontynuować. |

*Без плейсхолдерів:* uk «Твій прогрес на паузі / Усе, що ти зібрав, на місці. Розблокуй, щоб продовжити.»

### C2. Нагадування-повернення (день 3–7)

| Мова | Title | Body |
|---|---|---|
| uk | Персонаж чекає на тебе | Твоя історія нікуди не зникла. Один крок — і продовжуєш з того ж місця. |
| ru | Персонаж ждёт тебя | Твоя история никуда не делась. Один шаг — и продолжаешь с того же места. |
| en | Your character is waiting | Your history is right where you left it. One step and you’re back. |
| pl | Twoja postać czeka | Twoja historia jest tam, gdzie ją zostawiłeś. Jeden krok i wracasz. |

### C3. AI-помічник як гачок (день 7–14)

| Мова | Title | Body |
|---|---|---|
| uk | Помічник знову з тобою | З підпискою повертається AI-наставник — і весь твій прогрес оживає. |
| ru | Помощник снова с тобой | С подпиской возвращается AI-наставник — и весь твой прогресс оживает. |
| en | Your mentor is one tap away | A subscription brings your AI mentor back — and your progress comes alive. |
| pl | Twój mentor o krok od ciebie | Subskrypcja przywraca mentora AI — a twój postęp znów żyje. |

### C4. Довгостроковий вінбек (день 30+, раз на місяць)

| Мова | Title | Body |
|---|---|---|
| uk | Памʼятаєш свою серію {streak}? | Вона досі збережена. Повернись — і почни звідти, де зупинився. |
| ru | Помнишь свою серию {streak}? | Она до сих пор сохранена. Вернись — и начни оттуда, где остановился. |
| en | Remember your {streak}-day streak? | It’s still saved. Come back and pick up where you stopped. |
| pl | Pamiętasz swoją serię {streak}? | Wciąż jest zapisana. Wróć i zacznij tam, gdzie skończyłeś. |

*Без плейсхолдерів:* uk «Твоя історія на тебе чекає» · ru «Твоя история тебя ждёт» · en «Your history is waiting» · pl «Twoja historia czeka».

---

## Email-версії (fallback, коли push вимкнено)

Той самий зміст, довший формат: коротка тема + 2–4 речення + **одна** CTA-кнопка +
рядок про відписку. Плейсхолдери ті самі (`{name}`, `{level}`, `{streak}`), усі
опційні. Позначення `{, name}` / `{ name}` = кома-й-імʼя, якщо імʼя є, інакше нічого
(«Привіт, Павло!» → «Привіт!»). Локалізувати через ту саму систему, що й решта
листів (`send-reminders` для A, `send-winback` для B/C).

### Email A — тріал активний (нагадування про практику)

> **Тема:** Час для практики в Resonance
> Привіт{, name}!
> Ти сьогодні ще не відкривав Resonance. Кілька хвилин практики — дихання, холод
> чи коротке утримання — і день зараховано, а твоя серія лишається цілою.
> [ **Відкрити Resonance** ]
> Якщо не хочеш таких нагадувань — вимкни їх у налаштуваннях.

> **Тема:** Время для практики в Resonance
> Привет{, name}!
> Ты сегодня ещё не открывал Resonance. Пара минут практики — дыхание, холод или
> короткое удержание — и день засчитан, а твоя серия остаётся целой.
> [ **Открыть Resonance** ]
> Если не хочешь таких напоминаний — отключи их в настройках.

> **Subject:** Time for your Resonance practice
> Hi{ name}!
> You haven’t opened Resonance today. A few minutes of practice — breathing, cold
> or a short hold — and the day counts, keeping your streak alive.
> [ **Open Resonance** ]
> Don’t want these reminders? Turn them off in settings.

> **Temat:** Czas na praktykę w Resonance
> Cześć{, name}!
> Nie otwierałeś dziś Resonance. Kilka minut praktyki — oddech, zimno lub krótkie
> utrzymanie — i dzień się liczy, a twoja seria pozostaje nienaruszona.
> [ **Otwórz Resonance** ]
> Nie chcesz takich przypomnień? Wyłącz je w ustawieniach.

### Email B — тріал завершується (мʼяке попередження)

> **Тема:** Твій повний доступ у Resonance завершується
> Привіт{, name}!
> Твої 14 днів повного доступу добігають кінця. Усе, що ти вже зібрав — рівень
> {level}, серія {streak} днів, увесь календар практик — **лишиться з тобою**.
> Щоб і далі записувати нові практики, тримати серію й користуватись AI-наставником,
> обери підписку — це один крок, і ти продовжуєш без паузи.
> [ **Обрати підписку** ]
> Якщо не хочеш таких листів — вимкни нагадування в налаштуваннях.

> **Тема:** Твой полный доступ в Resonance заканчивается
> Привет{, name}!
> Твои 14 дней полного доступа подходят к концу. Всё, что ты уже собрал — уровень
> {level}, серия {streak} дней, весь календарь практик — **останется с тобой**.
> Чтобы и дальше записывать новые практики, держать серию и пользоваться
> AI-наставником, оформи подписку — это один шаг, и ты продолжаешь без паузы.
> [ **Оформить подписку** ]
> Если не хочешь таких писем — отключи напоминания в настройках.

> **Subject:** Your Resonance full access is ending
> Hi{ name}!
> Your 14 days of full access are almost up. Everything you’ve built — level
> {level}, a {streak}-day streak, your whole practice calendar — **stays yours**.
> To keep logging new practices, holding your streak and using the AI mentor,
> pick a plan — it’s one step, and you continue without a pause.
> [ **Choose a plan** ]
> Don’t want these emails? Turn off reminders in settings.

> **Temat:** Twój pełny dostęp w Resonance dobiega końca
> Cześć{, name}!
> Twoje 14 dni pełnego dostępu dobiega końca. Wszystko, co już zebrałeś — poziom
> {level}, seria {streak} dni, cały kalendarz praktyk — **zostaje z tobą**.
> Aby dalej zapisywać nowe praktyki, trzymać serię i korzystać z mentora AI,
> wybierz plan — to jeden krok, i kontynuujesz bez przerwy.
> [ **Wybierz plan** ]
> Nie chcesz takich e-maili? Wyłącz przypomnienia w ustawieniach.

### Email C — тріал вичерпано (розблокуй прогрес)

> **Тема:** Твій прогрес у Resonance на паузі
> Привіт{, name}!
> Твої 14 днів повного доступу завершилися. Але все, що ти зібрав за цей час —
> рівень {level}, серія {streak} днів, увесь календар практик — **лишається з тобою**
> і нікуди не зникає.
> Щоб знову записувати нові практики, тримати серію й повернути AI-наставника —
> обери підписку. Це один крок, і ти продовжуєш рівно з того місця, де зупинився.
> [ **Розблокувати прогрес** ]
> Якщо не хочеш таких листів — вимкни нагадування в налаштуваннях.

> **Тема:** Твой прогресс в Resonance на паузе
> Привет{, name}!
> Твои 14 дней полного доступа завершились. Но всё, что ты собрал за это время —
> уровень {level}, серия {streak} дней, весь календарь практик — **остаётся с тобой**
> и никуда не исчезает.
> Чтобы снова записывать новые практики, держать серию и вернуть AI-наставника —
> оформи подписку. Это один шаг, и ты продолжаешь ровно с того места, где остановился.
> [ **Разблокировать прогресс** ]
> Если не хочешь таких писем — отключи напоминания в настройках.

> **Subject:** Your Resonance progress is on pause
> Hi{ name}!
> Your 14 days of full access are over. But everything you built in that time —
> level {level}, a {streak}-day streak, your whole practice calendar — **stays yours**
> and doesn’t disappear.
> To log new practices again, hold your streak and bring your AI mentor back —
> pick a plan. It’s one step, and you continue right where you stopped.
> [ **Unlock progress** ]
> Don’t want these emails? Turn off reminders in settings.

> **Temat:** Twój postęp w Resonance jest wstrzymany
> Cześć{, name}!
> Twoje 14 dni pełnego dostępu dobiegło końca. Ale wszystko, co zebrałeś w tym
> czasie — poziom {level}, seria {streak} dni, cały kalendarz praktyk — **zostaje
> z tobą** i nigdzie nie znika.
> Aby znów zapisywać nowe praktyki, trzymać serię i przywrócić mentora AI —
> wybierz plan. To jeden krok, i kontynuujesz dokładnie tam, gdzie skończyłeś.
> [ **Odblokuj postęp** ]
> Nie chcesz takich e-maili? Wyłącz przypomnienia w ustawieniach.

> Email не має жорсткого ліміту символів (на відміну від push): плейсхолдери тут
> можуть розгортатись вільно. Якщо `{level}`/`{streak}` відсутні — прибрати відповідну
> частину речення (речення має читатись і без них).

---

## Технічні нотатки для реалізації (Крок 3, разом з APNs)

- Стан доступу визначається з `profiles` (дата реєстрації + статус підписки).
  Ще немає поля стану підписки — додати при впровадженні IAP (окрема задача).
- Частота стану C має бути **обмежена** (не спамити): зберігати `last_winback_at`,
  мінімальний інтервал за таблицею вище.
- Поважати вимкнені нагадування (`settings`/`reminders`) і легку відписку в email.
- Плейсхолдери підставляються на боці функції; завжди мати запасний варіант без них.
- Локалізацію нових рядків завести через `__rsT({uk,ru,en,pl})` (клієнтські банери)
  та через словники розсилки (серверні листи), узгоджено з чинними `send-*`.

**Статус:** чернетка на затвердження Павлом. Після «ок» — це вхід у копірайт-частину
Кроку 3; коду прямо зараз не потребує.
