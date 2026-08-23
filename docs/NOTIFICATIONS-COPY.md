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

> **Перевірка лімітів (2026-08-23):** усі push-рядки (A1–C4, 4 мови = 36 title +
> 36 body) звірено з підстановкою плейсхолдерів `{streak}`/`{days}`/`{level}`=12
> (двозначне — найгірший випадок). **Жоден title не перевищує 40, жоден body — 110.**
> Найдовший body — B2 ru (80). Запас достатній.

---

## Стан A — Тріал активний (дні 0–13): звичайні нагадування

У перші 14 днів користувач — фактично «повний»: сповіщення йдуть як платному
(нагадування про практики, серія під загрозою). Це вже частково реалізовано;
нижче — узгоджені формулювання для APNs-версії.

### A1. Нагадування про практику (день без активності)

| Мова | Title | Body |
|---|---|---|
| uk | Час практики | Сьогодні ще без практики. Кілька хвилин — і день зараховано. |
| ru | Время практики | Сегодня ещё не было практики. Пара минут — и день засчитан. |
| en | Time to practice | You haven’t practiced today yet. A few minutes and the day counts. |
| pl | Czas na praktykę | Dziś jeszcze bez ćwiczeń. Kilka minut i dzień się liczy. |

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

### B1. За 3 дні (T-3)

| Мова | Title | Body |
|---|---|---|
| uk | Повний доступ ще {days} дні | Твій рівень {level} і серія {streak} з тобою. Ще {days} дні все відкрито. |
| ru | Полный доступ ещё {days} дня | Твой уровень {level} и серия {streak} с тобой. Ещё {days} дня всё открыто. |
| en | {days} days of full access left | Your level {level} and streak {streak} are yours. {days} days still fully open. |
| pl | Pełny dostęp jeszcze {days} dni | Twój poziom {level} i seria {streak} są z tobą. Jeszcze {days} dni wszystko otwarte. |

*Без плейсхолдерів:* uk «Повний доступ ще кілька днів» · ru «Полный доступ ещё несколько дней» · en «A few days of full access left» · pl «Jeszcze kilka dni pełnego dostępu».

> **Хардкод «3 дні» прибрано** (2026-08-23): тіло тепер використовує `{days}`,
> узгоджений з title. Точна граматика uk/ru при `{days}`=1/2/5 виправляється не
> тут, а через `pluralize()` — див. «Технічні нотатки для реалізації».

### B2. За 1 день (T-1)

| Мова | Title | Body |
|---|---|---|
| uk | Завтра завершується тріал | Усе накопичене лишиться з тобою. Щоб рухатись далі — обери підписку. |
| ru | Завтра заканчивается триал | Всё накопленное останется с тобой. Чтобы двигаться дальше — оформи подписку. |
| en | Your trial ends tomorrow | Everything you’ve built stays yours. To keep going, pick a plan. |
| pl | Jutro kończy się okres próbny | Cały dotychczasowy dorobek zostaje z tobą. Aby iść dalej — wybierz plan. |

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

*Без плейсхолдерів:* uk «Твій прогрес на паузі / Усе накопичене на місці. Розблокуй, щоб продовжити.»

### C2. Нагадування-повернення (день 3–7)

| Мова | Title | Body |
|---|---|---|
| uk | Персонаж чекає на тебе | Твоя історія нікуди не зникла. Один крок — і продовжуєш з того ж місця. |
| ru | Персонаж ждёт тебя | Твоя история никуда не делась. Один шаг — и продолжаешь с того же места. |
| en | Your character is waiting | Your history is right where you left it. One step and you’re back. |
| pl | Twoja postać czeka | Twoja historia czeka dokładnie tam, gdzie ją zostawiono. Jeden krok i wracasz. |

### C3. AI-помічник як гачок (день 7–14)

| Мова | Title | Body |
|---|---|---|
| uk | Наставник знову з тобою | З підпискою повертається AI-наставник — і весь твій прогрес оживає. |
| ru | Наставник снова с тобой | С подпиской возвращается AI-наставник — и весь твой прогресс оживает. |
| en | Your mentor is one tap away | A subscription brings your AI mentor back — and your progress comes alive. |
| pl | Twój mentor o krok od ciebie | Subskrypcja przywraca mentora AI — a twój postęp znów żyje. |

### C4. Довгостроковий вінбек (день 30+, раз на місяць)

| Мова | Title | Body |
|---|---|---|
| uk | Памʼятаєш свою серію {streak}? | Вона досі збережена. Повернись і продовжуй з того самого місця. |
| ru | Помнишь свою серию {streak}? | Она до сих пор сохранена. Вернись и продолжи с того же места. |
| en | Remember your {streak}-day streak? | It’s still saved. Come back and pick up where you stopped. |
| pl | Pamiętasz swoją serię {streak}? | Wciąż jest zapisana. Wróć i kontynuuj od tego samego miejsca. |

*Без плейсхолдерів:* uk «Твоя історія на тебе чекає» · ru «Твоя история тебя ждёт» · en «Your history is waiting» · pl «Twoja historia czeka».

---

## Email-версії (fallback, коли push вимкнено)

Той самий зміст, довший формат. Одна CTA-кнопка. Плейсхолдери ті самі
(`{name}`/`{level}`/`{streak}`); `{, name}` = кома-й-імʼя, якщо імʼя є, інакше
нічого. **Потрібні лише для стану C** (win-back) — стани A/B на цьому етапі
йдуть лише через push. Локалізувати через ту саму систему, що й решта листів
(`send-winback`).

### Стан C — uk

> **Тема:** Твій прогрес у Resonance на паузі
>
> Привіт{, name}!
>
> Твої 14 днів повного доступу завершилися. Але все накопичене за цей час —
> рівень {level}, серія {streak} днів, увесь календар практик — **лишається з тобою**
> і нікуди не зникає.
>
> Щоб знову записувати нові практики, тримати серію й повернути AI-наставника —
> обери підписку. Це один крок, і ти продовжуєш рівно з того самого місця.
>
> [ **Розблокувати прогрес** ]
>
> Якщо не хочеш таких листів — вимкни нагадування в налаштуваннях.

### Стан C — ru

> **Тема:** Твой прогресс в Resonance на паузе
>
> Привет{, name}!
>
> Твои 14 дней полного доступа завершились. Но всё накопленное за это время —
> уровень {level}, серия {streak} дней, весь календарь практик — **остаётся с тобой**
> и никуда не исчезает.
>
> Чтобы снова записывать новые практики, держать серию и вернуть AI-наставника —
> оформи подписку. Это один шаг, и ты продолжаешь ровно с того же места.
>
> [ **Разблокировать прогресс** ]
>
> Если не хочешь таких писем — отключи напоминания в настройках.

### Стан C — en

> **Subject:** Your Resonance progress is on pause
>
> Hi{ name}!
>
> Your 14 days of full access are over. But everything you built in that time —
> level {level}, a {streak}-day streak, your whole practice calendar — **stays yours**
> and doesn’t disappear.
>
> To log new practices again, hold your streak and bring your AI mentor back —
> pick a plan. It’s one step, and you continue right where you stopped.
>
> [ **Unlock progress** ]
>
> Don’t want these emails? Turn off reminders in settings.

### Стан C — pl

> **Temat:** Twój postęp w Resonance jest wstrzymany
>
> Cześć{, name}!
>
> Twoje 14 dni pełnego dostępu dobiegło końca. Ale wszystko zgromadzone w tym
> czasie — poziom {level}, seria {streak} dni, cały kalendarz praktyk — **zostaje
> z tobą** i nigdzie nie znika.
>
> Aby znów zapisywać nowe praktyki, trzymać serię i przywrócić mentora AI —
> wybierz plan. To jeden krok, i kontynuujesz dokładnie od tego samego miejsca.
>
> [ **Odblokuj postęp** ]
>
> Nie chcesz takich e-maili? Wyłącz przypomnienia w ustawieniach.

---

## Технічні нотатки для реалізації (Крок 3, разом з APNs)

- Стан доступу визначається з `profiles` (дата реєстрації + статус підписки).
  Ще немає поля стану підписки — додати при впровадженні IAP (окрема задача).
- Частота стану C має бути **обмежена** (не спамити): зберігати `last_winback_at`,
  мінімальний інтервал за таблицею вище.
- Поважати вимкнені нагадування (`settings`/`reminders`) і легку відписку в email.
- Плейсхолдери підставляються на боці функції; завжди мати запасний варіант без них.
- {days} і {streak} у uk/ru вимагають відмінювання (1 день / 2 дні / 5 днів;
  1 день / 2 дня / 5 дней). Реалізувати як функцію pluralize(n, [форма_1,
  форма_2_4, форма_5_20]) за правилом: якщо n%10==1 і n%100!=11 → форма_1;
  якщо n%10 in [2,3,4] і n%100 not in [12,13,14] → форма_2_4; інакше →
  форма_5_20. Не хардкодити текст під конкретне число.
- Локалізацію нових рядків завести через `__rsT({uk,ru,en,pl})` (клієнтські банери)
  та через словники розсилки (серверні листи), узгоджено з чинними `send-*`.

**Статус:** чернетка на затвердження Павлом. Після «ок» — це вхід у копірайт-частину
Кроку 3; коду прямо зараз не потребує.
